import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  SlidersHorizontal,
  Package,
  AlertTriangle,
  ArrowDownToLine,
  Tag,
  Barcode,
  Filter,
} from "lucide-react";
import { formatCurrency } from "../services/money";
import { stockSummary } from "../services/stockService";
import type { Product, Supplier } from "../types";

export interface ProductsPageProps {
  products: Product[];
  suppliers: Supplier[];
  onAddProduct: () => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
  onStockAdjustment: (product: Product) => void;
}

export function ProductsPage({
  products,
  suppliers,
  onAddProduct,
  onEditProduct,
  onDeleteProduct,
  onStockAdjustment,
}: ProductsPageProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  const summary = useMemo(() => {
    return stockSummary(products);
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (stockFilter === "low" && p.stock > (p.lowStockLimit || 10)) return false;
      if (stockFilter === "out" && p.stock > 0) return false;

      if (search) {
        const q = search.toLowerCase();
        const match =
          p.name.toLowerCase().includes(q) ||
          p.hsn.includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.brand && p.brand.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [products, search, categoryFilter, stockFilter]);

  return (
    <div className="space-y-4">
      {/* Top Inventory Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Total Catalog</span>
            <Package className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2 text-[20px] md:text-[22px] font-extrabold text-zinc-900 mono">
            {summary.totalProducts} Items
          </div>
          <div className="mt-0.5 text-[11px] text-zinc-500">
            {summary.totalUnits} total units in stock
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Stock Value (Selling)</span>
            <Tag className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-[20px] md:text-[22px] font-extrabold text-emerald-700 mono">
            {formatCurrency(summary.stockValueSelling)}
          </div>
          <div className="mt-0.5 text-[11px] text-zinc-500">Inventory selling worth</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-bold uppercase tracking-wider">
            <span>Stock Value (Cost)</span>
            <Tag className="h-4 w-4 text-zinc-600" />
          </div>
          <div className="mt-2 text-[20px] md:text-[22px] font-extrabold text-zinc-900 mono">
            {formatCurrency(summary.stockValueCost)}
          </div>
          <div className="mt-0.5 text-[11px] text-zinc-500">Purchase capital tied up</div>
        </div>

        <div
          onClick={() => setStockFilter(stockFilter === "low" ? "all" : "low")}
          className={`p-4 rounded-2xl border shadow-sm cursor-pointer transition ${
            stockFilter === "low"
              ? "bg-amber-100/70 border-amber-300"
              : "bg-white border-zinc-200 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 text-[11px] font-bold uppercase tracking-wider">
            <span>Low Stock Warning</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-[20px] md:text-[22px] font-extrabold text-amber-700 mono">
            {summary.lowStockCount} Products
          </div>
          <div className="mt-0.5 text-[11px] text-amber-800">
            {stockFilter === "low" ? "Filtering low stock (click to reset)" : "At or below limit"}
          </div>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, HSN, barcode, SKU or brand..."
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-zinc-200 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {categories.length > 0 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-11 px-3 rounded-xl border border-zinc-200 bg-white text-[13px] font-medium"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as any)}
            className="h-11 px-3 rounded-xl border border-zinc-200 bg-white text-[13px] font-medium"
          >
            <option value="all">All Stock Levels</option>
            <option value="low">Low Stock Only</option>
            <option value="out">Out of Stock (0)</option>
          </select>
        </div>

        <button
          onClick={onAddProduct}
          className="h-11 px-5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm transition shrink-0"
        >
          <Plus className="h-4 w-4" /> Add Product
        </button>
      </div>

      {/* Products Table */}
      <div className="rounded-[22px] bg-white border border-zinc-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 text-left">Product Details</th>
                <th className="px-4 py-3.5 text-left">Category / Brand</th>
                <th className="px-4 py-3.5 text-right">Selling Price</th>
                <th className="px-4 py-3.5 text-center">GST Rate</th>
                <th className="px-4 py-3.5 text-right">Current Stock</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredProducts.map((p) => {
                const isLow = p.stock <= (p.lowStockLimit || 10);
                const isOut = p.stock <= 0;

                return (
                  <tr key={p.id} className="hover:bg-zinc-50/50 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-zinc-900">{p.name}</div>
                      <div className="text-[11px] text-zinc-400 mono flex items-center gap-2 mt-0.5">
                        <span className="px-1.5 py-0.2 rounded bg-zinc-100 border text-zinc-600">
                          HSN {p.hsn}
                        </span>
                        {p.barcode && <span>Barcode: {p.barcode}</span>}
                        {p.sku && <span>SKU: {p.sku}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-zinc-800">{p.category || "General"}</div>
                      {p.brand && <div className="text-[11px] text-zinc-400">{p.brand}</div>}
                    </td>
                    <td className="px-4 py-3.5 text-right font-extrabold mono text-zinc-900">
                      {formatCurrency(p.price)}
                      {p.purchasePrice ? (
                        <div className="text-[10px] text-zinc-400 font-normal">
                          Cost: {formatCurrency(p.purchasePrice)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                        {p.gst}% {p.gstType === "inclusive" ? "Incl" : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div
                        className={`font-extrabold mono text-[14px] ${
                          isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-zinc-900"
                        }`}
                      >
                        {p.stock} {p.unit}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        {isOut ? "Out of stock" : isLow ? "Low stock limit" : "Available"}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          title="Stock Adjustment / Stock In"
                          onClick={() => onStockAdjustment(p)}
                          className="h-8 px-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-[12px] font-semibold text-zinc-700 flex items-center gap-1 transition"
                        >
                          <SlidersHorizontal className="h-3 w-3" /> Adjust
                        </button>
                        <button
                          title="Edit Product"
                          onClick={() => onEditProduct(p)}
                          className="h-8 w-8 rounded-lg border border-zinc-200 hover:bg-zinc-100 grid place-items-center text-zinc-600 transition"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          title="Delete Product"
                          onClick={() => onDeleteProduct(p)}
                          className="h-8 w-8 rounded-lg border border-zinc-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 grid place-items-center text-zinc-400 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Responsive Cards */}
        <div className="md:hidden divide-y divide-zinc-100">
          {filteredProducts.map((p) => {
            const isLow = p.stock <= (p.lowStockLimit || 10);
            const isOut = p.stock <= 0;

            return (
              <div key={p.id} className="p-4 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-extrabold text-[14px] text-zinc-900">{p.name}</div>
                    <div className="text-[11px] text-zinc-500 mono flex items-center gap-1.5 mt-0.5">
                      <span>HSN: {p.hsn}</span>
                      <span>• {p.gst}% GST</span>
                      {p.category && <span>• {p.category}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold mono text-[16px] text-zinc-900">
                      {formatCurrency(p.price)}
                    </div>
                    <div
                      className={`text-[11px] font-bold ${
                        isOut ? "text-red-600" : isLow ? "text-amber-600" : "text-emerald-700"
                      }`}
                    >
                      {p.stock} {p.unit}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => onStockAdjustment(p)}
                    className="flex-1 min-h-[44px] rounded-xl bg-zinc-100 text-zinc-800 font-semibold text-[12px] flex items-center justify-center gap-1.5"
                  >
                    <SlidersHorizontal className="h-4 w-4" /> Stock In / Recount
                  </button>
                  <button
                    onClick={() => onEditProduct(p)}
                    className="h-11 px-4 rounded-xl border border-zinc-200 text-zinc-700 font-semibold text-[12px] flex items-center justify-center gap-1"
                  >
                    <Edit3 className="h-4 w-4" /> Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-16 text-center text-zinc-400 text-[13px]">
            No products match your search or filters. Click "Add Product" to add items.
          </div>
        )}
      </div>
    </div>
  );
}
