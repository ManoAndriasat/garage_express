const mongoose = require("mongoose");
const { getNextId } = require("../utils/counterUtils");

const ExistingCarSchema = new mongoose.Schema({
    _id: { type: String },
    brand: { type: String, required: true },
    model: { type: [String], required: true }
}, { _id: false });

ExistingCarSchema.pre("save", async function (next) {
    try {
        if (!this._id) {
            const id = await getNextId("existing_car_id");
            this._id = "EC" + String(id).padStart(3, "0");
        }
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model("ExistingCar", ExistingCarSchema);