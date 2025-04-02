const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Car = require('../models/Car');
const Mechanic = require('../models/Mechanic');
const Appointment = require('../models/Appointment');
const Repair = require('../models/Repair');
const Invoice = require('../models/Invoice');
const PDFDocument = require('pdfkit');
const fs = require('fs');

exports.register = async (req, res) => {
    try {
        const { firstname, lastname, contact, email, password, address } = req.body;

        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: "User already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            firstname,
            lastname,
            contact,
            email,
            password: hashedPassword,
            address
        });
        await user.save();

        res.status(201).json({ msg: "User registered successfully" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { contact, password } = req.body;

        let user = await User.findOne({ contact });
        if (!user) return res.status(400).json({ msg: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        const token = jwt.sign(
            { 
                id: user._id, 
                role: 0  
            },
            process.env.JWT_SECRET,
            { expiresIn: "20h" }  
        );
        res.json({
            token,
            user: {
                firstname: user.firstname, 
                lastname: user.lastname, 
                contact: user.contact, 
                email: user.email 
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getUserInfo = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ msg: "User not found" });
        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addCar = async (req, res) => {
    try {
        const { brand, model, year, type, vin } = req.body;
        const car = new Car({ owner: req.user.id, brand, model, year, type, vin });
        await car.save();
        await User.findByIdAndUpdate(req.user.id, { $push: { cars: car._id } });
        res.status(201).json({ msg: "Car added successfully", car });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAllCars = async (req, res) => {
    try {
        const cars = await Car.find({ owner: req.user.id });

        if (!cars || cars.length === 0) {
            return res.status(404).json({ msg: "No cars found for this user" });
        }

        res.status(200).json(cars);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getMechanicUnavailableSlots = async (req, res) => {
    try {
        const { mechanic_id } = req.params;
        const mechanic = await Mechanic.findById(mechanic_id);

        if (!mechanic) return res.status(404).json({ msg: "Mechanic not found" });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const unavailableSlots = mechanic.unavailableSlots
            .filter(slot => new Date(slot.date) >= today)
            .map(slot => ({
                date: slot.date,
                timeSlots: slot.timeSlots.sort((a, b) => {
                    return a.start.localeCompare(b.start);
                })
            }));

        unavailableSlots.sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json(unavailableSlots);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.requestAppointment = async (req, res) => {
    try {
        const { user, car, mechanic, date, start_time, end_time, localisation, problem } = req.body;
        
        // Validate required fields
        const required = { user, car, mechanic, date, start_time, end_time, localisation };
        for (const [field, value] of Object.entries(required)) {
            if (!value) return res.status(400).json({ msg: `${field.replace('_', ' ')} is required` });
        }
        if (!problem?.length || problem.some(p => !p.description)) {
            return res.status(400).json({ msg: "At least one problem description is required" });
        }

        // Validate times
        const now = new Date();
        const start = new Date(start_time);
        const end = new Date(end_time);
        if (start <= now) return res.status(400).json({ msg: "Appointment time must be in the future" });
        if (end <= start) return res.status(400).json({ msg: "End time must be after start time" });

        // Check mechanic exists
        const mechanicExists = await Mechanic.findOne({ _id: mechanic._id });
        if (!mechanicExists) return res.status(404).json({ msg: "Mechanic not found" });
        
        // Check mechanic availability
        const unavailable = mechanicExists.unavailableSlots.find(s => s.date === date)
            ?.timeSlots.some(s => 
                (start >= new Date(s.start) && start < new Date(s.end)) ||
                (end > new Date(s.start) && end <= new Date(s.end)) ||
                (start <= new Date(s.start) && end >= new Date(s.end))
            );
        if (unavailable) return res.status(400).json({ msg: "Time slot unavailable for this mechanic" });

        // Check for existing appointments
        const existing = await Appointment.findOne({
            $or: [
                { 'user._id': user._id, $or: [{ start_time: { $lt: end_time }, end_time: { $gt: start_time } }] },
                { 'mechanic._id': mechanic._id, $or: [{ start_time: { $lt: end_time }, end_time: { $gt: start_time } }] }
            ]
        });
        if (existing) {
            const msg = existing.user._id.toString() === user._id 
                ? "You already have an appointment at this time" 
                : "Mechanic is already booked at this time";
            return res.status(400).json({ msg });
        }
        
        // Create appointment
        const appointment = await Appointment.create({
            user, car, mechanic, date, start_time, end_time, localisation,
            problem: problem.map(p => ({ material: p.material || '', description: p.description })),
            status: { mechanic: false, user: true }
        });
        
        res.status(201).json({ msg: "Appointment requested successfully", appointment });
        
    } catch (err) {
        console.error("Error requesting appointment:", err);
        res.status(500).json({ msg: "Internal server error", error: err.message });
    }
};

exports.getAppointments = async (req, res) => {
    try {
        const currentDate = new Date();
        const appointments = await Appointment.find({
            'user._id' : req.user.id,
            'end_time': { $gt: currentDate.toISOString() }
        });

        res.json(appointments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.validateAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) return res.status(404).json({ msg: "Appointment not found" });

        appointment.status.user = true;
        await appointment.save();
        res.json({ msg: "Appointment validated successfully", appointment });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteAppointment = async (req, res) => {
    try {
        const { appointmentId } = req.body;
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ msg: "Appointment not found" });
        }
        await Appointment.deleteOne({ _id: appointmentId });
        
        res.json({ msg: "Appointment deleted successfully" });
    } catch (err) {
        console.error("Error deleting appointment:", err);
        res.status(500).json({ error: err.message });
    }
}

exports.getRepairProgress = async (req, res) => {
    try {
        const repairs = await Repair.find({ user_id: req.user.id  });
        res.json(repairs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


exports.getOngoingRepairs = async (req, res) => {
    try {
        const repairs = await Repair.find({
            'owner._id': req.user.id,
            $and: [
                { 'isfinished.user': false }
            ]
        });
        
        res.json(repairs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



exports.acceptReparation = async (req, res) => {
    try {
        const { repair_id, reparation_index } = req.body;
        if (!repair_id || reparation_index === undefined) {
            return res.status(400).json({
                success: false,
                message: "repair_id and reparation_index are required"
            });
        }

        const updatedRepair = await Repair.findOneAndUpdate(
            {
                '_id': repair_id,
                'owner._id': req.user.id,
                [`reparation.${reparation_index}.status.mechanic`]: true
            },
            {
                $set: {
                    [`reparation.${reparation_index}.status.user`]: true
                }
            },
            { new: true }
        );

        if (!updatedRepair) {
            return res.status(404).json({
                success: false,
                message: "Repair not found or not authorized"
            });
        }

        res.json({
            success: true,
            data: updatedRepair
        });

    } catch (error) {
        console.error("Error accepting reparation:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};


exports.updatePriceAsCustomer = async (req, res) => {
    try {
        const { repair_id, reparation_index, new_price } = req.body;

        if (!repair_id || reparation_index === undefined || !new_price) {
            return res.status(400).json({
                success: false,
                message: "repair_id, reparation_index and new_price are required"
            });
        }

        const updatedRepair = await Repair.findOneAndUpdate(
            {
                '_id': repair_id,
                'owner._id': req.user.id
            },
            {
                $set: {
                    [`reparation.${reparation_index}.price`]: new_price,
                    [`reparation.${reparation_index}.status.user`]: true,
                    [`reparation.${reparation_index}.status.mechanic`]: false
                }
            },
            { new: true }
        );

        if (!updatedRepair) {
            return res.status(404).json({
                success: false,
                message: "Repair not found or not authorized"
            });
        }

        res.json({
            success: true,
            data: updatedRepair
        });

    } catch (error) {
        console.error("Error updating price as customer:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

exports.finishRepair = async (req, res) => {
    try {
        const { _id } = req.body;
        const currentDate = new Date().toISOString();

        // 1. Get the repair document
        const repair = await Repair.findOne({ _id });
        if (!repair) {
            return res.status(404).json({ error: 'Repair not found' });
        }

        // 2. Check if invoice already exists for this repair
        const existingInvoice = await Invoice.findOne({ repair_id: _id });
        if (existingInvoice) {
            return res.status(400).json({ error: 'Invoice already exists for this repair' });
        }

        // 3. Filter reparation items where both status.mechanic and status.user are true
        const validReparations = repair.reparation.filter(item => 
            item.status.mechanic === true && item.status.user === true
        );

        if (validReparations.length === 0) {
            return res.status(400).json({ error: 'No approved reparation items found' });
        }

        // 4. Calculate total
        const total = validReparations.reduce((sum, item) => sum + item.price, 0);

        // 5. Create invoice with new schema
        const invoice = new Invoice({
            repair_id: _id,  // Using repair _id as reference
            owner: {
                _id: repair.owner._id,
                firstname: repair.owner.firstname,
                lastname: repair.owner.lastname,
                contact: repair.owner.contact
            },
            car: {
                _id: repair.car._id,
                brand: repair.car.brand,
                model: repair.car.model
            },
            mechanic: {
                _id: repair.mechanic._id,
                firstname: repair.mechanic.firstname,
                lastname: repair.mechanic.lastname,
                contact: repair.mechanic.contact
            },
            reparation: validReparations.map(item => ({
                type: item.type,
                material: item.material,
                price: item.price,
                start: item.start,
                end: item.end
            })),
            total,
            date: currentDate
        });

        // 6. Save invoice and update repair
        await invoice.save();
        const updatedRepair = await Repair.findOneAndUpdate(
            { _id },
            { $set: { 'isfinished.user': true } },
            { new: true }
        );

        res.json({
            repair: updatedRepair,
            invoice
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getClientInvoices = async (req, res) => {
    try {
        const { car_id } = req.body;
        const query = { 
            'owner._id': req.user.id 
        };
        if (car_id) {
            query['car._id'] = car_id;
        }
        
        const invoices = await Invoice.find(query)
            .sort({ date: -1 })
            .exec();
            
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.downloadInvoicePDF = async (req, res) => {
    try {
        const { invoice_id } = req.body;
        
        const invoice = await Invoice.findOne({ 
            _id: invoice_id,
            'owner._id': req.user.id
        });
        
        if (!invoice) {
            return res.status(404).json({ error: 'Invoice not found' });
        }
        
        // Create PDF with smaller margins
        const doc = new PDFDocument({ 
            size: 'A4', 
            margin: 40,
            bufferPages: true  // For page numbering
        });
        
        const filename = `invoice_${invoice._id}.pdf`;
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);
        
        // Design System
        const colors = {
            primary: '#3498db',
            secondary: '#2980b9',
            dark: '#2c3e50',
            light: '#f8f9fa',
            accent: '#e74c3c',
            text: '#333333',
            subtle: '#95a5a6'
        };
        
        const fonts = {
            header: 24,
            subheader: 14,
            body: 10,
            small: 8,
            emphasis: 12
        };
        
        // --- HEADER SECTION ---
        // Blue header background
        doc.rect(0, 0, doc.page.width, 70)
           .fill(colors.primary);
        
        // Invoice title
        doc.fontSize(fonts.header)
           .fillColor('#ffffff')
           .font('Helvetica-Bold')
           .text('INVOICE', { 
               align: 'center',
               width: doc.page.width,
               height: 70,
               lineGap: 5
           });
        
        // Invoice metadata (right-aligned)
        doc.fontSize(fonts.small)
           .fillColor(colors.light)
           .text(`Invoice #: ${invoice._id}`, { 
               align: 'right',
               width: 200,
               x: doc.page.width - 50 - 200,
               y: 75
           });
        
        doc.text(`Date: ${new Date(invoice.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        })}`, { 
            align: 'right',
            width: 200,
            x: doc.page.width - 50 - 200,
            y: 90
        });
        
        // Company info (left-aligned)
        doc.fontSize(fonts.body)
           .fillColor(colors.dark)
           .font('Helvetica-Bold')
           .text('Mano GARAGE', 50, 75);
        
        doc.font('Helvetica')
           .text('Phone: +261 34 33 733 51', 50, 90);
        doc.text('Email: ma.andriasat@gmail.com', 50, 105);
        
        // --- CLIENT & VEHICLE INFO ---
        const infoSectionY = 130;
        
        // Client info box
        doc.rect(50, infoSectionY, 250, 80)
           .fill(colors.light)
           .stroke(colors.primary, 0.5);
        
        doc.fontSize(fonts.body)
           .fillColor(colors.primary)
           .font('Helvetica-Bold')
           .text('BILL TO:', 60, infoSectionY + 15);
        
        doc.font('Helvetica')
           .fillColor(colors.text)
           .text(`${invoice.owner.firstname} ${invoice.owner.lastname}`, 60, infoSectionY + 35);
        doc.text(`Contact: ${invoice.owner.contact}`, 60, infoSectionY + 50);
        
        // Vehicle info box
        doc.rect(350, infoSectionY, 200, 80)
           .fill(colors.light)
           .stroke(colors.primary, 0.5);
        
        doc.fontSize(fonts.body)
           .fillColor(colors.primary)
           .font('Helvetica-Bold')
           .text('VEHICLE DETAILS:', 360, infoSectionY + 15);
        
        doc.font('Helvetica')
           .fillColor(colors.text)
           .text(`${invoice.car.brand} ${invoice.car.model}`, 360, infoSectionY + 35);
        
        if (invoice.car.plate) {
            doc.text(`Plate: ${invoice.car.plate}`, 360, infoSectionY + 50);
        }
        
        // --- REPARATION TABLE ---
        const tableStartY = infoSectionY + 100;
        
        // Table title
        doc.fontSize(fonts.subheader)
           .fillColor(colors.primary)
           .font('Helvetica-Bold')
           .text('REPARATION DETAILS', 50, tableStartY);
        
        // Table header
        doc.rect(50, tableStartY + 25, doc.page.width - 100, 20)
           .fill(colors.secondary)
           .stroke(colors.secondary);
        
        doc.fontSize(fonts.body)
           .fillColor('#ffffff')
           .font('Helvetica-Bold')
           .text('No.', 60, tableStartY + 30);
        doc.text('Description', 100, tableStartY + 30);
        doc.text('Material', 300, tableStartY + 30);
        doc.text('Price (MGA)', doc.page.width - 150, tableStartY + 30, { 
            width: 100, 
            align: 'right' 
        });
        
        // Table rows
        let yPos = tableStartY + 50;
        let subtotal = 0;
        
        invoice.reparation.forEach((item, index) => {
            // Alternate row colors
            const rowColor = index % 2 === 0 ? '#ffffff' : colors.light;
            doc.rect(50, yPos - 10, doc.page.width - 100, 20)
               .fill(rowColor)
               .stroke('#eeeeee');
            
            doc.fontSize(fonts.body)
               .fillColor(colors.text)
               .font('Helvetica')
               .text(`${index + 1}.`, 60, yPos);
            
            doc.text(item.type, 100, yPos);
            doc.text(item.material || '-', 300, yPos);
            
            doc.font('Helvetica-Bold')
               .text(`${parseFloat(item.price).toFixed(2)}`, doc.page.width - 150, yPos, { 
                   width: 100, 
                   align: 'right' 
               });
            
            subtotal += parseFloat(item.price);
            yPos += 20;
        });
        
        // --- TOTAL SECTION ---
        const totalY = yPos + 20;
        const totalBoxWidth = 200;
        const totalBoxX = doc.page.width - totalBoxWidth - 50;
        
        // Total box with border
        doc.rect(totalBoxX, totalY, totalBoxWidth, 60)
           .fill(colors.light)
           .stroke(colors.primary, 0.5);
        
        // Subtotal
        doc.fontSize(fonts.body)
           .fillColor(colors.text)
           .font('Helvetica')
           .text('total:', totalBoxX + 20, totalY + 15, { 
               width: 120, 
               align: 'right' 
           });
        
        doc.text(`${subtotal.toFixed(2)} MGA`, totalBoxX + 135, totalY + 15, { 
            width: 50, 
            align: 'right' 
        });
        

        // Page numbering
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            doc.fontSize(fonts.small)
               .fillColor(colors.subtle)
               .text(`Page ${i + 1} of ${pages.count}`, doc.page.width - 100, doc.page.height - 20);
        }
        
        // Finalize PDF
        doc.end();
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};