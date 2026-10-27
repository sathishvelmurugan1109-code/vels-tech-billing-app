import React, { useState, useEffect, useRef } from "react";
import { Lock, X, AlertCircle, ShieldCheck, Clock, Delete } from "lucide-react";
import type { StaffMember } from "../types";
import { ROLE_LABELS, verifyStaffPinServer } from "../services/staffService";

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
  const [selectedStaffId, setSelectedStaffId] = useState<string>(staff?.id || (staff as any)?._id || "");
  const [pin, setPin] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [verifying, setVerifying] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedStaffId(staff?.id || (staff as any)?._id || allStaff[0]?.id || (allStaff[0] as any)?._id || "");
      setPin("");
      setError("");
      setVerifying(false);
      setLockoutSeconds(null);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen, staff, allStaff]);

  useEffect(() => {
    if (!lockoutSeconds || lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (!prev || prev <= 1) {
          clearInterval(interval);
          setError("");
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  if (!isOpen) return null;

  const currentStaff = allStaff.find((s) => (s.id || (s as any)._id) === selectedStaffId) || staff;

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentStaff) {
      setError("Please select a staff member to authorize this action.");
      return;
    }

    if (!pin.trim() || pin.length < 4) {
      setError("Please enter your 4 to 6 digit security PIN.");
      return;
    }

    setVerifying(true);
    setError("");

    try {
      const targetId = currentStaff.id || (currentStaff as any)._id;
      const res = await verifyStaffPinServer(pin, targetId);

      if (res.valid) {
        setError("");
        onSuccess(res.staff || currentStaff);
        onClose();
      } else {
        setError(res.message || "Invalid security PIN. Please try again.");
        setPin("");
        inputRef.current?.focus();
      }
    } catch (err: any) {
      const msg = err.message || "Invalid security PIN.";
      setError(msg);
      if (err.data?.locked || err.status === 429) {
        setLockoutSeconds(err.data?.remainingSeconds || 900);
      }
      setPin("");
      inputRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleKeyPress = (digit: string) => {
    if (lockoutSeconds) return;
    if (pin.length < 6) {
      setPin((prev) => prev + digit);
      setError("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Security Verification</h3>
              <p className="text-xs text-slate-500">{actionTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleVerify} className="p-6 space-y-4">
          {actionDescription && (
            <p className="text-xs text-slate-600 bg-amber-50/70 border border-amber-200/60 rounded-2xl p-3 leading-relaxed">
              {actionDescription}
            </p>
          )}

          {allStaff.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Authorizing Staff Member
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => {
                  setSelectedStaffId(e.target.value);
                  setPin("");
                  setError("");
                }}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                {allStaff
                  .filter((s) => s.status === "active")
                  .map((s) => (
                    <option key={s.id || (s as any)._id} value={s.id || (s as any)._id}>
                      {s.name} ({s.employeeCode}) — {ROLE_LABELS[s.role] || s.role}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Masked PIN Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Enter Security PIN</label>
              <span className="text-[11px] text-slate-400 font-mono">4-6 Digits</span>
            </div>

            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                if (lockoutSeconds) return;
                setPin(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              className="w-full px-3.5 py-2.5 text-center text-lg tracking-widest font-mono border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
              placeholder="••••"
            />
          </div>

          {/* Lockout or Error Banner */}
          {lockoutSeconds ? (
            <div className="flex items-center justify-center gap-2 p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
              <Clock className="w-4 h-4 animate-pulse shrink-0" />
              <span>Retry in {Math.floor(lockoutSeconds / 60)}m {lockoutSeconds % 60}s</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Touch Keypad */}
          <div className="grid grid-cols-3 gap-2 pt-1 max-w-xs mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                type="button"
                disabled={verifying || !!lockoutSeconds}
                onClick={() => handleKeyPress(String(n))}
                className="h-11 rounded-xl bg-slate-100 hover:bg-indigo-50 active:bg-indigo-100 text-slate-800 font-bold text-base border border-slate-200/60 transition shadow-xs active:scale-95 disabled:opacity-50"
              >
                {n}
              </button>
            ))}
            <button
              type="button"
              disabled={verifying || !!lockoutSeconds}
              onClick={() => setPin("")}
              className="h-11 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 font-semibold text-xs border border-slate-200/60 transition active:scale-95 disabled:opacity-50 uppercase tracking-wider"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={verifying || !!lockoutSeconds}
              onClick={() => handleKeyPress("0")}
              className="h-11 rounded-xl bg-slate-100 hover:bg-indigo-50 active:bg-indigo-100 text-slate-800 font-bold text-base border border-slate-200/60 transition shadow-xs active:scale-95 disabled:opacity-50"
            >
              0
            </button>
            <button
              type="button"
              disabled={verifying || !!lockoutSeconds}
              onClick={() => setPin((prev) => prev.slice(0, -1))}
              className="h-11 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 font-semibold flex items-center justify-center border border-slate-200/60 transition active:scale-95 disabled:opacity-50"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pin.length < 4 || verifying || !!lockoutSeconds}
              className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-md shadow-indigo-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {verifying ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm Authorization</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
