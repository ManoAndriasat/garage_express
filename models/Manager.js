const mongoose = require("mongoose");
const { getNextId } = require("../utils/counterUtils");

const ManagerSchema = new mongoose.Schema({
    _id: { type: String },
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String },
    password: { type: String, required: true },
    contact: { type: String, required: true }
}, { _id: false });

ManagerSchema.pre("save", async function (next) {
    try {
        if (!this._id) {
            const id = await getNextId("manager_id");
            this._id = "MGR" + String(id).padStart(3, "0");
        }
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model("Manager", ManagerSchema);