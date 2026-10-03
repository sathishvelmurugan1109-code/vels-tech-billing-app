import React from "react";
import {
  Receipt,
  PackagePlus,
  UserPlus,
  CreditCard,
  ArrowDownToLine,
  SlidersHorizontal,
  RotateCcw,
  Truck,
  DollarSign,
  X,
} from "lucide-react";

export interface QuickActionsModalProps {
  onNewInvoice: () => void;
  onAddProduct: () => void;
  onAddCustomer: () => void;
  onReceivePayment: () => void;
  onStockIn: () => void;
  onStockAdjustment: () => void;
  onSalesReturn: () => void;
  onPurchaseEntry: () => void;
  onAddExpense: () => void;
  onClose: () => void;
}

export function QuickActionsModal({
  onNewInvoice,
  onAddProduct,
  onAddCustomer,
  onReceivePayment,
  onStockIn,
  onStockAdjustment,
  onSalesReturn,
  onPurchaseEntry,
  onAddExpense,
  onClose,
}: QuickActionsModalProps) {
  const actions = [
    {
      title: "New Invoice",
      desc: "Create GST / cash bill",
      icon: Receipt,
      color: "bg-indigo-600 text-white",
      badge: "Fast POS",
      action: onNewInvoice,
    },
    {
      title: "Receive Payment",
      desc: "Record customer payment",
      icon: CreditCard,
      color: "bg-emerald-600 text-white",
      action: onReceivePayment,
    },
    {
      title: "Add Product",
      desc: "New item in inventory",
      icon: PackagePlus,
      color: "bg-zinc-900 text-white",
      action: onAddProduct,
    },
    {
      title: "Add Customer",
      desc: "New buyer profile",
      icon: UserPlus,
      color: "bg-blue-600 text-white",
      action: onAddCustomer,
    },
    {
      title: "Stock In / Restock",
      desc: "Quickly increase stock",
      icon: ArrowDownToLine,
      color: "bg-teal-600 text-white",
      action: onStockIn,
    },
    {
      title: "Stock Adjustment",
      desc: "Damage, expiry, recount",
      icon: SlidersHorizontal,
      color: "bg-amber-600 text-white",
      action: onStockAdjustment,
    },
    {
      title: "Sales Return",
      desc: "Return items & refund",
      icon: RotateCcw,
      color: "bg-rose-600 text-white",
      action: onSalesReturn,
    },
    {
      title: "Purchase Entry",
      desc: "Inward goods from supplier",
      icon: Truck,
      color: "bg-violet-600 text-white",
      action: onPurchaseEntry,
    },
    {
      title: "Record Expense",
      desc: "Rent, electricity, salary",
      icon: DollarSign,
      color: "bg-orange-600 text-white",
      action: onAddExpense,
    },
  ];

  return (
    <div className="fixed inset-0 z-[80] bg-zinc-900/60 backdrop-blur-sm grid place-items-center md:place-items-center p-4">
      <div className="w-full max-w-[560px] rounded-[24px] bg-white border border-zinc-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <div className="font-extrabold text-[18px] text-zinc-900">Quick Actions</div>
            <div className="text-[12px] text-zinc-500">Fast shopkeeper shortcuts</div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Grid */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[75vh] overflow-y-auto">
          {actions.map((act, i) => (
            <button
              key={i}
              onClick={() => {
                onClose();
                act.action();
              }}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-left transition group"
            >
              <div
                className={`h-11 w-11 rounded-xl grid place-items-center shrink-0 ${act.color} shadow-sm`}
              >
                <act.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-[14px] text-zinc-900 group-hover:text-indigo-600 transition">
                    {act.title}
                  </span>
                  {act.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                      {act.badge}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-500 truncate">{act.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
