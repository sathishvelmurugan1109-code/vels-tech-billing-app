/**
 * staffService.ts — Enterprise Multi-User Staff Management & Permissions Architecture
 */

import type { StaffMember, StaffPermission, StaffRole } from "../types";
import { api } from "./apiService";

export const ALL_PERMISSIONS: StaffPermission[] = [
  "invoices:create",
  "invoices:edit",
  "invoices:cancel",
  "refunds:manage",
  "payments:collect",
  "products:manage",
  "inventory:adjust",
  "reports:view",
  "staff:manage",
  "settings:manage",
];

export const ROLE_DEFAULT_PERMISSIONS: Record<StaffRole, StaffPermission[]> = {
  owner: [...ALL_PERMISSIONS],
  admin: [...ALL_PERMISSIONS],
  manager: [
    "invoices:create",
    "invoices:edit",
    "invoices:cancel",
    "refunds:manage",
    "payments:collect",
    "products:manage",
    "inventory:adjust",
    "reports:view",
  ],
  cashier: [
    "invoices:create",
    "payments:collect",
    "products:manage",
    "reports:view",
  ],
  sales: [
    "invoices:create",
  ],
};

export const ROLE_LABELS: Record<StaffRole, string> = {
  owner: "Business Owner",
  admin: "Administrator",
  manager: "Store Manager",
  cashier: "Cashier",
  sales: "Sales Staff",
};

export const PRIVILEGED_PERMISSIONS: StaffPermission[] = [
  "invoices:cancel",
  "refunds:manage",
  "staff:manage",
  "settings:manage",
  "inventory:adjust",
];

export const seedStaff: StaffMember[] = [
  {
    id: "staff-01",
    employeeCode: "EMP-001",
    name: "Sathish Velmurugan",
    role: "owner",
    phone: "+91 98765 00001",
    email: "sathish@velstech.in",
    status: "active",
    pin: "1234",
    permissions: ROLE_DEFAULT_PERMISSIONS.owner,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "staff-02",
    employeeCode: "EMP-002",
    name: "Rajesh Kumar",
    role: "manager",
    phone: "+91 98765 00002",
    email: "rajesh@velstech.in",
    status: "active",
    pin: "2233",
    permissions: ROLE_DEFAULT_PERMISSIONS.manager,
    createdAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "staff-03",
    employeeCode: "EMP-003",
    name: "Priya Sharma",
    role: "cashier",
    phone: "+91 98765 00003",
    email: "priya@velstech.in",
    status: "active",
    pin: "3344",
    permissions: ROLE_DEFAULT_PERMISSIONS.cashier,
    createdAt: "2026-01-03T00:00:00.000Z",
  },
  {
    id: "staff-04",
    employeeCode: "EMP-004",
    name: "Arun Prakash",
    role: "sales",
    phone: "+91 98765 00004",
    email: "arun@velstech.in",
    status: "active",
    pin: "4455",
    permissions: ROLE_DEFAULT_PERMISSIONS.sales,
    createdAt: "2026-01-04T00:00:00.000Z",
  },
];

/**
 * Checks whether a staff member has a given permission.
 */
export function hasPermission(
  staff: StaffMember | null | undefined,
  permission: StaffPermission,
): boolean {
  if (!staff || staff.status !== "active") return false;
  if (staff.role === "owner" || staff.role === "admin") return true;
  return Array.isArray(staff.permissions) && staff.permissions.includes(permission);
}

/**
 * Checks if an operation is privileged (requiring PIN verification if configured).
 */
export function isPrivilegedAction(permission: StaffPermission): boolean {
  return PRIVILEGED_PERMISSIONS.includes(permission);
}

/**
 * Verifies staff PIN synchronously (offline/unit-test fallback).
 */
export function verifyStaffPin(staff: StaffMember | null | undefined, inputPin: string): boolean {
  if (!staff || !staff.pin) return false;
  return staff.pin.trim() === inputPin.trim();
}

/**
 * Verifies staff PIN securely via server API.
 */
export async function verifyStaffPinServer(inputPin: string, staffId?: string): Promise<{ valid: boolean; staff?: StaffMember; message?: string }> {
  try {
    const res = await api.staff.verifyPin(inputPin, staffId);
    return { valid: !!res?.valid, staff: res?.staff };
  } catch (err: any) {
    return { valid: false, message: err?.message || "PIN verification failed" };
  }
}

/**
 * Generates an employee code based on current staff list size.
 */
export function generateEmployeeCode(existingStaff: StaffMember[]): string {
  const nextNum = existingStaff.length + 1;
  return `EMP-${String(nextNum).padStart(3, "0")}`;
}
