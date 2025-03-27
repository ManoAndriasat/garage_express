const mongoose = require("mongoose");
const { getNextId } = require("../utils/counterUtils");

const RepairSchema = new mongoose.Schema({
    _id: { type: String },
    car_id: { type: String, required: true },
    mechanic_id: { type: String, required: true },
    reparation: [{
        type: { type: String, required: true },
        material: { type: String },
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

