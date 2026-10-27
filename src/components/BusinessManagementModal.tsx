import React, { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Check,
  X,
  Shield,
  MapPin,
  FileText,
  Phone,
  Mail,
  RefreshCw,
  Power,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { api } from "../services/apiService";
import { authService } from "../services/authService";

export interface BusinessManagementModalProps {
  isOpen: boolean;
  currentBusinessId: string;
  onClose: () => void;
  onSwitchBusiness: (business: any) => void;
}

export function BusinessManagementModal({
  isOpen,
  currentBusinessId,
  onClose,
  onSwitchBusiness,
}: BusinessManagementModalProps) {
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create Form State
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [gstin, setGstin] = useState("");
  const [state, setState] = useState("Tamil Nadu");
  const [address, setAddress] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("");
  const [initialStaffPin, setInitialStaffPin] = useState("1234");
  const [creating, setCreating] = useState(false);

  const fetchBusinesses = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await api.listAllBusinesses();
      setBusinesses(list || []);
    } catch (err: any) {
      console.warn("Could not load businesses:", err);
      setError("Unable to load businesses list from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBusinesses();
      setActiveTab("list");
      setError("");
      setSuccessMsg("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Business name is required.");
      return;
    }

    if (initialStaffPin && !/^\d{4,6}$/.test(initialStaffPin.trim())) {
      setError("Initial staff PIN must be 4 to 6 numeric digits.");
      return;
    }

    setCreating(true);
    setError("");
    try {
      const prefix = invoicePrefix.trim() || `${name.trim().slice(0, 4).toUpperCase()}-`;
      const res = await api.createBusiness({
        businessName: name.trim(),
        ownerName: ownerName.trim() || "Owner",
        phone: phone.trim(),
        email: email.trim(),
        initialStaffPin: initialStaffPin.trim() || "1234",
        settings: {
          companyName: name.trim(),
          address: address.trim(),
          gstin: gstin.trim(),
          state: state.trim(),
          phone: phone.trim(),
          email: email.trim(),
          invoicePrefix: prefix,
          startingInvoiceNo: 1,
          autoInvoiceNo: true,
          currency: "INR",
          roundOff: true,
          showGst: true,
        },
      });

      setSuccessMsg(`Business "${name.trim()}" created successfully!`);
      // Reset form
      setName("");
      setOwnerName("");
      setPhone("");
      setEmail("");
      setGstin("");
      setAddress("");
      setInvoicePrefix("");
      setInitialStaffPin("1234");
      await fetchBusinesses();
      setActiveTab("list");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to create business.");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (biz: any) => {
    const nextStatus = biz.status === "active" ? "inactive" : "active";
    try {
      await api.updateBusinessStatus(biz.id || biz._id, nextStatus);
      await fetchBusinesses();
    } catch (err: any) {
      setError(err.message || "Failed to update business status.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg shadow-xs">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Multi-Business Management</h3>
              <p className="text-xs text-slate-500">
                Manage independent tenant businesses, tax profiles, and branch switching
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-100 px-6 pt-3 gap-6 bg-white">
          <button
            onClick={() => setActiveTab("list")}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "list"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Registered Businesses ({businesses.length})
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "create"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Plus className="w-4 h-4" />
            Register New Business
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* CONTENT */}
        <div className="p-6">
          {activeTab === "list" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Available Branches & Tenants</span>
                <button
                  onClick={fetchBusinesses}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs">Loading businesses...</div>
              ) : businesses.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">No registered businesses.</div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
                  {businesses.map((b) => {
                    const isCurrent = (b.id || b._id) === currentBusinessId;
                    const isActive = b.status === "active";
                    return (
                      <div
                        key={b.id || b._id}
                        className={`py-4 px-3 rounded-2xl transition flex items-center justify-between gap-4 ${
                          isCurrent ? "bg-indigo-50/70 border border-indigo-200" : "hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                              isCurrent
                                ? "bg-indigo-600 text-white border-indigo-700"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm truncate">
                                {b.businessName}
                              </h4>
                              {isCurrent && (
                                <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-300">
                                  Current
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                  isActive
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-red-50 text-red-700 border-red-200"
                                }`}
                              >
                                {b.status}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                              <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.2 rounded">
                                Code: {b.businessId || b.settings?.invoicePrefix || "N/A"}
                              </span>
                              {b.settings?.gstin && (
                                <span className="font-mono text-[11px]">
                                  GSTIN: {b.settings.gstin}
                                </span>
                              )}
                              {b.ownerName && <span>Owner: {b.ownerName}</span>}
                              {b.settings?.state && <span>Loc: {b.settings.state}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isCurrent && isActive && (
                            <button
                              onClick={() => {
                                onSwitchBusiness(b);
                                onClose();
                              }}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1"
                            >
                              <span>Switch</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            title={isActive ? "Deactivate Business" : "Activate Business"}
                            onClick={() => handleToggleStatus(b)}
                            className={`p-2 rounded-xl border transition ${
                              isActive
                                ? "text-slate-400 hover:text-red-600 hover:bg-red-50 border-slate-200"
                                : "text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "create" && (
            <form onSubmit={handleCreateBusiness} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business / Store Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vels Tech Chennai Branch"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Owner / Administrator Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sathish Velmurugan"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invoice Prefix (e.g. VELS-, CHEN-)
                  </label>
                  <input
                    type="text"
                    placeholder="INV-"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Initial Administrator PIN (4-6 digits) *
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    required
                    placeholder="1234"
                    value={initialStaffPin}
                    onChange={(e) => setInitialStaffPin(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    placeholder="33AABCV1234F1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    placeholder="Tamil Nadu"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    placeholder="branch@velstech.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Branch Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Address details for invoices..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab("list")}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-md shadow-indigo-200 disabled:opacity-50"
                >
                  {creating ? "Creating Business..." : "Create Business"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
