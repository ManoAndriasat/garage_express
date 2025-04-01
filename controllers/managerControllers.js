const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Manager = require('../models/Manager');

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

        let manager = await Manager.findOne({ email });
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