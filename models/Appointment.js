const mongoose = require("mongoose");
const { getNextId } = require("../utils/counterUtils");

const AppointmentSchema = new mongoose.Schema({
    _id: { type: String },
    user_id: { type: String, required: true },
    car: { 
        _id: { type: String },
        owner: { type: String, required: true },
        brand: { type: String, required: true },
        model: { type: String, required: true },
        year: { type: Number, required: true },
        vin: { type: String, required: true },
    },
    mechanic: {  
        _id: { type: String, required: true },
        firstname: { type: String, required: true },
        lastname: { type: String, required: true },
        contact: { type: String, required: true }
    },
    date: { type: String, required: true },
    start_time: { type: String, required: true },
    end_time: { type: String, required: true },
    localisation: { type: String, required: true },
    problem: [{
        material: { type: String },
        description: { type: String, required: true }
    }],
    status: {
        mechanic: { type: Boolean, default: false },
        user: { type: Boolean, default: true }
    }
}, { _id: false });

AppointmentSchema.pre("save", async function (next) {
    try {
        if (!this._id) {
            const id = await getNextId("appointment_id");
            this._id = "A" + String(id).padStart(3, "0");
        }
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model("Appointment", AppointmentSchema);