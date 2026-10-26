// server/models/Expense.js
const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    category: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: String, required: true },
    paymentMode: { type: String, default: "Cash" },
    notes: { type: String, default: "" },
    reference: { type: String, default: "" },
  },
  { timestamps: true }
);

expenseSchema.index({ businessId: 1, date: -1 });

module.exports = mongoose.model("Expense", expenseSchema);