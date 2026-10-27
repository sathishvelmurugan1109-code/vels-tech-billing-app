// server/models/Staff.js — Staff Model with multi-tenant business isolation
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const staffSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Business",
      required: [true, "Business ID is required"],
      index: true,
    },
    employeeCode: {
      type: String,
      required: [true, "Employee code is required"],
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 100,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "manager", "cashier", "sales"],
      default: "cashier",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    pinHash: {
      type: String,
      default: "",
      select: false,
    },
    permissions: {
      type: [String],
      default: [],
    },
    lastActiveAt: {
      type: Date,
      default: null,
    },
    failedPinAttempts: {
      type: Number,
      default: 0,
    },
    lockoutUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

staffSchema.index({ businessId: 1, employeeCode: 1 }, { unique: true });
staffSchema.index({ businessId: 1, status: 1 });

staffSchema.methods.comparePin = async function (candidatePin) {
  if (!this.pinHash) return false;
  return bcrypt.compare(String(candidatePin), this.pinHash);
};

staffSchema.statics.hashPin = async function (pin) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(String(pin), salt);
};

module.exports = mongoose.model("Staff", staffSchema);
