// server/models/Customer.js
const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: [true, "Customer name is required"], trim: true, maxlength: 200 },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    gstin: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    openingBalance: { type: Number, default: 0 },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

customerSchema.index({ businessId: 1, name: 1 });
customerSchema.index({ businessId: 1, phone: 1 });

module.exports = mongoose.model("Customer", customerSchema);