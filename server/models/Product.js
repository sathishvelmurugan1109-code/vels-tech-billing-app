// server/models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: "Business", required: true, index: true },
    name: { type: String, required: [true, "Product name is required"], trim: true, maxlength: 200 },
    sku: { type: String, trim: true, default: "" },
    barcode: { type: String, trim: true, default: "" },
    category: { type: String, trim: true, default: "" },
    brand: { type: String, trim: true, default: "" },
    unit: { type: String, required: true, default: "pcs" },
    purchasePrice: { type: Number, default: 0, min: 0 },
    price: { type: Number, required: true, min: 0 },
    mrp: { type: Number, default: 0, min: 0 },
    gst: { type: Number, default: 0, min: 0, max: 100 },
    gstType: { type: String, enum: ["exclusive", "inclusive"], default: "exclusive" },
    stock: { type: Number, default: 0, min: 0 },
    openingStock: { type: Number, default: 0, min: 0 },
    lowStockLimit: { type: Number, default: 10, min: 0 },
    supplierId: { type: String, default: "" },
    supplierName: { type: String, default: "" },
    image: { type: String, default: "" },
    description: { type: String, default: "" },
    hsn: { type: String, default: "" },
    sac: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    cost: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

productSchema.index({ businessId: 1, name: 1 });
productSchema.index({ businessId: 1, barcode: 1 });

module.exports = mongoose.model("Product", productSchema);