const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Mechanic = require('../models/Mechanic');

const router = express.Router();


router.post('/register', async (req, res) => {
    try {
        const { firstname, lastname, email, password, contact, speciality } = req.body;

        let mechanic = await Mechanic.findOne({ email });
        if (mechanic) return res.status(400).json({ msg: "Mechanic already exists" });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        mechanic = new Mechanic({
            firstname,
            lastname,
            contact,
            email,
            password: hashedPassword,
            speciality
        });
        await mechanic.save();

        res.status(201).json({ msg: "Mechanic registered successfully" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { contact, password } = req.body;
        console.log( "contact: ", contact, "password: ", password );

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
            user: {
                firstname: mechanic.firstname, 
                lastname: mechanic.lastname, 
                email: mechanic.email, 
                contact: mechanic.contact, 
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
