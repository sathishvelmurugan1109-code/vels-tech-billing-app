import { X } from "lucide-react";
import type { Business } from "../api";

export default function Detail({ b, onClose, onToggle }: { b: Business; onClose: () => void; onToggle: () => void }) {
  const rows: [string, string][] = [
    ["Owner", b.ownerName],
    ["Phone", b.phone],
    ["Email", b.email],
    ["Status", b.status],
    ["Plan", b.plan],
    ["Business Registration Date", new Date(b.registeredAt).toLocaleString()],
    ["Last Active Date", new Date(b.lastActiveAt).toLocaleString()],
    ["Last login", b.lastLoginAt ? new Date(b.lastLoginAt).toLocaleString() : "—"],
  ];
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0b1120] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <div className="text-lg font-extrabold text-white">{b.businessName}</div>
            <div className="text-xs text-slate-400">{b.businessId} • {b.plan} plan</div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          {rows.map(([k, v]) => (
            <div key={k} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-slate-500">{k}</div>
              <div className="mt-1 font-semibold text-white">{v}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          {[["Invoices", b.usage.invoices], ["Products", b.usage.products], ["Customers", b.usage.customers]].map(([k, v]) => (
            <div key={k as string} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
              <div className="text-xl font-extrabold text-white">{v}</div>
              <div className="text-[11px] text-slate-500">{k}</div>
            </div>
          ))}
        </div>
        <button onClick={onToggle}
          className={`mt-4 h-11 w-full rounded-xl text-sm font-bold text-white ${b.status === "active" ? "bg-amber-600 hover:bg-amber-500" : "bg-emerald-600 hover:bg-emerald-500"}`}>
          {b.status === "active" ? "Deactivate account" : "Activate account"}
        </button>
      </div>
    </div>
  );
}
