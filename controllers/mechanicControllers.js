const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Mechanic = require('../models/Mechanic');
const Appointment = require('../models/Appointment');
const Repair = require('../models/Repair');

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
            { expiresIn: "20h" }
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


exports.getAppointments = async (req, res) => {
    try {
        const currentDate = new Date();
        const appointments = await Appointment.find({
            'mechanic._id': req.user.id,
            'status.mechanic': true,
            'status.user': true,
            'end_time': { $gt: currentDate.toISOString() }
        });

        res.json(appointments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getHistoryAppointments = async (req, res) => {
    try {
        const currentDate = new Date();
        const appointments = await Appointment.find({
            'mechanic._id': req.user.id,
            'status.mechanic': true,
            'status.user': true,
            'start_time': { $lt: currentDate.toISOString() }
        })
        .sort({ start_time: -1 })
        .limit(10);

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

        const startTime = new Date(newStartTime);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // Add 1 hour

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

exports.createRepair = async (req, res) => {
    try {
        const existingRepair = await Repair.findOne({ appointment_id: req.body.appointment_id });
        if (existingRepair) {
            return res.status(400).json({ 
                error: "Repair already exists for this appointment",
                code: "DUPLICATE_APPOINTMENT" 
            });
        }

        const repairData = {
            ...req.body,
            isfinished: {
                mechanic: false,
                user: false
            }
        };

        const repair = await Repair.create(repairData);
        res.status(201).json(repair);
    } catch (error) {
        if (error.code === 11000) { 
            res.status(400).json({ 
                error: "Appointment ID must be unique",
                code: "DUPLICATE_KEY" 
            });
        } else {
            res.status(500).json({ 
                error: error.message,
                code: "SERVER_ERROR" 
            });
        }
    }
};

exports.getOngoingRepairs = async (req, res) => {
    try {
        const repairs = await Repair.find({
            'mechanic._id': req.user.id,
            $and: [
                { 'isfinished.user': false }
            ]
        });
        
        res.json(repairs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.addReparation = async (req, res) => {
    try {
        const { repair_id, type, description, start, end, material, price } = req.body;
        if (!repair_id || !type || !start || !end) return res.status(400).json({ success: false, message: "Missing required fields" });

        const startDate = new Date(start), endDate = new Date(end), now = new Date();
        if (startDate >= endDate) return res.status(400).json({ success: false, message: "End date must be after start date" });
        if (startDate < now) return res.status(400).json({ success: false, message: "Start date cannot be in the past" });

        if (type === 'Replacement' && !material) return res.status(400).json({ success: false, message: "Material required for Replacement" });
        if (type === 'Replacement' && price <= 100) return res.status(400).json({ success: false, message: "Price must be >100 for Replacement" });
        if (price <= 0) return res.status(400).json({ success: false, message: "Price must be positive" });

        const updatedRepair = await Repair.findByIdAndUpdate(
            repair_id,
            { $push: { 
                reparation: { 
                    type, material: material || undefined, description, price,
                    status: { mechanic: true, user: false },
                    start: startDate.toISOString(), end: endDate.toISOString()
                } 
            }},
            { new: true }
        );

        if (!updatedRepair) return res.status(404).json({ success: false, message: "Repair not found" });
        res.json({ success: true, data: updatedRepair });

    } catch (error) {
        console.error("Error adding reparation:", error);
        res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

exports.updateReparation = async (req, res) => {
    try {
        const { repair_id, reparation_index, updates } = req.body;

        if (!repair_id || reparation_index === undefined || !updates) {
            return res.status(400).json({
                success: false,
                message: "repair_id, reparation_index and updates are required"
            });
        }

        // Create the update object dynamically
        const updateObj = { $set: {} };
        for (const [key, value] of Object.entries(updates)) {
            updateObj.$set[`reparation.${reparation_index}.${key}`] = value;
        }

        // Always update the status when making changes
        updateObj.$set[`reparation.${reparation_index}.status.mechanic`] = true;
        updateObj.$set[`reparation.${reparation_index}.status.user`] = false;

        const updatedRepair = await Repair.findOneAndUpdate(
            {
                '_id': repair_id,
                'mechanic._id': req.user.id
            },
            updateObj,
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
        console.error("Error updating reparation:", error);
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

        const updatedRepair = await Repair.findOneAndUpdate(
            { _id },
            { $set: { 'isfinished.mechanic': true } },
            { new: true }
        );

        if (!updatedRepair) {
            return res.status(404).json({ error: 'Repair not found' });
        }

        res.json(updatedRepair);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};