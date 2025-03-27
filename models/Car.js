const mongoose = require("mongoose");
const { getNextId } = require("../utils/counterUtils");

const CarSchema = new mongoose.Schema({
    _id: { type: String },
    owner: { type: String, required: true },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: Number, required: true },
    vin: { type: String, required: true },
}, { _id: false });

CarSchema.pre("save", async function (next) {
    try {
        if (!this._id) {
            const id = await getNextId("car_id");
            this._id = "C" + String(id).padStart(3, "0");
        }
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model("Car", CarSchema);