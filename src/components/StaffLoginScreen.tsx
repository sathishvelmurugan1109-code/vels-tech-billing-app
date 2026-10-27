import React, { useState, useEffect, useRef } from "react";
import {
  Building2,
  Users,
  Lock,
  ChevronRight,
  ArrowLeft,
  Delete,
  CheckCircle2,
  AlertCircle,
  Clock,
  Shield,
  KeyRound,
} from "lucide-react";
import { api } from "../services/apiService";
import { authService, type StaffSessionResponse } from "../services/authService";
import type { StaffMember, StaffRole } from "../types";
import { ROLE_LABELS } from "../services/staffService";
import logoImg from "../assets/profile-logo.jpeg";

export interface StaffLoginScreenProps {
  onAuthenticated: (session: StaffSessionResponse) => void;
}

interface BusinessOption {
  id: string;
  _id?: string;
  businessId: string;
  businessName: string;
  location?: string;
  logoText?: string;
  invoicePrefix?: string;
}

export function StaffLoginScreen({ onAuthenticated }: StaffLoginScreenProps) {
  // Step 1: Business Selection
  // Step 2: Staff Selection
  // Step 3: PIN Entry
  const [step, setStep] = useState<"business" | "staff" | "pin">("business");

  // Businesses state
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessOption | null>(null);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);

  // Staff state
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);

  // PIN state
  const [pin, setPin] = useState<string>("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string>("");
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch businesses on mount
  useEffect(() => {
    let alive = true;
    setLoadingBusinesses(true);
    api
      .getBusinesses()
      .then((list) => {
        if (!alive) return;
        setBusinesses(list);
        const lastBizId = authService.getLastBusinessId();
        const matched = list.find((b) => b.id === lastBizId || b._id === lastBizId);

        if (matched) {
          setSelectedBusiness(matched);
          loadStaffForBusiness(matched.id || matched._id);
          setStep("staff");
        } else if (list.length === 1) {
          setSelectedBusiness(list[0]);
          loadStaffForBusiness(list[0].id || list[0]._id);
          setStep("staff");
        } else {
          setStep("business");
        }
      })
      .catch((err) => {
        if (!alive) return;
        console.warn("Could not load businesses:", err);
        // Fallback default business
        const defaultBiz: BusinessOption = {
          id: "default-biz",
          businessId: "BIZ-001",
          businessName: "VELS TECH",
          location: "Veppur",
          invoicePrefix: "VELS-",
        };
        setBusinesses([defaultBiz]);
        setSelectedBusiness(defaultBiz);
        setStep("staff");
      })
      .finally(() => {
        if (alive) setLoadingBusinesses(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  // Handle countdown for lockout
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

  const loadStaffForBusiness = async (bizId: string) => {
    setLoadingStaff(true);
    setError("");
    try {
      const staffMembers = await api.getBusinessStaff(bizId);
      setStaffList(staffMembers || []);
    } catch (err: any) {
      console.warn("Could not load staff list:", err);
      setError("Unable to load staff list for selected business.");
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleSelectBusiness = (biz: BusinessOption) => {
    setSelectedBusiness(biz);
    authService.setLastBusinessId(biz.id || biz._id);
    loadStaffForBusiness(biz.id || biz._id);
    setStep("staff");
  };

  const handleSelectStaff = (staff: StaffMember) => {
    setSelectedStaff(staff);
    setPin("");
    setError("");
    setStep("pin");
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const handleKeyPress = (num: string) => {
    if (lockoutSeconds) return;
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError("");
      if (nextPin.length >= 4) {
        // Auto-verify if 4 or 6 digits entered
      }
    }
  };

  const handleDelete = () => {
    if (lockoutSeconds) return;
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  const handleClear = () => {
    if (lockoutSeconds) return;
    setPin("");
    setError("");
  };

  const handleSubmitPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedBusiness || !selectedStaff) return;
    if (pin.length < 4) {
      setError("Please enter your 4 to 6 digit security PIN.");
      return;
    }

    setVerifying(true);
    setError("");
    try {
      const bizId = selectedBusiness.id || selectedBusiness._id;
      const staffId = selectedStaff.id || selectedStaff._id || "";
      const session = await authService.loginWithPin(bizId, staffId, pin);
      onAuthenticated(session);
    } catch (err: any) {
      setPin("");
      const msg = err.message || "Invalid security PIN.";
      setError(msg);
      if (err.data?.locked || err.status === 429) {
        setLockoutSeconds(err.data?.remainingSeconds || 900);
      } else if (typeof err.data?.remainingAttempts === "number") {
        setRemainingAttempts(err.data.remainingAttempts);
      }
      setTimeout(() => inputRef.current?.focus(), 150);
    } finally {
      setVerifying(false);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "owner":
      case "admin":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "manager":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "cashier":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 select-none">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden transition-all duration-300">
        {/* Top Header Card */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 text-center relative">
          <div className="flex items-center justify-center gap-3 mb-2">
            <img
              src={logoImg}
              alt="Logo"
              className="w-12 h-12 rounded-2xl object-cover border-2 border-indigo-400/40 shadow-lg"
            />
            <div className="text-left">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                VELS TECH
              </h1>
              <p className="text-xs text-indigo-200 font-medium tracking-wide">
                ENTERPRISE BILLING & POS TERMINAL
              </p>
            </div>
          </div>

          {selectedBusiness && step !== "business" && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs mt-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>{selectedBusiness.businessName}</span>
              {selectedBusiness.location && <span>• {selectedBusiness.location}</span>}
            </div>
          )}
        </div>

        {/* STEP 1: BUSINESS SELECTOR */}
        {step === "business" && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-900">Select Business Terminal</h2>
              <p className="text-xs text-slate-500 mt-1">
                Choose an authorized branch or business to begin billing
              </p>
            </div>

            {loadingBusinesses ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Locating businesses...</span>
              </div>
            ) : businesses.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs">
                No active businesses found. Contact administrator.
              </div>
            ) : (
              <div className="grid gap-3 max-h-80 overflow-y-auto pr-1">
                {businesses.map((biz) => (
                  <button
                    key={biz.id || biz._id}
                    onClick={() => handleSelectBusiness(biz)}
                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/90 hover:border-indigo-500 hover:bg-indigo-50/50 transition-all text-left group shadow-xs hover:shadow-md"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-base border border-indigo-200/60 shrink-0 group-hover:scale-105 transition-transform">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-sm truncate">
                          {biz.businessName}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                            {biz.invoicePrefix || "INV-"}
                          </span>
                          {biz.location && <span>{biz.location}</span>}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: STAFF SELECTOR */}
        {step === "staff" && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep("business")}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Change Business
              </button>
              <span className="text-[11px] font-mono text-slate-400">
                {staffList.length} Active Staff
              </span>
            </div>

            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-900">Who is billing today?</h2>
              <p className="text-xs text-slate-500 mt-1">
                Select your staff profile to enter your security PIN
              </p>
            </div>

            {loadingStaff ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Loading staff accounts...</span>
              </div>
            ) : staffList.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <p>No active staff profiles found for this business.</p>
                <button
                  onClick={() => setStep("business")}
                  className="text-xs text-indigo-600 font-semibold underline"
                >
                  Return to business selection
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {staffList.map((staff) => (
                  <button
                    key={staff.id || staff._id}
                    onClick={() => handleSelectStaff(staff)}
                    className="flex items-center gap-3 p-3.5 rounded-2xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 transition-all text-left group shadow-xs hover:shadow-md"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 font-bold flex items-center justify-center text-sm border border-slate-200/80 shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {staff.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 text-xs truncate">
                        {staff.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-mono text-slate-500">
                          {staff.employeeCode}
                        </span>
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(
                            staff.role
                          )}`}
                        >
                          {ROLE_LABELS[staff.role] || staff.role}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: PIN KEYPAD & VERIFICATION */}
        {step === "pin" && selectedStaff && (
          <div className="p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setStep("staff")}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                Switch Staff
              </button>
              <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                Server PIN Protected
              </div>
            </div>

            {/* Selected Staff Badge */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                {selectedStaff.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 text-sm truncate">
                  {selectedStaff.name}
                </div>
                <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[11px]">{selectedStaff.employeeCode}</span>
                  <span>•</span>
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(
                      selectedStaff.role
                    )}`}
                  >
                    {ROLE_LABELS[selectedStaff.role] || selectedStaff.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Masked PIN Display */}
            <div className="text-center space-y-3">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Enter Security PIN
              </div>

              {/* Hidden input for physical keyboard entry */}
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  if (lockoutSeconds) return;
                  const val = e.target.value.replace(/\D/g, "");
                  setPin(val);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && pin.length >= 4) {
                    handleSubmitPin();
                  }
                }}
                className="opacity-0 absolute -z-10 w-0 h-0"
                autoFocus
              />

              {/* Visual PIN Dots */}
              <div
                onClick={() => inputRef.current?.focus()}
                className="flex items-center justify-center gap-3 py-2 cursor-pointer"
              >
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const filled = idx < pin.length;
                  return (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full transition-all duration-150 ${
                        filled
                          ? "bg-indigo-600 scale-110 shadow-sm shadow-indigo-300"
                          : "border-2 border-slate-300 bg-slate-100"
                      }`}
                    />
                  );
                })}
              </div>

              {/* Error & Lockout Notification */}
              {lockoutSeconds ? (
                <div className="flex items-center justify-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium">
                  <Clock className="w-4 h-4 animate-pulse shrink-0" />
                  <span>
                    Account locked. Retry in {Math.floor(lockoutSeconds / 60)}m {lockoutSeconds % 60}s
                  </span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}
            </div>

            {/* Tactile Touch Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-xs mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={verifying || !!lockoutSeconds}
                  onClick={() => handleKeyPress(String(n))}
                  className="h-13 rounded-2xl bg-slate-100 hover:bg-indigo-50 active:bg-indigo-100 text-slate-800 hover:text-indigo-700 font-bold text-xl border border-slate-200/60 transition-all shadow-xs active:scale-95 disabled:opacity-50"
                >
                  {n}
                </button>
              ))}

              <button
                type="button"
                disabled={verifying || !!lockoutSeconds}
                onClick={handleClear}
                className="h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-500 font-semibold text-xs border border-slate-200/60 transition-all active:scale-95 disabled:opacity-50 uppercase tracking-wider"
              >
                Clear
              </button>

              <button
                type="button"
                disabled={verifying || !!lockoutSeconds}
                onClick={() => handleKeyPress("0")}
                className="h-13 rounded-2xl bg-slate-100 hover:bg-indigo-50 active:bg-indigo-100 text-slate-800 hover:text-indigo-700 font-bold text-xl border border-slate-200/60 transition-all shadow-xs active:scale-95 disabled:opacity-50"
              >
                0
              </button>

              <button
                type="button"
                disabled={verifying || !!lockoutSeconds}
                onClick={handleDelete}
                className="h-13 rounded-2xl bg-slate-50 hover:bg-red-50 active:bg-red-100 text-slate-600 hover:text-red-600 font-semibold flex items-center justify-center border border-slate-200/60 transition-all active:scale-95 disabled:opacity-50"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={pin.length < 4 || verifying || !!lockoutSeconds}
              onClick={() => handleSubmitPin()}
              className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {verifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying PIN...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Unlock Billing Dashboard</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 text-center text-xs text-slate-400">
        VELS TECH ENTERPRISE BILLING • CLOUD MULTI-DEVICE SYNCHRONIZED
      </div>
    </div>
  );
}
