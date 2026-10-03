import React, { useState } from "react";
import {
  Building2,
  Receipt,
  CreditCard,
  Percent,
  Database,
  Check,
  AlertCircle,
  Download,
  Upload,
  RefreshCw,
  QrCode,
  Shield,
  Trash2,
} from "lucide-react";
import { INDIAN_STATES } from "../components/CustomerModal";
import type { CompanySettings } from "../types";

export interface SettingsPageProps {
  settings: CompanySettings;
  onUpdateSettings: (newSettings: CompanySettings) => void;
  onExportBackup: () => void;
  onImportBackup: () => void;
  onResetData: () => void;
}

export function SettingsPage({
  settings,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
  onResetData,
}: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<
    "business" | "invoice" | "tax" | "payments" | "backup"
  >("business");

  const [form, setForm] = useState<CompanySettings>(settings);
  const [logoError, setLogoError] = useState("");
  const [upiQrError, setUpiQrError] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  const updateField = (key: keyof CompanySettings, value: any) => {
    setForm((prev) => {
      const updated = { ...prev, [key]: value };
      onUpdateSettings(updated);
      return updated;
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const compressImage = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Invalid image"));
        img.onload = () => {
          const maxSide = 512;
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Canvas unsupported"));
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/webp", 0.85));
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });

  const handleLogoSelect = async (file: File | undefined) => {
    setLogoError("");
    if (!file) return;
    const okTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!okTypes.includes(file.type)) {
      setLogoError("Only PNG, JPG, JPEG or WEBP allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("Max file size is 2MB.");
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      updateField("logo", dataUrl);
    } catch {
      setLogoError("Could not process logo image. Try another file.");
    }
  };

  const handleUpiQrSelect = async (file: File | undefined) => {
    setUpiQrError("");
    if (!file) return;
    const okTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!okTypes.includes(file.type)) {
      setUpiQrError("Only PNG, JPG, JPEG or WEBP allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUpiQrError("Max file size is 2MB.");
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      updateField("upiQr", dataUrl);
    } catch {
      setUpiQrError("Could not process QR image. Try another file.");
    }
  };

  const tabs = [
    { id: "business", label: "Business Details", icon: Building2 },
    { id: "invoice", label: "Invoice Configuration", icon: Receipt },
    { id: "payments", label: "Payment & UPI QR", icon: CreditCard },
    { id: "tax", label: "Tax & GST", icon: Percent },
    { id: "backup", label: "Backup & Data Safety", icon: Database },
  ];

  return (
    <div className="max-w-[800px] space-y-4">
      {/* Top Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide bg-white border border-zinc-200 p-1.5 rounded-2xl shadow-sm">
        {tabs.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3.5 py-2 rounded-xl text-[12.5px] font-semibold flex items-center gap-1.5 shrink-0 transition ${
                active
                  ? "bg-zinc-900 text-white shadow-sm"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12px] flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Settings saved automatically to local storage.</span>
        </div>
      )}

      {/* Tab 1: Business Details */}
      {activeTab === "business" && (
        <div className="rounded-[22px] bg-white border border-zinc-200 p-6 shadow-sm space-y-5">
          <div>
            <h3 className="font-extrabold text-[16px] text-zinc-900">Company & Shop Profile</h3>
            <p className="text-[12px] text-zinc-500 mt-0.5">
              These details appear on your printed invoices, tax headers, and WhatsApp messages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-zinc-600 uppercase">
                LEGAL BUSINESS NAME
              </label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">GSTIN NUMBER</label>
              <input
                type="text"
                value={form.gstin}
                onChange={(e) => updateField("gstin", e.target.value.toUpperCase())}
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono uppercase focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">PRIMARY STATE</label>
              <select
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-zinc-200 text-[13px] bg-white focus:outline-none"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-zinc-600 uppercase">OFFICE ADDRESS</label>
              <textarea
                rows={2}
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                className="mt-1 w-full p-3 rounded-xl border border-zinc-200 text-[13px] focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">PHONE / CONTACT</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">EMAIL ADDRESS</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] focus:outline-none"
              />
            </div>

            {/* Invoice Company Logo Upload */}
            <div className="md:col-span-2 pt-2 border-t border-zinc-100">
              <label className="text-[11px] font-bold text-zinc-600 uppercase block mb-1">
                INVOICE HEADER LOGO
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-zinc-200 bg-zinc-50/50">
                <div className="h-20 w-20 rounded-xl bg-white border border-zinc-200 grid place-items-center overflow-hidden shrink-0">
                  {form.logo ? (
                    <img src={form.logo} alt="Company logo preview" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-[11px] font-bold text-zinc-400">Default Logo</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-zinc-900">
                    {form.logo ? "Custom Logo Configured" : "Using Default Vels Tech Logo"}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    PNG, JPG, WEBP • Max 2MB • Embedded directly into PDF and printouts
                  </div>
                  {logoError && <div className="text-[11px] text-red-600 mt-1">{logoError}</div>}
                  <div className="mt-2.5 flex gap-2">
                    <label className="h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[12px] font-semibold flex items-center justify-center cursor-pointer shadow-sm">
                      {form.logo ? "Change Logo" : "Upload Custom Logo"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          handleLogoSelect(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {form.logo && (
                      <button
                        onClick={() => {
                          if (confirm("Restore default logo?")) {
                            updateField("logo", "");
                          }
                        }}
                        className="h-9 px-3 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-[12px] text-zinc-700"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Invoice Configuration (Phase 15) */}
      {activeTab === "invoice" && (
        <div className="rounded-[22px] bg-white border border-zinc-200 p-6 shadow-sm space-y-5">
          <div>
            <h3 className="font-extrabold text-[16px] text-zinc-900">Invoice Settings & Layout</h3>
            <p className="text-[12px] text-zinc-500 mt-0.5">
              Customize numbering, terms, round-off and visible invoice columns.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">INVOICE PREFIX</label>
              <input
                type="text"
                value={form.invoicePrefix || "VELS-"}
                onChange={(e) => updateField("invoicePrefix", e.target.value)}
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">STARTING NUMBER</label>
              <input
                type="number"
                min="1"
                value={form.startingInvoiceNo || 1}
                onChange={(e) => updateField("startingInvoiceNo", parseInt(e.target.value) || 1)}
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">CURRENCY SYMBOL</label>
              <input
                type="text"
                value={form.currency || "₹"}
                onChange={(e) => updateField("currency", e.target.value)}
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono focus:outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-[11px] font-bold text-zinc-600 uppercase">
                STANDARD TERMS & CONDITIONS
              </label>
              <textarea
                rows={4}
                value={form.invoiceTerms}
                onChange={(e) => updateField("invoiceTerms", e.target.value)}
                className="mt-1 w-full p-3 rounded-xl border border-zinc-200 text-[12px] font-mono leading-relaxed focus:outline-none"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-[11px] font-bold text-zinc-600 uppercase">FOOTER MESSAGE</label>
              <input
                type="text"
                value={form.footerMessage || ""}
                onChange={(e) => updateField("footerMessage", e.target.value)}
                placeholder="e.g. This is a computer generated invoice. Thank you for shopping with us!"
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Payment & UPI QR (Phase 14) */}
      {activeTab === "payments" && (
        <div className="rounded-[22px] bg-white border border-zinc-200 p-6 shadow-sm space-y-5">
          <div>
            <h3 className="font-extrabold text-[16px] text-zinc-900">UPI & QR Code Payments</h3>
            <p className="text-[12px] text-zinc-500 mt-0.5">
              Set up your UPI Virtual Payment Address (VPA) and QR code for customer payments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">UPI ID / VPA *</label>
              <input
                type="text"
                value={form.upiId}
                onChange={(e) => updateField("upiId", e.target.value)}
                placeholder="e.g. shopname@okicici"
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-zinc-600 uppercase">UPI PAYEE NAME</label>
              <input
                type="text"
                value={form.upiName}
                onChange={(e) => updateField("upiName", e.target.value)}
                placeholder="e.g. VELS TECH"
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] font-bold text-zinc-600 uppercase">
                PAYMENT INSTRUCTIONS
              </label>
              <input
                type="text"
                value={form.paymentInstructions || ""}
                onChange={(e) => updateField("paymentInstructions", e.target.value)}
                placeholder="e.g. Please share WhatsApp screenshot after completing payment."
                className="mt-1 w-full h-11 px-3.5 rounded-xl border border-zinc-200 text-[13px] focus:outline-none"
              />
            </div>

            {/* UPI QR Upload vs Dynamic Generator Notice */}
            <div className="md:col-span-2 pt-2 border-t border-zinc-100">
              <label className="text-[11px] font-bold text-zinc-600 uppercase block mb-1">
                STANDALONE UPI QR CODE
              </label>
              <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl border border-zinc-200 bg-zinc-50/50">
                <div className="h-24 w-24 rounded-xl bg-white border border-zinc-200 grid place-items-center overflow-hidden shrink-0">
                  {form.upiQr ? (
                    <img src={form.upiQr} alt="UPI QR preview" className="h-full w-full object-contain" />
                  ) : (
                    <QrCode className="h-8 w-8 text-zinc-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-zinc-900">
                    {form.upiQr ? "Custom Static QR Uploaded" : "Dynamic Amount QR Active"}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">
                    {form.upiQr
                      ? "Invoices will display this uploaded static QR graphic."
                      : "When no static QR is uploaded, the app automatically generates a dynamic amount-linked UPI QR code using your UPI ID!"}
                  </div>
                  {upiQrError && <div className="text-[11px] text-red-600 mt-1">{upiQrError}</div>}
                  <div className="mt-2.5 flex gap-2">
                    <label className="h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[12px] font-semibold flex items-center justify-center cursor-pointer shadow-sm">
                      {form.upiQr ? "Replace QR Image" : "Upload Custom QR"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          handleUpiQrSelect(e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {form.upiQr && (
                      <button
                        onClick={() => {
                          if (confirm("Switch back to dynamic QR code generation?")) {
                            updateField("upiQr", "");
                          }
                        }}
                        className="h-9 px-3 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-[12px] text-zinc-700"
                      >
                        Use Dynamic QR
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Tax & GST */}
      {activeTab === "tax" && (
        <div className="rounded-[22px] bg-white border border-zinc-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-[16px] text-zinc-900">GST Rules & Intra/Inter Logic</h3>
            <p className="text-[12px] text-zinc-500 mt-0.5">
              VELS TECH billing adheres to Indian GST Council regulations.
            </p>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 text-[12px] text-indigo-900 leading-relaxed">
              <strong>Automatic Tax Determination:</strong>
              <div className="mt-1">
                • <strong>Intra-State Sale</strong>: When customer state equals company state (
                {form.state}), GST is automatically divided equally into <strong>CGST (50%)</strong> and{" "}
                <strong>SGST (50%)</strong>.
              </div>
              <div className="mt-1">
                • <strong>Inter-State Sale</strong>: When customer is from another state, the entire tax is
                credited to <strong>IGST (100%)</strong>.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Backup & Data Safety (Phase 22 & 23) */}
      {activeTab === "backup" && (
        <div className="rounded-[22px] bg-white border border-zinc-200 p-6 shadow-sm space-y-5">
          <div>
            <h3 className="font-extrabold text-[16px] text-zinc-900">Backup, Restore & Data Reset</h3>
            <p className="text-[12px] text-zinc-500 mt-0.5">
              Securely export your complete database or restore from a previous backup file.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-3">
              <div className="flex items-center gap-2">
                <Download className="h-5 w-5 text-emerald-600" />
                <span className="font-bold text-[14px]">Export Full Backup</span>
              </div>
              <p className="text-[12px] text-zinc-500 leading-snug">
                Downloads a verified JSON archive containing all products, invoices, customers, suppliers,
                purchases, payments, and settings.
              </p>
              <button
                onClick={onExportBackup}
                className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Download className="h-4 w-4" /> Download Backup File
              </button>
            </div>

            <div className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-3">
              <div className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-indigo-600" />
                <span className="font-bold text-[14px]">Restore from Backup</span>
              </div>
              <p className="text-[12px] text-zinc-500 leading-snug">
                Safely validates schema, checks for corruption, and updates all stores with rollback safety.
              </p>
              <button
                onClick={onImportBackup}
                className="w-full h-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm transition"
              >
                <Upload className="h-4 w-4" /> Import Backup File
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
            <div>
              <div className="font-bold text-[13px] text-red-600">Danger Zone: Reset All Data</div>
              <div className="text-[11px] text-zinc-400">
                Permanently clears all invoices, products, and customer records from this device.
              </div>
            </div>
            <button
              onClick={onResetData}
              className="h-10 px-4 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-[12px] font-semibold flex items-center gap-1.5 transition"
            >
              <Trash2 className="h-4 w-4" /> Reset Billing Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
