const mongoose = require("mongoose");
const { getNextId } = require("../utils/counterUtils");

const UserSchema = new mongoose.Schema(
  {
    _id: { type: String },
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    contact: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    address: {
      street: { type: String },
      city: { type: String },
      lot: { type: String },
    }
  },
  { _id: false }
);

UserSchema.pre("save", async function (next) {
  try {
    if (!this._id) {
      const id = await getNextId("user_id");
      this._id = "CST" + String(id).padStart(3, "0");
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("User", UserSchema);