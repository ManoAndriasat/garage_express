const mongoose = require('mongoose');

const MechanicSchema = new mongoose.Schema({
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    contact: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    speciality: { type: Array, default: [] }
});

module.exports = mongoose.model('Mechanic', MechanicSchema);