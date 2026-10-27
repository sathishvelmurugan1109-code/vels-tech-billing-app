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
    staffId: { type: String, default: "" },
    staffName: { type: String, default: "" },
    verificationStatus: { type: String, enum: ["pending", "verified"], default: "pending" },
    verificationMethod: { type: String, enum: ["manual", "gateway"] },
    verifiedAt: { type: Date },
    idempotencyKey: { type: String, default: undefined },
    manualConfirmationBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    manualConfirmedAt: { type: Date },
  },
  { timestamps: true }
);

paymentSchema.index({ businessId: 1, createdAt: -1 });
paymentSchema.index(
  { businessId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
);

module.exports = mongoose.model("Payment", paymentSchema);