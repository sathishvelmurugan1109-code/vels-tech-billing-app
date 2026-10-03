import React, { useState, useEffect, useRef } from "react";
import { Search, X, Receipt, Package, Users, Truck, CreditCard, ArrowRight } from "lucide-react";
import { formatCurrency } from "../services/money";
import type { Product, Customer, Supplier, Invoice, Payment } from "../types";

export interface GlobalSearchModalProps {
  invoices: Invoice[];
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  payments: Payment[];
  onSelectInvoice: (inv: Invoice) => void;
  onSelectProduct: (prod: Product) => void;
  onSelectCustomer: (cust: Customer) => void;
  onSelectSupplier: (supp: Supplier) => void;
  onClose: () => void;
}

export function GlobalSearchModal({
  invoices,
  products,
  customers,
  suppliers,
  payments,
  onSelectInvoice,
  onSelectProduct,
  onSelectCustomer,
  onSelectSupplier,
  onClose,
}: GlobalSearchModalProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.trim().toLowerCase();

  // Search matches
  const matchedInvoices = q
    ? invoices
        .filter(
          (inv) =>
            inv.invoiceNo.toLowerCase().includes(q) ||
            inv.customerName.toLowerCase().includes(q) ||
            inv.customerPhone.includes(q),
        )
        .slice(0, 5)
    : [];

  const matchedProducts = q
    ? products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.hsn.includes(q) ||
            (p.barcode && p.barcode.toLowerCase().includes(q)) ||
            (p.sku && p.sku.toLowerCase().includes(q)),
        )
        .slice(0, 5)
    : [];

  const matchedCustomers = q
    ? customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.phone.includes(q) ||
            (c.gstin && c.gstin.toLowerCase().includes(q)),
        )
        .slice(0, 5)
    : [];

  const matchedSuppliers = q
    ? suppliers
        .filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.phone.includes(q) ||
            (s.gstin && s.gstin.toLowerCase().includes(q)),
        )
        .slice(0, 5)
    : [];

  const totalResults =
    matchedInvoices.length + matchedProducts.length + matchedCustomers.length + matchedSuppliers.length;

  return (
    <div className="fixed inset-0 z-[80] bg-zinc-900/60 backdrop-blur-sm grid place-items-start p-4 pt-12 md:pt-20">
      <div className="w-full max-w-[640px] rounded-[24px] bg-white border border-zinc-200 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-zinc-100 flex items-center gap-3">
          <Search className="h-5 w-5 text-zinc-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search invoices, products, customers, suppliers..."
            className="w-full h-10 text-[15px] font-medium bg-transparent focus:outline-none placeholder:text-zinc-400"
          />
          {query ? (
            <button
              onClick={() => setQuery("")}
              className="h-7 w-7 grid place-items-center rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-500"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[12px] font-semibold transition"
          >
            Esc
          </button>
        </div>

        {/* Results List */}
        <div className="p-3 overflow-y-auto flex-1 space-y-4">
          {!q ? (
            <div className="py-12 text-center text-zinc-400 text-[13px]">
              Type a customer name, phone, invoice number, product name, barcode, or SKU...
            </div>
          ) : totalResults === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-[13px]">
              No matches found for <span className="font-semibold text-zinc-800">"{query}"</span>
            </div>
          ) : (
            <>
              {/* Invoices */}
              {matchedInvoices.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-indigo-500" /> Invoices
                  </div>
                  <div className="space-y-1 mt-1">
                    {matchedInvoices.map((inv) => (
                      <button
                        key={inv.id}
                        onClick={() => {
                          onSelectInvoice(inv);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 text-left transition group"
                      >
                        <div>
                          <div className="font-bold text-[13px] text-zinc-900 mono">
                            {inv.invoiceNo}{" "}
                            <span className="font-normal text-zinc-500 text-[12px]">
                              • {inv.customerName}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {inv.date} • {inv.paymentStatus} • {inv.paymentMode}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <span className="font-bold text-[13px] mono">
                            {formatCurrency(inv.grandTotal)}
                          </span>
                          <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-600 transition" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Products */}
              {matchedProducts.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-indigo-500" /> Products
                  </div>
                  <div className="space-y-1 mt-1">
                    {matchedProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          onSelectProduct(p);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 text-left transition group"
                      >
                        <div>
                          <div className="font-bold text-[13px] text-zinc-900">{p.name}</div>
                          <div className="text-[11px] text-zinc-500 mono">
                            HSN {p.hsn} • Stock: {p.stock} {p.unit}
                            {p.barcode ? ` • Barcode: ${p.barcode}` : ""}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <span className="font-bold text-[13px] mono">
                            {formatCurrency(p.price)}
                          </span>
                          <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-600 transition" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers */}
              {matchedCustomers.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-indigo-500" /> Customers
                  </div>
                  <div className="space-y-1 mt-1">
                    {matchedCustomers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          onSelectCustomer(c);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 text-left transition group"
                      >
                        <div>
                          <div className="font-bold text-[13px] text-zinc-900">{c.name}</div>
                          <div className="text-[11px] text-zinc-500 mono">
                            {c.phone} • {c.state}
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <span className="text-[11px] text-zinc-400">View profile</span>
                          <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-600 transition" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suppliers */}
              {matchedSuppliers.length > 0 && (
                <div>
                  <div className="px-3 py-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-indigo-500" /> Suppliers
                  </div>
                  <div className="space-y-1 mt-1">
                    {matchedSuppliers.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          onSelectSupplier(s);
                          onClose();
                        }}
                        className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 text-left transition group"
                      >
                        <div>
                          <div className="font-bold text-[13px] text-zinc-900">{s.name}</div>
                          <div className="text-[11px] text-zinc-500 mono">{s.phone}</div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <span className="text-[11px] text-zinc-400">View details</span>
                          <ArrowRight className="h-4 w-4 text-zinc-300 group-hover:text-zinc-600 transition" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
