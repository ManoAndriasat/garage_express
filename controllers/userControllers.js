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
        
        const mechanicExists = await Mechanic.findOne({ _id: mechanic._id });
        if (!mechanicExists) {
            console.log(`Mechanic not found with ID: ${mechanic._id}`);
            return res.status(404).json({ msg: "Mechanic not found" });
        }
        

        const unavailableDay = mechanicExists.unavailableSlots.find(
            slot => slot.date === date
        );
        
        if (unavailableDay) {
            const isSlotUnavailable = unavailableDay.timeSlots.some(slot => 
                (start_time >= slot.start && start_time < slot.end) ||
                (end_time > slot.start && end_time <= slot.end) ||
                (start_time <= slot.start && end_time >= slot.end)
            );
            
            if (isSlotUnavailable) {
                return res.status(400).json({ msg: "This time slot is not available for this mechanic" });
            }
        }
        
        const existingAppointments = await Appointment.find({
            user_id: req.user.id,
            date: date,
            $or: [
                {
                    start_time: { $lt: end_time },
                    end_time: { $gt: start_time }
                }
            ]
        });
        
        if (existingAppointments.length > 0) {
            return res.status(400).json({ msg: "User already has an appointment at this time" });
        }
        
        const appointment = new Appointment({
            user: user,
            car: car,
            mechanic:mechanic,
            date: new Date(),
            start_time: start_time,
            end_time: end_time,
            localisation: localisation,
            problem: problem,
            status: { mechanic: false, user: true }
        });
        
        await appointment.save();
        
        res.status(201).json({ 
            msg: "Appointment requested successfully", 
            appointment 
        });
        
    } catch (err) {
        console.error("Error while requesting an appointment:", err);
        res.status(500).json({ error: err.message });
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
        
        const doc = new PDFDocument({ size: 'A4', margin: 40 }); // Reduced margin
        const filename = `invoice_${invoice._id}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        doc.pipe(res);
        
        // Colors
        const primaryColor = '#3498db';
        const secondaryColor = '#2980b9';
        const darkColor = '#2c3e50';
        const lightColor = '#ecf0f1';
        
        // Compact header
        doc.rect(0, 0, doc.page.width, 60) // Smaller header
           .fill(primaryColor);
        
        doc.fontSize(24) // Slightly smaller font
           .fillColor('#fff')
           .text('INVOICE', { 
               align: 'center',
               width: doc.page.width - 100,
               height: 60,
               lineGap: 0
           });
        
        // Invoice info right next to header
        doc.fontSize(10)
           .fillColor(darkColor)
           .text(`Invoice #: ${invoice._id}`, 400, 70, { align: 'right' });
        doc.text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 400, 85, { align: 'right' });
        
        // Company info - compact
        doc.fontSize(10)
           .text('Mano GARAGE', 50, 70);
        doc.text('Phone: +261 34 33 733 51', 50, 85);
        doc.text('Email: ma.andriasat@gmail.com', 50, 100);
        
        // Customer and car info side by side with less padding
        const infoBoxY = 120;
        
        // Customer info - compact
        doc.rect(50, infoBoxY, 250, 60) // Smaller box
           .fill(lightColor);
        doc.fontSize(10)
           .fillColor(darkColor)
           .text('BILL TO:', 60, infoBoxY + 10);
        doc.fontSize(9)
           .text(`${invoice.owner.firstname} ${invoice.owner.lastname}`, 60, infoBoxY + 25);
        doc.text(`Contact: ${invoice.owner.contact}`, 60, infoBoxY + 40);
        
        // Car info - compact
        doc.rect(350, infoBoxY, 200, 60) // Smaller box
           .fill(lightColor);
        doc.fontSize(10)
           .text('VEHICLE DETAILS:', 360, infoBoxY + 10);
        doc.fontSize(9)
           .text(`${invoice.car.brand} ${invoice.car.model}`, 360, infoBoxY + 25);
        
        // Reparations table - tighter
        const tableStartY = infoBoxY + 70;
        doc.fontSize(12)
           .fillColor(secondaryColor)
           .text('REPARATION DETAILS', 50, tableStartY);
        
        // Table header
        doc.fontSize(9)
           .fillColor('#fff')
           .rect(50, tableStartY + 20, doc.page.width - 100, 15) // Smaller header
           .fill(secondaryColor);
        
        doc.text('No.', 60, tableStartY + 23);
        doc.text('Description', 100, tableStartY + 23);
        doc.text('Price', doc.page.width - 150, tableStartY + 23, { width: 100, align: 'right' });
        
        // Table rows - tighter
        let yPos = tableStartY + 40;
        invoice.reparation.forEach((item, index) => {
            if (index % 2 === 0) {
                doc.rect(50, yPos - 8, doc.page.width - 100, 15) // Smaller rows
                   .fill('#f8f9fa');
            }
            
            doc.fontSize(9)
               .fillColor(darkColor)
               .text(`${index + 1}.`, 60, yPos);
            doc.text(item.type, 100, yPos);
            doc.text(`$${item.price.toFixed(2)}`, doc.page.width - 150, yPos, { width: 100, align: 'right' });
            yPos += 15; // Smaller row height
        });
        
        // Total section - compact
        const totalY = yPos + 10;
        doc.rect(doc.page.width - 250, totalY, 200, 20) // Smaller box
           .fill(lightColor);
        
        doc.fontSize(10)
           .fillColor(darkColor)
           .text('TOTAL:', doc.page.width - 250, totalY + 5, { width: 150, align: 'right' });
        doc.text(`$${invoice.total.toFixed(2)}`, doc.page.width - 100, totalY + 5, { width: 100, align: 'right' });
        
        // Compact footer
        doc.fontSize(8)
           .fillColor('#7f8c8d')
           .text('Thank you for your business!', { align: 'center', y: doc.page.height - 30 });
        
        doc.end();
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};