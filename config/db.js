const mongoose = require("mongoose");
const { initializeCounters } = require("../utils/counterUtils");

const connectDB = () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
      console.log("Successfully connected to MongoDB");
      await initializeCounters();
    })
    .catch((err) => {
      console.error("MongoDB connection error", err);
      process.exit(1);
    });
};

module.exports = connectDB;