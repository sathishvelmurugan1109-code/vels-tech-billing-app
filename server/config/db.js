// server/config/db.js — MongoDB connection using Mongoose
const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/vels_billing";

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI, {
      // Mongoose 8 defaults are fine; keep options explicit for clarity.
    });
    console.log(`[DB] Connected to MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, "//***@")}`);
    return mongoose.connection;
  } catch (err) {
    console.error("[DB] MongoDB connection error:", err.message);
    throw err;
  }
}

module.exports = { connectDB, mongoose };