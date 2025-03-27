const mongoose = require("mongoose");
const { getNextId } = require("../utils/counterUtils");

const MechanicSchema = new mongoose.Schema({
    _id: { type: String },
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String },
    password: { type: String, required: true },
    contact: { type: String, required: true },
    speciality: [{ type: String, required: true }],
    unavailableSlots: [{
        date: { type: String, required: true },
        timeSlots: [{
            start: { type: String, required: true },
            end: { type: String, required: true }
        }]
    }],
    minHour: { type: String, default: "08:00" },
    maxHour: { type: String, default: "17:00" }
}, { _id: false });

MechanicSchema.pre("save", async function (next) {
    try {
        if (!this._id) {
            const id = await getNextId("mechanic_id");
            this._id = "M" + String(id).padStart(3, "0");
        }
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model("Mechanic", MechanicSchema);