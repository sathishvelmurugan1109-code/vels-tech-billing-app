import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Search,
  Plus,
  Trash2,
  Calendar,
  Save,
  Barcode,
  Smartphone,
  CreditCard,
  Banknote,
  Minus,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  Phone,
  UserPlus,
  PackagePlus,
  X,
} from "lucide-react";
import { formatCurrency, roundMoney, toNumber } from "../services/money";
import { calculateInvoiceTotals, buildInvoiceRecord } from "../services/invoiceService";
import { todayISO } from "../services/dateService";
import { normalizeWaNumber, buildCustomerWaMessage } from "../components/InvoiceRenderer";
import type {
  Product,
  Customer,
  Invoice,
  InvoiceItem,
  CompanySettings,
  PaymentMode,
  PaymentStatus,
} from "../types";

export interface BillingPageProps {
  products: Product[];
  customers: Customer[];
  invoices: Invoice[];
  settings: CompanySettings;
  editingInvoice: Invoice | null;
  onSaveInvoice: (invoice: Invoice) => void;
  onOpenBarcodeScanner: () => void;
  onOpenAddProduct: (initialName?: string) => void;
  onOpenAddCustomer: () => void;
  onCancelEdit: () => void;
}

export function BillingPage({
  products,
  customers,
  invoices,
  settings,
  editingInvoice,
  onSaveInvoice,
  onOpenBarcodeScanner,
  onOpenAddProduct,
  onOpenAddCustomer,
  onCancelEdit,
}: BillingPageProps) {
  // Form State
  const [customerId, setCustomerId] = useState<string>(editingInvoice?.customerId || "");
  const [customerPhone, setCustomerPhone] = useState<string>(editingInvoice?.customerPhone || "");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [date, setDate] = useState<string>(editingInvoice?.date || todayISO());
  const [items, setItems] = useState<InvoiceItem[]>(editingInvoice?.items || []);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(editingInvoice?.paymentMode || "UPI");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    editingInvoice?.paymentStatus || "Paid",
  );
  const [paidAmount, setPaidAmount] = useState<number | "">(
    editingInvoice ? editingInvoice.paidAmount : "",
  );
  const [notes, setNotes] = useState<string>(editingInvoice?.notes || "");
  const [terms, setTerms] = useState<string>(editingInvoice?.terms || settings.invoiceTerms);

  // Search & suggestions
  const [productSearch, setProductSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [error, setError] = useState("");

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Selected customer
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) || null,
    [customers, customerId],
  );

  // Sync phone when customer changes
  useEffect(() => {
    if (selectedCustomer && !editingInvoice) {
      setCustomerPhone(selectedCustomer.phone);
      setPhoneTouched(false);
    }
  }, [selectedCustomer, editingInvoice]);

  // Invoice Number generation
  const invoiceNo = useMemo(() => {
    if (editingInvoice) return editingInvoice.invoiceNo;
    const prefix = settings.invoicePrefix || "VELS-";
    const startNum = settings.startingInvoiceNo || 1;
    const maxNumber = invoices.reduce((max, inv) => {
      const parts = inv.invoiceNo.split("-");
      const num = parseInt(parts[parts.length - 1] || "0", 10);
      return Math.max(max, isNaN(num) ? 0 : num);
    }, startNum - 1);

    return `${prefix}${String(maxNumber + 1).padStart(4, "0")}`;
  }, [editingInvoice, invoices, settings.invoicePrefix, settings.startingInvoiceNo]);

  // Authoritative Calculation via calculation engine
  const calculation = useMemo(() => {
    const customerState = selectedCustomer?.state || settings.state;
    return calculateInvoiceTotals(items, customerState, settings.state);
  }, [items, selectedCustomer, settings.state]);

  // Frequently sold products (quick pills)
  const frequentProducts = useMemo(() => {
    const counts = new Map<string, number>();
    invoices.forEach((inv) => {
      if (inv.status !== "Cancelled") {
        inv.items.forEach((it) => {
          counts.set(it.productId, (counts.get(it.productId) || 0) + it.qty);
        });
      }
    });

    return products
      .filter((p) => p.status !== "inactive")
      .sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0))
      .slice(0, 6);
  }, [products, invoices]);

  // Product Add to Cart
  const addProductToInvoice = (product: Product) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          hsn: product.hsn,
          price: product.price,
          qty: 1,
          discount: 0,
          gst: product.gst,
          unit: product.unit,
          priceInclusive: product.gstType === "inclusive",
        },
      ];
    });
    setProductSearch("");
  };

  const updateItemQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeItem(index);
      return;
    }
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, qty: newQty } : item)),
    );
  };

  const updateItemDiscount = (index: number, discount: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, discount: Math.min(100, Math.max(0, discount)) } : item,
      ),
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // WhatsApp Validation
  const wa = normalizeWaNumber(customerPhone);
  const isWaValid = wa.waNumber.length === 12;

  const handleSendWa = () => {
    const custName = selectedCustomer?.name || "Customer";
    const msg = buildCustomerWaMessage(
      custName,
      invoiceNo,
      date,
      calculation.grandTotal,
      paymentStatus,
      paymentMode,
      settings,
    );
    if (!wa.waNumber) {
      alert("Please enter a valid 10-digit mobile number.");
      setPhoneTouched(true);
      return;
    }
    window.open(`https://wa.me/${wa.waNumber}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Save Invoice
  const handleSave = () => {
    setError("");
    if (!selectedCustomer) {
      setError("Please select a customer for this invoice.");
      return;
    }
    if (items.length === 0) {
      setError("Please add at least one product to the invoice.");
      return;
    }

    const effectivePhone = customerPhone.trim() || selectedCustomer.phone;
    const phoneCheck = normalizeWaNumber(effectivePhone);
    if (!phoneCheck.waNumber) {
      setError("Please enter a valid WhatsApp / Mobile number for the customer.");
      setPhoneTouched(true);
      return;
    }

    const finalPaid =
      paymentStatus === "Paid"
        ? calculation.grandTotal
        : paymentStatus === "Pending"
        ? 0
        : typeof paidAmount === "number"
        ? paidAmount
        : parseFloat(String(paidAmount)) || 0;

    const invoiceRecord = buildInvoiceRecord({
      id: editingInvoice?.id || `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      invoiceNo,
      date,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: effectivePhone,
      customerGstin: selectedCustomer.gstin,
      customerAddress: selectedCustomer.address,
      customerState: selectedCustomer.state,
      businessState: settings.state,
      items,
      paymentMode,
      paymentStatus,
      paidAmount: finalPaid,
      notes,
      terms,
      status: "Saved",
    });

    onSaveInvoice(invoiceRecord);
  };

  const filteredSearchProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.status !== "inactive")
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.hsn.includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (p.sku && p.sku.toLowerCase().includes(q)),
      )
      .slice(0, 10);
  }, [products, productSearch]);

  return (
    <div className="space-y-5 pb-24 md:pb-6">
      {/* Top Banner / Edit Bar */}
      {editingInvoice && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            <Clock className="h-4 w-4 text-amber-700" />
            <span>Editing Invoice: {editingInvoice.invoiceNo}</span>
          </div>
          <button
            onClick={onCancelEdit}
            className="text-[12px] font-semibold text-amber-800 hover:underline"
          >
            Cancel Edit & Start New
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-[13px] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Customer + Product Search + Items (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* 1. Customer Selection Card */}
          <div className="rounded-[22px] bg-white border border-zinc-200 p-4 md:p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-lg bg-zinc-900 text-white grid place-items-center text-[11px] font-bold">
                  1
                </span>
                <span className="font-bold text-[15px] text-zinc-900">Customer Details</span>
              </div>
              <button
                type="button"
                onClick={onOpenAddCustomer}
                className="h-8 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[12px] font-semibold flex items-center gap-1.5 transition"
              >
                <UserPlus className="h-3.5 w-3.5" /> + New Customer
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  Select Existing Customer *
                </label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} • {c.phone} ({c.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  Invoice Date
                </label>
                <div className="mt-1 relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-11 pl-9 pr-3 rounded-xl border border-zinc-200 text-[13px] bg-white font-medium focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Selected Customer Preview & Dynamic WhatsApp Input */}
            {selectedCustomer && (
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-[12px] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-[14px] text-zinc-900">
                      {selectedCustomer.name}
                    </span>
                    <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-white border border-zinc-200 mono">
                      {selectedCustomer.state}
                    </span>
                    {selectedCustomer.gstin && (
                      <span className="ml-2 text-[11px] text-zinc-500 mono">
                        GSTIN: {selectedCustomer.gstin}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {selectedCustomer.state === settings.state
                      ? "CGST + SGST (Intra-state)"
                      : "IGST (Inter-state)"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <div className="flex-1 relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      onBlur={() => setPhoneTouched(true)}
                      placeholder="WhatsApp Phone: 9876543210"
                      className="w-full h-10 pl-9 pr-3 rounded-xl border border-zinc-200 bg-white text-[13px] mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSendWa}
                    className="h-10 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-[12px] font-semibold flex items-center justify-center gap-1.5 shrink-0 transition shadow-sm"
                  >
                    <Smartphone className="h-4 w-4" /> Send Bill via WhatsApp
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Product Search & Fast Scanner Bar */}
          <div className="rounded-[22px] bg-white border border-zinc-200 p-4 md:p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-lg bg-zinc-900 text-white grid place-items-center text-[11px] font-bold">
                  2
                </span>
                <span className="font-bold text-[15px] text-zinc-900">Add Products</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenBarcodeScanner}
                  className="h-8 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[12px] font-semibold flex items-center gap-1.5 transition"
                >
                  <Barcode className="h-4 w-4" /> Scan Barcode
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAddProduct(productSearch)}
                  className="h-8 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[12px] font-semibold flex items-center gap-1.5 transition"
                >
                  <PackagePlus className="h-3.5 w-3.5" /> + Quick Product
                </button>
              </div>
            </div>

            {/* Instant Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Search by product name, barcode, SKU or HSN..."
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-zinc-200 bg-zinc-50/50 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
              />
              {filteredSearchProducts.length > 0 && (
                <div className="absolute z-20 top-12 left-0 right-0 rounded-2xl bg-white border border-zinc-200 shadow-2xl overflow-hidden divide-y divide-zinc-100 max-h-64 overflow-y-auto">
                  {filteredSearchProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addProductToInvoice(p)}
                      className="w-full p-3 flex items-center justify-between text-left hover:bg-zinc-50 transition"
                    >
                      <div>
                        <div className="font-semibold text-[13px] text-zinc-900">{p.name}</div>
                        <div className="text-[11px] text-zinc-400 mono">
                          HSN: {p.hsn} • Stock: {p.stock} {p.unit}
                          {p.barcode ? ` • Barcode: ${p.barcode}` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold mono text-[13px]">{formatCurrency(p.price)}</div>
                        <span className="text-[10px] text-indigo-600 font-semibold">+ Add</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Frequent Products Pills */}
            <div className="pt-1 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-zinc-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" /> Quick Add:
              </span>
              {frequentProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProductToInvoice(p)}
                  className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-medium transition"
                >
                  + {p.name} ({formatCurrency(p.price)})
                </button>
              ))}
            </div>
          </div>

          {/* 3. Items Cart Table */}
          <div className="rounded-[22px] bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-lg bg-zinc-900 text-white grid place-items-center text-[11px] font-bold">
                  3
                </span>
                <span className="font-bold text-[15px] text-zinc-900">
                  Cart Items ({items.length})
                </span>
              </div>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setItems([])}
                  className="text-[12px] text-red-600 hover:underline font-medium"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-3 py-3 text-center w-32">Qty</th>
                    <th className="px-3 py-3 text-right">Price</th>
                    <th className="px-3 py-3 text-center w-24">Disc %</th>
                    <th className="px-3 py-3 text-center">GST</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-3 py-3 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {items.map((it, idx) => {
                    const gross = it.price * it.qty;
                    const disc = (gross * (it.discount || 0)) / 100;
                    const taxable = gross - disc;
                    const gstAmt = (taxable * it.gst) / 100;
                    const total = taxable + gstAmt;

                    return (
                      <tr key={idx} className="hover:bg-zinc-50/50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-zinc-900">{it.name}</div>
                          <div className="text-[11px] text-zinc-400 mono">HSN: {it.hsn}</div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateItemQty(idx, it.qty - 1)}
                              className="h-8 w-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 grid place-items-center text-zinc-600 transition"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={it.qty}
                              onChange={(e) =>
                                updateItemQty(idx, parseInt(e.target.value) || 1)
                              }
                              className="w-12 h-8 text-center rounded-lg border border-zinc-200 font-bold mono text-[13px]"
                            />
                            <button
                              type="button"
                              onClick={() => updateItemQty(idx, it.qty + 1)}
                              className="h-8 w-8 rounded-lg bg-zinc-100 hover:bg-zinc-200 grid place-items-center text-zinc-600 transition"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right mono font-semibold">
                          {formatCurrency(it.price)}
                        </td>
                        <td className="px-3 py-3">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={it.discount || ""}
                            placeholder="0"
                            onChange={(e) =>
                              updateItemDiscount(idx, parseFloat(e.target.value) || 0)
                            }
                            className="w-16 h-8 text-center mx-auto rounded-lg border border-zinc-200 text-[12px] mono"
                          />
                        </td>
                        <td className="px-3 py-3 text-center mono font-medium text-zinc-600">
                          {it.gst}%
                        </td>
                        <td className="px-4 py-3 text-right mono font-bold text-zinc-900">
                          {formatCurrency(total)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="h-8 w-8 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 grid place-items-center transition"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-zinc-100">
              {items.map((it, idx) => {
                const gross = it.price * it.qty;
                const disc = (gross * (it.discount || 0)) / 100;
                const taxable = gross - disc;
                const gstAmt = (taxable * it.gst) / 100;
                const total = taxable + gstAmt;

                return (
                  <div key={idx} className="p-3.5 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-[13.5px] text-zinc-900">{it.name}</div>
                        <div className="text-[11px] text-zinc-400 mono">
                          Rate: {formatCurrency(it.price)} • HSN: {it.hsn} • GST: {it.gst}%
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="h-8 w-8 rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600 grid place-items-center"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {/* Large touch targets for Qty */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateItemQty(idx, it.qty - 1)}
                          className="h-10 w-10 rounded-xl bg-zinc-100 active:bg-zinc-200 grid place-items-center text-zinc-700"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={it.qty}
                          onChange={(e) =>
                            updateItemQty(idx, parseInt(e.target.value) || 1)
                          }
                          className="w-14 h-10 text-center rounded-xl border border-zinc-300 font-bold mono text-[14px]"
                        />
                        <button
                          type="button"
                          onClick={() => updateItemQty(idx, it.qty + 1)}
                          className="h-10 w-10 rounded-xl bg-zinc-100 active:bg-zinc-200 grid place-items-center text-zinc-700"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-zinc-400 uppercase">Item Total</div>
                        <div className="font-extrabold mono text-[15px] text-zinc-900">
                          {formatCurrency(total)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {items.length === 0 && (
              <div className="py-12 text-center text-zinc-400 text-[13px]">
                Search products above or click Quick Add pills to add items to this invoice.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Bill Summary & Payment (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-[24px] bg-zinc-900 text-white p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Bill Summary
                </span>
                <div className="font-mono text-[14px] text-zinc-300">{invoiceNo}</div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 text-zinc-300">
                {selectedCustomer ? selectedCustomer.state : settings.state}
              </span>
            </div>

            <div className="space-y-2 text-[13px] border-t border-zinc-800 pt-3">
              <div className="flex justify-between text-zinc-400">
                <span>Subtotal ({items.length} items)</span>
                <span className="mono font-medium text-white">
                  {formatCurrency(calculation.subtotal)}
                </span>
              </div>

              {calculation.discountTotal > 0 && (
                <div className="flex justify-between text-amber-400">
                  <span>Discount</span>
                  <span className="mono font-medium">- {formatCurrency(calculation.discountTotal)}</span>
                </div>
              )}

              <div className="flex justify-between text-zinc-400">
                <span>Taxable Amount</span>
                <span className="mono font-medium text-white">
                  {formatCurrency(calculation.taxableAmount)}
                </span>
              </div>

              {calculation.cgst > 0 ? (
                <>
                  <div className="flex justify-between text-[12px] text-zinc-400">
                    <span>CGST</span>
                    <span className="mono">{formatCurrency(calculation.cgst)}</span>
                  </div>
                  <div className="flex justify-between text-[12px] text-zinc-400">
                    <span>SGST</span>
                    <span className="mono">{formatCurrency(calculation.sgst)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-[12px] text-zinc-400">
                  <span>IGST</span>
                  <span className="mono">{formatCurrency(calculation.igst)}</span>
                </div>
              )}

              {calculation.roundOff !== 0 && (
                <div className="flex justify-between text-[12px] text-zinc-400">
                  <span>Round Off</span>
                  <span className="mono">
                    {calculation.roundOff > 0 ? "+" : ""}
                    {formatCurrency(calculation.roundOff)}
                  </span>
                </div>
              )}

              <div className="border-t border-zinc-800 pt-3 flex justify-between text-[20px] font-extrabold text-white">
                <span>Grand Total</span>
                <span className="mono">{formatCurrency(calculation.grandTotal)}</span>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="pt-2 border-t border-zinc-800 space-y-2.5">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Payment Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { m: "UPI" as PaymentMode, label: "UPI / QR", icon: Smartphone },
                  { m: "Cash" as PaymentMode, label: "Cash", icon: Banknote },
                  { m: "Card" as PaymentMode, label: "Card", icon: CreditCard },
                  { m: "Credit" as PaymentMode, label: "Credit (Due)", icon: Calendar },
                ].map(({ m, label, icon: Icon }) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setPaymentMode(m);
                      if (m === "Credit") setPaymentStatus("Pending");
                    }}
                    className={`h-11 rounded-xl flex items-center gap-2 px-3 text-[12px] font-semibold transition ${
                      paymentMode === m
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Status & Partial Paid */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {(["Paid", "Pending", "Partial"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPaymentStatus(s)}
                    className={`h-9 rounded-xl text-[12px] font-bold transition ${
                      paymentStatus === s
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {paymentStatus === "Partial" && (
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 uppercase">
                    Paid Amount (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={paidAmount}
                    onChange={(e) =>
                      setPaidAmount(
                        e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                      )
                    }
                    placeholder="Enter paid amount"
                    className="mt-1 w-full h-10 px-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 text-[13px] mono focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="pt-2 border-t border-zinc-800">
              <label className="text-[11px] font-bold text-zinc-400 uppercase">
                Invoice Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Delivery note, warranty remark..."
                className="mt-1 w-full h-10 px-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 text-[12px] focus:outline-none"
              />
            </div>

            {/* Desktop Save Action */}
            <button
              type="button"
              onClick={handleSave}
              className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[14px] flex items-center justify-center gap-2 transition shadow-lg"
            >
              <Save className="h-5 w-5" />
              {editingInvoice ? "Update Invoice" : "Save & Generate Invoice"}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky Mobile POS Bottom Bar (Phase 24 & 25) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-900 text-white p-3 border-t border-zinc-800 shadow-2xl flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] text-zinc-400 uppercase font-bold">Total Payable</div>
          <div className="text-[18px] font-extrabold mono text-white">
            {formatCurrency(calculation.grandTotal)}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="h-12 px-6 rounded-xl bg-indigo-600 active:bg-indigo-700 text-white font-bold text-[14px] flex items-center gap-2 shadow-lg"
        >
          <Save className="h-4 w-4" />
          <span>Save Bill</span>
        </button>
      </div>
    </div>
  );
}
