import React, { useState, useRef, useEffect } from "react";
import {
  User,
  ChevronDown,
  Check,
  Users,
  Shield,
  LogOut,
  Building2,
  Lock,
} from "lucide-react";
import type { StaffMember } from "../types";
import { ROLE_LABELS } from "../services/staffService";

export interface HeaderStaffSwitcherProps {
  currentStaff: StaffMember | null;
  staffList: StaffMember[];
  currentBusiness?: any;
  onSelectStaff: (staff: StaffMember) => void;
  onOpenStaffManagement: () => void;
  onOpenBusinessManagement?: () => void;
  onLockTerminal: () => void;
}

export function HeaderStaffSwitcher({
  currentStaff,
  staffList,
  currentBusiness,
  onSelectStaff,
  onOpenStaffManagement,
  onOpenBusinessManagement,
  onLockTerminal,
}: HeaderStaffSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeStaff = staffList.filter((s) => s.status === "active");
  const filteredStaff = activeStaff.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
      s.role.toLowerCase().includes(search.toLowerCase())
  );

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

  const isPrivileged = currentStaff?.role === "owner" || currentStaff?.role === "admin";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Switcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 transition shadow-xs"
        title="Active staff and business menu"
      >
        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-xs">
          {currentStaff
            ? currentStaff.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : "ST"}
        </div>
        <div className="text-left hidden sm:block">
          <div className="text-xs font-semibold text-slate-900 leading-tight flex items-center gap-1.5">
            <span>{currentStaff ? currentStaff.name : "Select Staff"}</span>
            {currentBusiness?.businessName && (
              <span className="text-[10px] font-normal text-indigo-600 bg-indigo-50 px-1 rounded">
                {currentBusiness.businessName}
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            {currentStaff ? ROLE_LABELS[currentStaff.role] || currentStaff.role : "No Staff Active"}
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                Active Staff Member
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {activeStaff.length} active
              </span>
            </div>
            {activeStaff.length > 3 && (
              <input
                type="text"
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
              />
            )}
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-1">
            {filteredStaff.map((staff) => {
              const isSelected = currentStaff?.id === staff.id || (currentStaff as any)?._id === staff.id;
              return (
                <button
                  key={staff.id || staff._id}
                  onClick={() => {
                    setIsOpen(false);
                    onSelectStaff(staff);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-colors ${
                    isSelected ? "bg-indigo-50/70" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs border border-slate-200 shrink-0">
                      {staff.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {staff.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="font-mono">{staff.employeeCode}</span>
                        <span>•</span>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.2 rounded border ${getRoleBadgeStyle(
                            staff.role
                          )}`}
                        >
                          {ROLE_LABELS[staff.role] || staff.role}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Action Controls */}
          <div className="p-2 border-t border-slate-100 bg-slate-50/60 space-y-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onLockTerminal();
              }}
              className="w-full flex items-center justify-between py-2 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Lock Terminal (PIN Screen)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Shift handoff</span>
            </button>

            {onOpenBusinessManagement && isPrivileged && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenBusinessManagement();
                }}
                className="w-full flex items-center gap-2 py-2 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded-xl transition"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Manage Businesses & Branches</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                onOpenStaffManagement();
              }}
              className="w-full flex items-center gap-2 py-2 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 rounded-xl transition"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Manage Staff & Permissions</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
