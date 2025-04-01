const mongoose = require("mongoose");
const { getNextId } = require("../utils/counterUtils");

const InvoiceSchema = new mongoose.Schema({
    _id: { type: String },
    repair_id: { type: String, required: true, unique: true },
    owner: { 
        _id : { type: String },
        firstname: { type: String, required: true },
        lastname: { type: String, required: true },
        contact: { type: String, required: true },
    },
    car: {
        _id: { type: String },
        brand: { type: String, required: true },
        model: { type: String, required: true },
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
        start: { type: String, required: true },
        end: { type: String, required: true }
    }],
    total : { type: Number, required: true },
    date: { type: String, required: true },
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