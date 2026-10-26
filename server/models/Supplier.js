// server/models/Supplier.js
const mongoose = require("mongoose");

const supplierSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: [true, "Supplier name is required"], trim: true, maxlength: 200 },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    address: { type: String, trim: true, default: "" },
    gstin: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    openingBalance: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

supplierSchema.index({ businessId: 1, name: 1 });

module.exports = mongoose.model("Supplier", supplierSchema);