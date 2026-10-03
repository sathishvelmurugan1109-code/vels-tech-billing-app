import React, { useState, useEffect } from "react";
import { X, Package, Tag, Layers, Check, AlertCircle } from "lucide-react";
import type { Product, Supplier } from "../types";

export const STANDARD_UNITS = [
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "gm", label: "Grams (gm)" },
  { value: "litre", label: "Litres (litre)" },
  { value: "ml", label: "Millilitres (ml)" },
  { value: "box", label: "Boxes (box)" },
  { value: "packet", label: "Packets (pkt)" },
  { value: "dozen", label: "Dozens (dzn)" },
  { value: "meter", label: "Meters (mtr)" },
  { value: "set", label: "Sets (set)" },
  { value: "roll", label: "Rolls (roll)" },
];

export const GST_RATE_OPTIONS = [0, 5, 12, 18, 28];

export interface ProductModalProps {
  product: Product | null;
  suppliers: Supplier[];
  categories: string[];
  initialName?: string;
  onSave: (productData: Omit<Product, "id"> & { id?: string }) => void;
  onClose: () => void;
}

export function ProductModal({
  product,
  suppliers,
  categories,
  initialName = "",
  onSave,
  onClose,
}: ProductModalProps) {
  const [name, setName] = useState(product?.name || initialName || "");
  const [sku, setSku] = useState(product?.sku || "");
  const [barcode, setBarcode] = useState(product?.barcode || "");
  const [category, setCategory] = useState(product?.category || "");
  const [brand, setBrand] = useState(product?.brand || "");
  const [unit, setUnit] = useState(product?.unit || "pcs");
  const [customUnit, setCustomUnit] = useState("");
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [hsn, setHsn] = useState(product?.hsn || "");
  const [purchasePrice, setPurchasePrice] = useState<number | "">(
    product?.purchasePrice !== undefined ? product.purchasePrice : product?.cost || "",
  );
  const [price, setPrice] = useState<number | "">(product?.price !== undefined ? product.price : "");
  const [mrp, setMrp] = useState<number | "">(product?.mrp !== undefined ? product.mrp : "");
  const [gst, setGst] = useState<number>(product?.gst !== undefined ? product.gst : 18);
  const [gstType, setGstType] = useState<"exclusive" | "inclusive">(
    product?.gstType || "exclusive",
  );
  const [stock, setStock] = useState<number | "">(product?.stock !== undefined ? product.stock : 0);
  const [openingStock, setOpeningStock] = useState<number | "">(
    product?.openingStock !== undefined ? product.openingStock : product?.stock || 0,
  );
  const [lowStockLimit, setLowStockLimit] = useState<number | "">(
    product?.lowStockLimit !== undefined ? product.lowStockLimit : 10,
  );
  const [supplierId, setSupplierId] = useState(product?.supplierId || "");
  const [description, setDescription] = useState(product?.description || "");
  const [status, setStatus] = useState<"active" | "inactive">(product?.status || "active");
  const [error, setError] = useState("");

  useEffect(() => {
    if (product?.unit && !STANDARD_UNITS.some((u) => u.value === product.unit)) {
      setIsCustomUnit(true);
      setCustomUnit(product.unit);
    }
  }, [product]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Product Name is required");
      return;
    }
    const finalPrice = typeof price === "number" ? price : parseFloat(String(price)) || 0;
    if (finalPrice < 0) {
      setError("Selling price cannot be negative");
      return;
    }

    const selectedSupplier = suppliers.find((s) => s.id === supplierId);
    const effectiveUnit = isCustomUnit ? customUnit.trim() || "pcs" : unit;

    onSave({
      id: product?.id,
      name: name.trim(),
      sku: sku.trim() || undefined,
      barcode: barcode.trim() || undefined,
      category: category.trim() || undefined,
      brand: brand.trim() || undefined,
      unit: effectiveUnit,
      hsn: hsn.trim(),
      purchasePrice:
        typeof purchasePrice === "number"
          ? purchasePrice
          : purchasePrice !== ""
          ? parseFloat(String(purchasePrice)) || 0
          : undefined,
      cost:
        typeof purchasePrice === "number"
          ? purchasePrice
          : purchasePrice !== ""
          ? parseFloat(String(purchasePrice)) || 0
          : undefined,
      price: finalPrice,
      mrp:
        typeof mrp === "number" ? mrp : mrp !== "" ? parseFloat(String(mrp)) || undefined : undefined,
      gst: gst,
      gstType: gstType,
      stock: typeof stock === "number" ? stock : parseInt(String(stock)) || 0,
      openingStock:
        typeof openingStock === "number"
          ? openingStock
          : openingStock !== ""
          ? parseInt(String(openingStock)) || 0
          : undefined,
      lowStockLimit:
        typeof lowStockLimit === "number"
          ? lowStockLimit
          : lowStockLimit !== ""
          ? parseInt(String(lowStockLimit)) || 10
          : 10,
      supplierId: supplierId || undefined,
      supplierName: selectedSupplier?.name || undefined,
      description: description.trim() || undefined,
      status: status,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-zinc-900/60 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <div className="w-full max-w-[680px] rounded-[24px] bg-white border border-zinc-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-zinc-900 text-white grid place-items-center font-bold">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold text-[17px] text-zinc-900">
                {product ? "Edit Product" : "Add New Product"}
              </div>
              <div className="text-[11px] text-zinc-500">
                Configure prices, taxes, stock alerts, and barcode
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[12px] flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Basic Details */}
          <div>
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Product Information
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-zinc-600">PRODUCT NAME *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dell Inspiron 14 Laptop"
                  className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600">BARCODE</label>
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g. 8901234567890"
                  className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600">SKU / ITEM CODE</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. DELL-INS-14"
                  className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600">HSN / SAC CODE</label>
                <input
                  type="text"
                  value={hsn}
                  onChange={(e) => setHsn(e.target.value)}
                  placeholder="e.g. 8471"
                  className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600">CATEGORY</label>
                <input
                  type="text"
                  list="category-suggestions"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Electronics, Hardware"
                  className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <datalist id="category-suggestions">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600">BRAND / MAKER</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Dell, Logitech"
                  className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600">UNIT OF MEASURE</label>
                <div className="mt-1 flex gap-2">
                  {!isCustomUnit ? (
                    <select
                      value={unit}
                      onChange={(e) => {
                        if (e.target.value === "custom") {
                          setIsCustomUnit(true);
                        } else {
                          setUnit(e.target.value);
                        }
                      }}
                      className="w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {STANDARD_UNITS.map((u) => (
                        <option key={u.value} value={u.value}>
                          {u.label}
                        </option>
                      ))}
                      <option value="custom">+ Custom Unit...</option>
                    </select>
                  ) : (
                    <div className="flex-1 flex gap-1.5">
                      <input
                        type="text"
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                        placeholder="e.g. bundle, sqft"
                        className="flex-1 h-11 px-3 rounded-xl border border-zinc-200 text-[13px]"
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomUnit(false)}
                        className="h-11 px-3 rounded-xl border border-zinc-200 text-[11px] text-zinc-600 hover:bg-zinc-50"
                      >
                        Standard
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & GST */}
          <div className="pt-2 border-t border-zinc-100">
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Pricing & Taxes
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-600">SELLING PRICE (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0"
                  value={price}
                  onChange={(e) =>
                    setPrice(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                  className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[14px] font-bold mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600">PURCHASE PRICE / COST (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={purchasePrice}
                  onChange={(e) =>
                    setPurchasePrice(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                  className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600">MRP (₹)</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={mrp}
                  onChange={(e) =>
                    setMrp(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                  className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600">GST RATE</label>
                <select
                  value={gst}
                  onChange={(e) => setGst(parseInt(e.target.value))}
                  className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white font-semibold text-indigo-700"
                >
                  {GST_RATE_OPTIONS.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}% {rate === 0 ? "(Exempt)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600">TAX TYPE</label>
                <select
                  value={gstType}
                  onChange={(e) => setGstType(e.target.value as any)}
                  className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white"
                >
                  <option value="exclusive">Exclusive (Price + GST)</option>
                  <option value="inclusive">Inclusive (Price includes GST)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600">STATUS</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white font-medium"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive / Archived</option>
                </select>
              </div>
            </div>
          </div>

          {/* Inventory & Stock Limits */}
          <div className="pt-2 border-t border-zinc-100">
            <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Inventory & Alerts
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-600">CURRENT STOCK</label>
                <input
                  type="number"
                  step="any"
                  value={stock}
                  onChange={(e) =>
                    setStock(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                  }
                  className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[14px] font-bold mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600">OPENING STOCK</label>
                <input
                  type="number"
                  step="any"
                  value={openingStock}
                  onChange={(e) =>
                    setOpeningStock(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                  }
                  className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600">LOW STOCK LIMIT</label>
                <input
                  type="number"
                  step="any"
                  value={lowStockLimit}
                  onChange={(e) =>
                    setLowStockLimit(e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                  }
                  placeholder="10"
                  className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          {/* Supplier & Description */}
          <div className="pt-2 border-t border-zinc-100 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-zinc-600">PREFERRED SUPPLIER</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white"
              >
                <option value="">None / Direct</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.state})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600">NOTES / DESCRIPTION</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Model, size, warranty info..."
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-zinc-100 flex gap-2">
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-[13px] transition"
            >
              {product ? "Save Changes" : "Create Product"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-[13px] font-medium text-zinc-700 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
