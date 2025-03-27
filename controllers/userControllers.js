const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Car = require('../models/Car');
const Mechanic = require('../models/Mechanic');
const Appointment = require('../models/Appointment');

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
            { expiresIn: "5h" }  
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
            user: {
                _id: user._id,
                firstname: user.firstname,
                lastname: user.lastname,
                contact: user.contact,
                email: user.email,
            },
            car: { 
                _id: car._id,
                brand: car.brand,
                owner: car.owner,
                model: car.model,
                year: car.year,
                vin: car.vin
            },
            mechanic: { 
                _id: mechanic._id,
                firstname: mechanic.firstname,
                lastname: mechanic.lastname,
                contact: mechanic.contact
            },
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

exports.getInvoiceHistory = async (req, res) => {
    try {
        const invoices = await Invoice.find({ user_id: req.user.id });
        res.json(invoices);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};