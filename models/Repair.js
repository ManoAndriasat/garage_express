const mongoose = require("mongoose");
const { getNextId } = require("../utils/counterUtils");

const RepairSchema = new mongoose.Schema({
    _id: { type: String },
    appointment_id: { type: String, required: true, unique: true },
    isfinished: { 
        mechanic: { type: Boolean, default: false },
        user: { type: Boolean, default: false }
    },
    owner: { 
        _id : { type: String },
        firstname: { type: String, required: true },
        lastname: { type: String, required: true },
        contact: { type: String, required: true },
        email: { type: String, required: true },
    },
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
    reparation: [{
        type: { type: String, required: true },
        material: { type: String },
        price: { type: Number, required: true },
        description: { type: String, required: true },
        status: {
            mechanic: { type: Boolean, default: true },
            user: { type: Boolean, default: true }
        },
        start: { type: String, required: true },
        end: { type: String, required: true }
    }]
}, { _id: false });

RepairSchema.pre("save", async function (next) {
    try {
        if (!this._id) {
            const id = await getNextId("repair_id");
            this._id = "R" + String(id).padStart(3, "0");
        }
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model("Repair", RepairSchema);

