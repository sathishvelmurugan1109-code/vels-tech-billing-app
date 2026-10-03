import React from "react";
import { AlertTriangle, Clock, ShieldAlert, ArrowRight, X, CheckCircle, Database } from "lucide-react";
import { formatCurrency } from "../services/money";
import type { Product, Invoice, Customer } from "../types";

export interface NotificationsPopoverProps {
  products: Product[];
  invoices: Invoice[];
  customers: Customer[];
  lastBackupDate?: string | null;
  onNavigateToProducts: () => void;
  onNavigateToInvoices: () => void;
  onNavigateToSettings: () => void;
  onClose: () => void;
}

export function NotificationsPopover({
  products,
  invoices,
  customers,
  lastBackupDate,
  onNavigateToProducts,
  onNavigateToInvoices,
  onNavigateToSettings,
  onClose,
}: NotificationsPopoverProps) {
  // Alert detections
  const outOfStockProducts = products.filter((p) => p.stock <= 0);
  const lowStockProducts = products.filter((p) => p.stock > 0 && p.stock <= (p.lowStockLimit || 10));

  const pendingInvoices = invoices.filter(
    (inv) => inv.status !== "Cancelled" && inv.paymentStatus === "Pending",
  );
  const totalPendingAmt = pendingInvoices.reduce(
    (sum, inv) => sum + (inv.grandTotal - inv.paidAmount),
    0,
  );

  // Backup check: alert if no backup ever or older than 7 days
  const backupDaysAgo = lastBackupDate
    ? Math.floor((Date.now() - new Date(lastBackupDate).getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  const showBackupReminder = backupDaysAgo > 7;

  const totalAlertCount =
    outOfStockProducts.length +
    lowStockProducts.length +
    (pendingInvoices.length > 0 ? 1 : 0) +
    (showBackupReminder ? 1 : 0);

  return (
    <div className="absolute right-0 top-12 z-50 w-[360px] rounded-2xl bg-white border border-zinc-200 shadow-2xl overflow-hidden text-zinc-900">
      <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/60">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[14px]">Alerts & Notifications</span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
            {totalAlertCount}
          </span>
        </div>
        <button onClick={onClose} className="h-7 w-7 grid place-items-center rounded-lg hover:bg-zinc-200/60">
          <X className="h-4 w-4 text-zinc-500" />
        </button>
      </div>

      <div className="p-3 max-h-[380px] overflow-y-auto space-y-2.5">
        {totalAlertCount === 0 && (
          <div className="py-8 text-center text-zinc-400 text-[12px] flex flex-col items-center gap-2">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
            <span>Everything is running smoothly! No alerts.</span>
          </div>
        )}

        {/* Out of stock */}
        {outOfStockProducts.length > 0 && (
          <div
            onClick={() => {
              onClose();
              onNavigateToProducts();
            }}
            className="p-3 rounded-xl bg-red-50 border border-red-200 hover:bg-red-100/70 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-red-900 font-semibold text-[13px]">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-red-600" /> {outOfStockProducts.length} Item(s) Out of Stock
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-red-500" />
            </div>
            <div className="text-[11px] text-red-700 mt-1 line-clamp-1">
              {outOfStockProducts.map((p) => p.name).join(", ")}
            </div>
          </div>
        )}

        {/* Low stock */}
        {lowStockProducts.length > 0 && (
          <div
            onClick={() => {
              onClose();
              onNavigateToProducts();
            }}
            className="p-3 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100/70 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-amber-900 font-semibold text-[13px]">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-amber-600" /> {lowStockProducts.length} Low Stock Alert(s)
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-amber-600" />
            </div>
            <div className="text-[11px] text-amber-700 mt-1 line-clamp-1">
              {lowStockProducts.map((p) => `${p.name} (${p.stock} left)`).join(", ")}
            </div>
          </div>
        )}

        {/* Pending payments */}
        {pendingInvoices.length > 0 && (
          <div
            onClick={() => {
              onClose();
              onNavigateToInvoices();
            }}
            className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100/70 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-indigo-900 font-semibold text-[13px]">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-indigo-600" /> {pendingInvoices.length} Pending Invoice(s)
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-indigo-500" />
            </div>
            <div className="text-[11px] text-indigo-700 mt-1">
              Outstanding total: <strong>{formatCurrency(totalPendingAmt)}</strong> to collect
            </div>
          </div>
        )}

        {/* Backup reminder */}
        {showBackupReminder && (
          <div
            onClick={() => {
              onClose();
              onNavigateToSettings();
            }}
            className="p-3 rounded-xl bg-zinc-100 border border-zinc-300 hover:bg-zinc-200/70 transition cursor-pointer"
          >
            <div className="flex items-center justify-between text-zinc-900 font-semibold text-[13px]">
              <span className="flex items-center gap-1.5">
                <Database className="h-4 w-4 text-zinc-600" /> Data Backup Reminder
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-zinc-500" />
            </div>
            <div className="text-[11px] text-zinc-600 mt-1">
              {lastBackupDate
                ? `Last backed up ${backupDaysAgo} days ago. Export a backup now.`
                : "No recent backup found. Save a local backup file."}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
