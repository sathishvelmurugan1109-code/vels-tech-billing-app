// server/models/Invoice.js
const mongoose = require("mongoose");
const { splitGstTotal } = require("../utils/gst");

const invoiceItemSchema = new mongoose.Schema(
  {
    productId: { type: String, default: "" },
    name: { type: String, required: true },
    hsn: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    discountType: { type: String, enum: ["percent", "amount"], default: "percent" },
    discountAmount: { type: Number, default: 0, min: 0 },
    priceInclusive: { type: Boolean, default: false },
    gst: { type: Number, default: 0, min: 0, max: 100 },
    unit: { type: String, default: "pcs" },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    invoiceNo: { type: String, required: true },
    date: { type: String, required: true },
    customerId: { type: String, default: "" },
    customerName: { type: String, default: "" },
    customerPhone: { type: String, default: "" },
    customerGstin: { type: String, default: "" },
    customerAddress: { type: String, default: "" },
    customerState: { type: String, default: "" },
    items: { type: [invoiceItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    taxableAmount: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    igst: { type: Number, default: 0 },
    gstTotal: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paymentMode: { type: String, default: "Cash" },
    paymentStatus: { type: String, enum: ["Paid", "Partial", "Pending", "Cancelled"], default: "Pending" },
    status: { type: String, enum: ["Draft", "Saved", "Paid", "Partial", "Pending", "Cancelled"], default: "Saved" },
    manualPaymentConfirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    manualPaymentConfirmedAt: { type: Date },
    businessState: { type: String, default: "" },
    paidAmount: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    terms: { type: String, default: "" },
    staffId: { type: String, default: "" },
    staffName: { type: String, default: "" },
    staffRole: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

invoiceSchema.pre("validate", function deriveTaxComponents() {
  const split = splitGstTotal(
    this.gstTotal,
    this.businessState,
    this.customerState,
  );
  this.cgst = split.cgst;
  this.sgst = split.sgst;
  this.igst = split.igst;
});

invoiceSchema.pre("findOneAndUpdate", async function deriveUpdatedTaxComponents() {
  const update = this.getUpdate();
  if (!update || Array.isArray(update)) return;

  const fields = update.$set || update;
  const needsTaxSplit = [
    "gstTotal",
    "businessState",
    "customerState",
  ].some((field) => Object.prototype.hasOwnProperty.call(fields, field));
  if (!needsTaxSplit) return;

  const current = await this.model
    .findOne(this.getQuery())
    .select("gstTotal businessState customerState")
    .lean();
  if (!current) return;

  const split = splitGstTotal(
    fields.gstTotal ?? current.gstTotal,
    fields.businessState ?? current.businessState,
    fields.customerState ?? current.customerState,
  );
  this.setUpdate(
    update.$set
      ? { ...update, $set: { ...update.$set, ...split } }
      : { ...update, ...split },
  );
});

// Unique invoice number within business scope
invoiceSchema.index({ businessId: 1, invoiceNo: 1 }, { unique: true });
invoiceSchema.index({ businessId: 1, createdAt: -1 });

module.exports = mongoose.model("Invoice", invoiceSchema);