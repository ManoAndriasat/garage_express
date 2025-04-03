const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Manager = require('../models/Manager');
const Mechanic = require('../models/Mechanic');
const Appointment = require('../models/Appointment');
const Repair = require('../models/Repair');
const Invoice = require('../models/Invoice');
const moment = require('moment');

exports.register = async (req, res) => {
    try {
        const { firstname, lastname, email, password, contact } = req.body;

        let manager = await Manager.findOne({ email });
        if (manager) return res.status(400).json({ msg: "Manager already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        manager = new Manager({
            firstname,
            lastname,
            email,
            password: hashedPassword,
            contact
        });
        await manager.save();

        res.status(201).json({ msg: "Manager registered successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { contact, password } = req.body;

        let manager = await Manager.findOne({ contact });
        if (!manager) return res.status(400).json({ msg: "Manager not found" });

        const isMatch = await bcrypt.compare(password, manager.password);
        if (!isMatch) return res.status(400).json({ msg: "Invalid credentials" });

        const token = jwt.sign(
            { 
                id: manager._id, 
                role: 10
            },
            process.env.JWT_SECRET,
            { expiresIn: "5h" }
        );
        res.json({
            token,
            manager: {
                firstname: manager.firstname, 
                lastname: manager.lastname, 
                email: manager.email, 
                contact: manager.contact
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.mechanicRegister = async (req, res) => {
    try {
        const { firstname, lastname, email, password, contact, speciality, minHour, maxHour } = req.body;

        let mechanic = await Mechanic.findOne({ contact });
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
            minHour,
            maxHour
        });
        await mechanic.save();

        res.status(201).json({ msg: "Mechanic registered successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.mechanicUpdate = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedMechanic = await Mechanic.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedMechanic) {
            return res.status(404).json({ msg: "Mechanic not found" });
        }

        res.json({
            msg: "Mechanic updated successfully",
            mechanic: {
                _id: updatedMechanic._id,
                firstname: updatedMechanic.firstname,
                lastname: updatedMechanic.lastname,
                email: updatedMechanic.email,
                contact: updatedMechanic.contact,
                speciality: updatedMechanic.speciality,
                minHour: updatedMechanic.minHour,
                maxHour: updatedMechanic.maxHour
            }
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.mechanicDelete = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedMechanic = await Mechanic.findByIdAndDelete(id);

        if (!deletedMechanic) {
            return res.status(404).json({ msg: "Mechanic not found" });
        }

        res.json({ msg: "Mechanic deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getDashboardOverview = async (req, res) => {
    try {
        const [appointments, repairs, invoices] = await Promise.all([
            Appointment.find().lean(),
            Repair.find().lean(),
            Invoice.find().lean()
        ]);

        const totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.total, 0);

        res.json({
            totalAppointments: appointments.length,
            totalRevenue,
            pendingAppointments: appointments.filter(a => !a.status.mechanic).length,
            completedRepairs: repairs.filter(r => r.isfinished.mechanic).length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getMechanicRevenue = async (req, res) => {
    try {
        const { mechanicId, year } = req.query;

        if (!mechanicId) {
            return res.status(400).json({ msg: "Mechanic ID is required" });
        }

        const mechanic = await Mechanic.findById(mechanicId);
        if (!mechanic) {
            return res.status(404).json({ msg: "Mechanic not found" });
        }

        const filter = { 'mechanic._id': mechanicId };
        let result;

        if (year) {
            filter.date = { $regex: new RegExp(`^${year}`) };
            const invoices = await Invoice.find(filter);

            const monthlyRevenue = Array(12).fill(0).reduce((acc, _, index) => {
                acc[index + 1] = 0;
                return acc;
            }, {});

            invoices.forEach(invoice => {
                const month = moment(invoice.date).month() + 1;
                monthlyRevenue[month] += invoice.total;
            });

            result = {
                mechanic: `${mechanic.firstname} ${mechanic.lastname}`,
                year,
                monthlyRevenue
            };
        } else {
            const invoices = await Invoice.find(filter);
            
            const yearlyRevenue = invoices.reduce((acc, invoice) => {
                const year = moment(invoice.date).year();
                acc[year] = (acc[year] || 0) + invoice.total;
                return acc;
            }, {});

            result = {
                mechanic: `${mechanic.firstname} ${mechanic.lastname}`,
                yearlyRevenue
            };
        }

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};