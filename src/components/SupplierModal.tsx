import React, { useState } from "react";
import { X, Truck, AlertCircle } from "lucide-react";
import { INDIAN_STATES } from "./CustomerModal";
import type { Supplier } from "../types";

export interface SupplierModalProps {
  supplier: Supplier | null;
  defaultState?: string;
  onSave: (supplierData: Omit<Supplier, "id"> & { id?: string }) => void;
  onClose: () => void;
}

export function SupplierModal({
  supplier,
  defaultState = "Tamil Nadu",
  onSave,
  onClose,
}: SupplierModalProps) {
  const [name, setName] = useState(supplier?.name || "");
  const [phone, setPhone] = useState(supplier?.phone || "");
  const [email, setEmail] = useState(supplier?.email || "");
  const [gstin, setGstin] = useState(supplier?.gstin || "");
  const [address, setAddress] = useState(supplier?.address || "");
  const [state, setState] = useState(supplier?.state || defaultState);
  const [openingBalance, setOpeningBalance] = useState<number | "">(
    supplier?.openingBalance !== undefined ? supplier.openingBalance : "",
  );
  const [notes, setNotes] = useState(supplier?.notes || "");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Supplier Name is required");
      return;
    }

    onSave({
      id: supplier?.id,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      gstin: gstin.trim().toUpperCase() || undefined,
      address: address.trim(),
      state: state.trim() || defaultState,
      openingBalance:
        typeof openingBalance === "number"
          ? openingBalance
          : openingBalance !== ""
          ? parseFloat(String(openingBalance)) || 0
          : 0,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[80] bg-zinc-900/60 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto">
      <div className="w-full max-w-[560px] rounded-[24px] bg-white border border-zinc-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-violet-50 text-violet-700 grid place-items-center font-bold">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold text-[17px] text-zinc-900">
                {supplier ? "Edit Supplier" : "Add New Supplier"}
              </div>
              <div className="text-[11px] text-zinc-500">
                Vendor contact, state of supply, and GSTIN
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-zinc-600 uppercase">
                SUPPLIER / VENDOR NAME *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Tiruppur Tech Distributors"
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">PHONE NUMBER</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">STATE</label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white focus:outline-none"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">GSTIN (OPTIONAL)</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="33ABCDE1234F1Z5"
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono uppercase focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">
                OPENING BALANCE (₹)
              </label>
              <input
                type="number"
                step="any"
                value={openingBalance}
                onChange={(e) =>
                  setOpeningBalance(
                    e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                  )
                }
                placeholder="0.00 (Amount owed to vendor)"
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-zinc-600 uppercase">EMAIL (OPTIONAL)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vendor@distributor.com"
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-zinc-600 uppercase">VENDOR ADDRESS</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="Warehouse / Office address"
                className="mt-1 w-full p-3 rounded-xl border border-zinc-200 text-[13px] focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 flex gap-2">
            <button
              type="submit"
              className="flex-1 h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-[13px] transition"
            >
              {supplier ? "Save Changes" : "Create Supplier"}
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
