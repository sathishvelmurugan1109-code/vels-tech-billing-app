// server/models/Payment.js
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    type: { type: String, enum: ["customer", "supplier"], required: true },
    customerId: { type: String, default: "" },
    customerName: { type: String, default: "" },
    supplierId: { type: String, default: "" },
    supplierName: { type: String, default: "" },
    invoiceId: { type: String, default: "" },
    invoiceNo: { type: String, default: "" },
    amount: { type: Number, required: true, min: 0 },
    mode: { type: String, default: "Cash" },
    date: { type: String, required: true },
    reference: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

paymentSchema.index({ businessId: 1, createdAt: -1 });

module.exports = mongoose.model("Payment", paymentSchema);