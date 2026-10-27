import React, { useState, useEffect, useRef } from "react";
import { Lock, X, AlertCircle, ShieldCheck } from "lucide-react";
import type { StaffMember } from "../types";
import { verifyStaffPin, ROLE_LABELS } from "../services/staffService";

export interface PinVerificationModalProps {
  isOpen: boolean;
  staff: StaffMember | null;
  allStaff?: StaffMember[];
  actionTitle: string;
  actionDescription?: string;
  onSuccess: (verifiedByStaff: StaffMember) => void;
  onClose: () => void;
}

export function PinVerificationModal({
  isOpen,
  staff,
  allStaff = [],
  actionTitle,
  actionDescription,
  onSuccess,
  onClose,
}: PinVerificationModalProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staff?.id || "");
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedStaffId(staff?.id || allStaff[0]?.id || "");
      setPin("");
      setError("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, staff, allStaff]);

  if (!isOpen) return null;

  const currentStaff = allStaff.find((s) => s.id === selectedStaffId) || staff;

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentStaff) {
      setError("Please select a staff member to verify.");
      return;
    }

    if (!pin.trim()) {
      setError("Please enter your security PIN.");
      return;
    }

    if (verifyStaffPin(currentStaff, pin)) {
      setError("");
      onSuccess(currentStaff);
    } else {
      setError("Invalid security PIN. Please try again.");
      setPin("");
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">Security Verification</h3>
              <p className="text-xs text-slate-500">{actionTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleVerify} className="p-6 space-y-4">
          {actionDescription && (
            <p className="text-sm text-slate-600 bg-amber-50/70 border border-amber-200/60 rounded-xl p-3">
              {actionDescription}
            </p>
          )}

          {allStaff.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Authorizing Staff Member
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => {
                  setSelectedStaffId(e.target.value);
                  setError("");
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
              >
                {allStaff
                  .filter((s) => s.status === "active")
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({ROLE_LABELS[s.role] || s.role})
                    </option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-700">
                Enter Security PIN
              </label>
              <span className="text-[11px] text-slate-400">
                Default: 1234 (Owner) / 2233 (Mgr)
              </span>
            </div>
            <input
              ref={inputRef}
              type="password"
              maxLength={8}
              inputMode="numeric"
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (error) setError("");
              }}
              className="w-full text-center text-2xl tracking-[0.4em] font-mono px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-600 text-xs bg-rose-50 border border-rose-200/60 p-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Authorize
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
