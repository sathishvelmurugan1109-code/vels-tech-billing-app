// server/models/Business.js — Business (tenant) model
const mongoose = require("mongoose");

const businessSchema = new mongoose.Schema(
  {
    businessId: {
      type: String,
      unique: true,
      index: true,
    },
    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
      maxlength: 200,
    },
    ownerName: {
      type: String,
      required: [true, "Owner name is required"],
      trim: true,
      maxlength: 100,
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
    plan: {
      type: String,
      enum: ["Free", "Pro", "Enterprise"],
      default: "Free",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    // Business settings (company info, GST, invoice config, etc.)
    settings: {
      companyName: { type: String, default: "" },
      address: { type: String, default: "" },
      gstin: { type: String, default: "" },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
      state: { type: String, default: "" },
      location: { type: String, default: "" },
      invoiceTerms: { type: String, default: "" },
      logoText: { type: String, default: "" },
      logo: { type: String, default: "" },
      upiId: { type: String, default: "" },
      upiName: { type: String, default: "" },
      upiQr: { type: String, default: "" },
      paymentInstructions: { type: String, default: "" },
      enableDynamicUpiQr: { type: Boolean, default: false },
      invoicePrefix: { type: String, default: "INV-" },
      startingInvoiceNo: { type: Number, default: 1 },
      autoInvoiceNo: { type: Boolean, default: true },
      invoiceDateFormat: { type: String, default: "YYYY-MM-DD" },
      currency: { type: String, default: "INR" },
      decimalPrecision: { type: Number, default: 2 },
      roundOff: { type: Boolean, default: true },
      defaultPaymentMode: { type: String, default: "Cash" },
      defaultGst: { type: Number, default: 0 },
      defaultNotes: { type: String, default: "" },
      footerMessage: { type: String, default: "" },
      showGst: { type: Boolean, default: true },
      showDiscount: { type: Boolean, default: true },
      showCustomerGstin: { type: Boolean, default: true },
      showHsn: { type: Boolean, default: true },
      showPaymentDetails: { type: Boolean, default: true },
      showQr: { type: Boolean, default: true },
      showLogo: { type: Boolean, default: true },
    },
    // Subscription / usage tracking
    usage: {
      invoices: { type: Number, default: 0 },
      products: { type: Number, default: 0 },
      customers: { type: Number, default: 0 },
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Auto-generate businessId before save
businessSchema.pre("save", function (next) {
  if (!this.businessId) {
    this.businessId = `BIZ-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model("Business", businessSchema);