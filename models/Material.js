const mongoose = require("mongoose");
const { getNextId } = require("../utils/counterUtils");

const MaterialSchema = new mongoose.Schema({
    _id: { type: String },
    brand: { type: String },
    model: { type: String },
    name: { type: String, required: true },
    price: { type: Number, required: true }
}, { _id: false });

MaterialSchema.pre("save", async function (next) {
    try {
        if (!this._id) {
            const id = await getNextId("material_id");
            this._id = "P" + String(id).padStart(3, "0");
        }
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model("Material", MaterialSchema);