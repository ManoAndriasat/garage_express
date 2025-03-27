const mongoose = require("mongoose");
const { getNextId } = require("../utils/counterUtils");

const InvoiceSchema = new mongoose.Schema({
    _id: { type: String },
    repair_id: { type: String, required: true },
    date: { type: String, required: true },
    car_id: { type: String, required: true },
    mechanic_in_charge: { type: String, required: true },
    details: [{
        material: { type: String, required: true },
        type: { type: String, required: true },
        price: { type: Number, required: true },
        devis: { type: String, required: true }
    }]
}, { _id: false });

InvoiceSchema.pre("save", async function (next) {
    try {
        if (!this._id) {
            const id = await getNextId("invoice_id");
            this._id = "I" + String(id).padStart(3, "0");
        }
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model("Invoice", InvoiceSchema);