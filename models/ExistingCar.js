const mongoose = require("mongoose");

const ExistingCarSchema = new mongoose.Schema({
    brand: { type: String, required: true },
    model: { type: [String], required: true }
});

module.exports = mongoose.model("ExistingCar", ExistingCarSchema);