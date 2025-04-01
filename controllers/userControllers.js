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
        
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const filename = `invoice_${invoice._id}.pdf`;
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        
        doc.pipe(res);
        
        // Header with logo and title
        doc.image('path/to/your/logo.png', 50, 45, { width: 50 })
           .fillColor('#444444')
           .fontSize(20)
           .text('INVOICE', 200, 50, { align: 'right' })
           .fontSize(10)
           .text(`Invoice #${invoice.invoiceNumber}`, 200, 80, { align: 'right' })
           .moveDown();
        
        // Horizontal line
        doc.strokeColor('#aaaaaa')
           .lineWidth(1)
           .moveTo(50, 120)
           .lineTo(550, 120)
           .stroke();
        
        // Customer information
        doc.fontSize(12)
           .text('BILL TO:', 50, 140)
           .font('Helvetica-Bold')
           .text(`${invoice.owner.firstname} ${invoice.owner.lastname}`, 50, 160)
           .font('Helvetica')
           .text(invoice.owner.contact, 50, 180)
           .text(`Date: ${new Date(invoice.date).toLocaleDateString()}`, 400, 140, { align: 'right' });
        
        // Vehicle information
        doc.moveTo(50, 220)
           .lineTo(550, 220)
           .stroke()
           .font('Helvetica-Bold')
           .text('VEHICLE DETAILS', 50, 230)
           .font('Helvetica')
           .text(`${invoice.car.brand} ${invoice.car.model} (${invoice.car.year})`, 50, 250)
           .text(`VIN: ${invoice.car.vin || 'N/A'}`, 50, 270);
        
        // Reparations table header
        doc.moveTo(50, 310)
           .lineTo(550, 310)
           .stroke()
           .font('Helvetica-Bold')
           .text('#', 50, 320)
           .text('DESCRIPTION', 100, 320)
           .text('PRICE', 450, 320, { width: 100, align: 'right' })
           .moveTo(50, 340)
           .lineTo(550, 340)
           .stroke();
        
        // Reparations items
        let y = 350;
        invoice.reparation.forEach((item, index) => {
            doc.font('Helvetica')
               .text(`${index + 1}`, 50, y)
               .text(item.type, 100, y)
               .text(`$${item.price.toFixed(2)}`, 450, y, { width: 100, align: 'right' });
            
            // Add description if exists
            if (item.description) {
                doc.font('Helvetica', 8)
                   .fillColor('#666666')
                   .text(item.description, 100, y + 15, { width: 350 })
                   .fillColor('#444444');
                y += 20;
            }
            
            y += 30;
        });
        
        // Total section
        doc.moveTo(50, y)
           .lineTo(550, y)
           .stroke()
           .font('Helvetica-Bold')
           .text('SUBTOTAL', 350, y + 20)
           .text(`$${invoice.subtotal.toFixed(2)}`, 450, y + 20, { width: 100, align: 'right' })
           .text('TAX', 350, y + 40)
           .text(`$${(invoice.total - invoice.subtotal).toFixed(2)}`, 450, y + 40, { width: 100, align: 'right' })
           .moveTo(350, y + 60)
           .lineTo(550, y + 60)
           .stroke()
           .fontSize(14)
           .text('TOTAL', 350, y + 70)
           .text(`$${invoice.total.toFixed(2)}`, 450, y + 70, { width: 100, align: 'right' });
        
        // Footer
        doc.fontSize(8)
           .text('Thank you for your business!', 50, 750, { align: 'center' })
           .text('If you have any questions about this invoice, please contact us', 50, 770, { align: 'center' });
        
        doc.end();
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};