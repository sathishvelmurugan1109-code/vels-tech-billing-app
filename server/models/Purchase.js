// server/models/Purchase.js
const mongoose = require("mongoose");

const purchaseItemSchema = new mongoose.Schema(
  {
    productId: { type: String, default: "" },
    name: { type: String, required: true },
    hsn: { type: String, default: "" },
    purchasePrice: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    discountType: { type: String, enum: ["percent", "amount"], default: "percent" },
    gst: { type: Number, default: 0, min: 0, max: 100 },
    priceInclusive: { type: Boolean, default: false },
    unit: { type: String, default: "pcs" },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    purchaseNo: { type: String, required: true },
    supplierInvoiceNo: { type: String, default: "" },
    supplierId: { type: String, default: "" },
    supplierName: { type: String, default: "" },
    supplierGstin: { type: String, default: "" },
    supplierState: { type: String, default: "" },
    date: { type: String, required: true },
    items: { type: [purchaseItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    gstTotal: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    paymentMode: { type: String, default: "Cash" },
    paymentStatus: { type: String, enum: ["Paid", "Partial", "Pending"], default: "Pending" },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

purchaseSchema.index({ businessId: 1, purchaseNo: 1 }, { unique: true });
purchaseSchema.index({ businessId: 1, createdAt: -1 });

module.exports = mongoose.model("Purchase", purchaseSchema);