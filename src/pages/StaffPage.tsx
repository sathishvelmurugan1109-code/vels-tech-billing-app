import React, { useState, useMemo } from "react";
import {
  Users,
  UserPlus,
  Search,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  Edit2,
  Lock,
  Phone,
  Mail,
  SlidersHorizontal,
} from "lucide-react";
import type { StaffMember, StaffRole } from "../types";
import { ROLE_LABELS, hasPermission } from "../services/staffService";

export interface StaffPageProps {
  staffList: StaffMember[];
  currentStaff: StaffMember | null;
  onAddStaff: () => void;
  onEditStaff: (staff: StaffMember) => void;
  onToggleStatus: (staff: StaffMember) => void;
  onRequestPinVerification: (actionTitle: string, callback: () => void) => void;
}

export function StaffPage({
  staffList,
  currentStaff,
  onAddStaff,
  onEditStaff,
  onToggleStatus,
  onRequestPinVerification,
}: StaffPageProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const canManageStaff = hasPermission(currentStaff, "staff:manage");

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
        (s.phone && s.phone.includes(search)) ||
        (s.email && s.email.toLowerCase().includes(search.toLowerCase()));

      const matchRole = roleFilter === "all" || s.role === roleFilter;
      const matchStatus = statusFilter === "all" || s.status === statusFilter;

      return matchSearch && matchRole && matchStatus;
    });
  }, [staffList, search, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    const total = staffList.length;
    const active = staffList.filter((s) => s.status === "active").length;
    const cashiers = staffList.filter((s) => s.role === "cashier").length;
    const managers = staffList.filter((s) => s.role === "manager" || s.role === "owner" || s.role === "admin").length;
    return { total, active, cashiers, managers };
  }, [staffList]);

  const handleProtectedAdd = () => {
    if (!canManageStaff) {
      onRequestPinVerification("Add New Staff Member", onAddStaff);
    } else {
      onAddStaff();
    }
  };

  const handleProtectedEdit = (staff: StaffMember) => {
    if (!canManageStaff) {
      onRequestPinVerification(`Edit ${staff.name}`, () => onEditStaff(staff));
    } else {
      onEditStaff(staff);
    }
  };

  const handleProtectedToggle = (staff: StaffMember) => {
    const action = staff.status === "active" ? "Deactivate" : "Activate";
    if (!canManageStaff) {
      onRequestPinVerification(`${action} ${staff.name}`, () => onToggleStatus(staff));
    } else {
      onToggleStatus(staff);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-indigo-600" />
            Staff Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage multi-user staff accounts, assign granular role permissions & security PINs
          </p>
        </div>

        <button
          onClick={handleProtectedAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm transition-colors text-sm"
        >
          <UserPlus className="w-4 h-4" />
          Add Staff Member
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Staff</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Active Staff</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.active}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Cashiers / POS</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.cashiers}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Managers / Admins</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.managers}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, employee code, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">All Roles</option>
            <option value="owner">Business Owner</option>
            <option value="admin">Administrator</option>
            <option value="manager">Store Manager</option>
            <option value="cashier">Cashier</option>
            <option value="sales">Sales Staff</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Staff Directory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Staff Member</th>
                <th className="px-5 py-3.5">Emp Code</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Contact</th>
                <th className="px-5 py-3.5">Permissions</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    No staff members match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const isCurrent = currentStaff?.id === staff.id;
                  return (
                    <tr
                      key={staff.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isCurrent ? "bg-indigo-50/40" : ""
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 font-semibold flex items-center justify-center text-xs border border-slate-200">
                            {staff.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 flex items-center gap-2">
                              {staff.name}
                              {isCurrent && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                                  Current User
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">ID: {staff.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-slate-600 font-semibold">
                        {staff.employeeCode}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${
                            staff.role === "owner" || staff.role === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : staff.role === "manager"
                              ? "bg-amber-100 text-amber-700"
                              : staff.role === "cashier"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {ROLE_LABELS[staff.role] || staff.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">
                        {staff.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            {staff.phone}
                          </div>
                        )}
                        {staff.email && (
                          <div className="flex items-center gap-1.5 mt-0.5 text-slate-500">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            {staff.email}
                          </div>
                        )}
                        {!staff.phone && !staff.email && (
                          <span className="text-slate-400 italic">No contact</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-600">
                        <span className="font-semibold text-slate-800">
                          {staff.permissions?.length || 0}
                        </span>{" "}
                        modules enabled
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                            staff.status === "active"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {staff.status === "active" ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-slate-400" />
                              Inactive
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleProtectedEdit(staff)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Staff Member"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleProtectedToggle(staff)}
                            className={`p-1.5 rounded-lg transition-colors text-xs font-medium ${
                              staff.status === "active"
                                ? "text-amber-600 hover:bg-amber-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={staff.status === "active" ? "Deactivate Staff" : "Activate Staff"}
                          >
                            {staff.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
