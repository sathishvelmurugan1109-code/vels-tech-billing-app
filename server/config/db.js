// server/config/db.js — MongoDB connection using Mongoose
const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  (process.env.NODE_ENV === "production" ? "" : "mongodb://localhost:27017/vels_billing");
let connectionPromise;

async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI must be configured in production.");
  }
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  try {
    if (!connectionPromise) {
      connectionPromise = mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      }).catch((err) => {
        connectionPromise = undefined;
        throw err;
      });
    }
    await connectionPromise;
    console.log(`[DB] Connected to MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, "//***@")}`);
    return mongoose.connection;
  } catch (err) {
    console.error("[DB] MongoDB connection error:", err.message);
    throw err;
  }
}

module.exports = { connectDB, mongoose };