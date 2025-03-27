const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Mechanic = require('../models/Mechanic');
const Appointment = require('../models/Appointment');
const Repair = require('../models/Repair');
const Invoice = require('../models/Invoice');

exports.register = async (req, res) => {
    try {
        const { firstname, lastname, email, password, contact, speciality, unavailableSlots } = req.body;

        let mechanic = await Mechanic.findOne({ email });
        if (mechanic) return res.status(400).json({ msg: "Mechanic already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        mechanic = new Mechanic({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            contact,
            speciality,
            unavailableSlots
        });
        await mechanic.save();

        res.status(201).json({ msg: "Mechanic registered successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { contact, password } = req.body;

        let mechanic = await Mechanic.findOne({ contact });
        if (!mechanic) return res.status(400).json({ msg: "Mechanic not found" });

        const isMatch = await bcrypt.compare(password, mechanic.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        const token = jwt.sign(
            { 
                id: mechanic._id, 
                role: 5
            },
            process.env.JWT_SECRET,
            { expiresIn: "5h" }
        );
        res.json({
            token,
            mechanic: {
                firstname: mechanic.firstname, 
                lastname: mechanic.lastname, 
                email: mechanic.email, 
                contact: mechanic.contact, 
                speciality: mechanic.speciality
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getInfo = async (req, res) => {
    try {
        console.log('test')
        console.log(req.mechanic)
        const mechanic = await Mechanic.findById(req.mechanic.id).select('-password');
        if (!mechanic) return res.status(404).json({ msg: "Mechanic not found" });
        res.json(mechanic);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.manageAppointment = async (req, res) => {
    try {
        const { appointmentId, action, newDate } = req.body;
        const appointment = await Appointment.findById(appointmentId);

        if (!appointment) return res.status(404).json({ msg: "Appointment not found" });

        if (action === "accept") {
            appointment.status.mechanic = true;
        } else if (action === "reject") {
            appointment.status.mechanic = false;
        } else if (action === "changeDate" && newDate) {
            appointment.date = newDate;
        }

        await appointment.save();
        res.json({ msg: "Appointment updated successfully", appointment });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.addRepairDetails = async (req, res) => {
    try {
        const { car_id, mechanic_id, reparation } = req.body;

        const repair = new Repair({
            car_id: car_id,
            mechanic_id: mechanic_id,
            reparation
        });
        await repair.save();

        res.status(201).json({ msg: "Repair details added successfully", repair });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createInvoice = async (req, res) => {
    try {
        const { repairId, date, car_id, mechanicInCharge, details } = req.body;

        const invoice = new Invoice({
            repair_id: repairId,
            date,
            car_id: car_id,
            mechanic_in_charge: mechanicInCharge,
            details
        });
        await invoice.save();

        res.status(201).json({ msg: "Invoice created successfully", invoice });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getMechanics = async (req, res) => {
    try {
        const mechanics = await Mechanic.find();
        res.json(mechanics);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getWaitingAppointments = async (req, res) => {
    try {
        const currentDate = new Date();
        const appointments = await Appointment.find({
            'mechanic._id': req.user.id,
            'status.mechanic': false,
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

        appointment.status.mechanic = true;
        await appointment.save();
        res.json({ msg: "Appointment validated successfully", appointment });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


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
};

exports.updateAppointmentStartTime = async (req, res) => {
    try {
        const { appointmentId, newStartTime } = req.body;
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            return res.status(404).json({ msg: "Appointment not found" });
        }

        // Parse the date in local timezone (don't convert to UTC)
        const startTime = new Date(newStartTime);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Add 1 hour

        // Store dates as ISO strings but keep local time
        appointment.start_time = startTime.toISOString();
        appointment.end_time = endTime.toISOString();
        appointment.status.user = false;
        appointment.status.mechanic = true;

        const updatedAppointment = await appointment.save();
        
        res.json({ 
            msg: "Appointment updated successfully", 
            appointment: updatedAppointment 
        });
    } catch (err) {
        console.error("Error updating appointment:", err);
        res.status(500).json({ error: err.message });
    }
};