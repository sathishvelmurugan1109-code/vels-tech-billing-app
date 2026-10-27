import React, { useState, useEffect } from "react";
import { User, X, Shield, KeyRound, Phone, Mail, Check } from "lucide-react";
import type { StaffMember, StaffRole, StaffPermission } from "../types";
import {
  ROLE_LABELS,
  ROLE_DEFAULT_PERMISSIONS,
  ALL_PERMISSIONS,
  generateEmployeeCode,
} from "../services/staffService";

export interface StaffModalProps {
  isOpen: boolean;
  staff: StaffMember | null;
  existingStaff: StaffMember[];
  onSave: (staff: StaffMember) => void;
  onClose: () => void;
}

const PERMISSION_LABELS: Record<StaffPermission, string> = {
  "invoices:create": "Create & Print Invoices",
  "invoices:edit": "Edit Existing Invoices",
  "invoices:cancel": "Cancel / Void Invoices",
  "refunds:manage": "Process Sales Returns & Refunds",
  "payments:collect": "Collect & Record Payments",
  "products:manage": "Add / Edit Products & Pricing",
  "inventory:adjust": "Manual Stock Adjustments",
  "reports:view": "View Financial & Sales Reports",
  "staff:manage": "Manage Staff & Permissions",
  "settings:manage": "Modify Business & GST Settings",
};

export function StaffModal({
  isOpen,
  staff,
  existingStaff,
  onSave,
  onClose,
}: StaffModalProps) {
  const [name, setName] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("cashier");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [pin, setPin] = useState("");
  const [permissions, setPermissions] = useState<StaffPermission[]>([]);
  const [customPermissions, setCustomPermissions] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (staff) {
      setName(staff.name || "");
      setEmployeeCode(staff.employeeCode || "");
      setPhone(staff.phone || "");
      setEmail(staff.email || "");
      setRole(staff.role || "cashier");
      setStatus(staff.status || "active");
      setPin(staff.pin || "");
      setPermissions(staff.permissions || ROLE_DEFAULT_PERMISSIONS[staff.role] || []);
      setCustomPermissions(true);
    } else {
      setName("");
      setEmployeeCode(generateEmployeeCode(existingStaff));
      setPhone("");
      setEmail("");
      setRole("cashier");
      setStatus("active");
      setPin("1234");
      setPermissions(ROLE_DEFAULT_PERMISSIONS.cashier);
      setCustomPermissions(false);
    }
    setError("");
  }, [staff, existingStaff, isOpen]);

  const handleRoleChange = (newRole: StaffRole) => {
    setRole(newRole);
    if (!customPermissions) {
      setPermissions(ROLE_DEFAULT_PERMISSIONS[newRole]);
    }
  };

  const togglePermission = (perm: StaffPermission) => {
    setCustomPermissions(true);
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Staff full name is required.");
      return;
    }

    if (!employeeCode.trim()) {
      setError("Employee code is required.");
      return;
    }

    if (!pin.trim() || pin.length < 4) {
      setError("A security PIN of at least 4 digits is required.");
      return;
    }

    const payload: StaffMember = {
      id: staff?.id || `staff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      employeeCode: employeeCode.trim(),
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      role,
      status,
      pin: pin.trim(),
      permissions: permissions.length > 0 ? permissions : ROLE_DEFAULT_PERMISSIONS[role],
      createdAt: staff?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(payload);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-sm">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-base">
                {staff ? "Edit Staff Member" : "Add New Staff Member"}
              </h3>
              <p className="text-xs text-slate-500">
                Configure role, security PIN, and system permissions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Employee Code *
              </label>
              <input
                type="text"
                required
                placeholder="EMP-001"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  placeholder="+91 98765 00000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  placeholder="ramesh@velstech.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                System Role *
              </label>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as StaffRole)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {(Object.keys(ROLE_LABELS) as StaffRole[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Security PIN *
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  maxLength={6}
                  placeholder="4 digits"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm font-mono tracking-widest border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-indigo-600" />
                Functional Permissions
              </label>
              <button
                type="button"
                onClick={() => {
                  setCustomPermissions(false);
                  setPermissions(ROLE_DEFAULT_PERMISSIONS[role]);
                }}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Reset to {ROLE_LABELS[role]} Defaults
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 border border-slate-200/80 p-3 rounded-xl max-h-48 overflow-y-auto">
              {ALL_PERMISSIONS.map((perm) => {
                const checked = permissions.includes(perm);
                return (
                  <label
                    key={perm}
                    className="flex items-start gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer transition-colors text-xs text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePermission(perm)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{PERMISSION_LABELS[perm] || perm}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
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
              <Check className="w-4 h-4" />
              Save Staff Member
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
