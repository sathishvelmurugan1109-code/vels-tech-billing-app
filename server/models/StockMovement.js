// server/models/StockMovement.js
const mongoose = require("mongoose");

const stockMovementSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    productId: { type: String, required: true },
    productName: { type: String, default: "" },
    type: { type: String, enum: ["in", "out", "adjustment"], required: true },
    qty: { type: Number, required: true },
    reason: { type: String, default: "" },
    reference: { type: String, default: "" },
    date: { type: String, required: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

stockMovementSchema.index({ businessId: 1, createdAt: -1 });

module.exports = mongoose.model("StockMovement", stockMovementSchema);