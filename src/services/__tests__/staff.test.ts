import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ALL_PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  hasPermission,
  isPrivilegedAction,
  verifyStaffPin,
  generateEmployeeCode,
  seedStaff,
} from "../staffService";
import type { StaffMember } from "../../types";

describe("staffService — roles, permissions & security PIN", () => {
  it("defines comprehensive default permissions for every role", () => {
    assert.equal(ROLE_DEFAULT_PERMISSIONS.owner.length, ALL_PERMISSIONS.length);
    assert.equal(ROLE_DEFAULT_PERMISSIONS.admin.length, ALL_PERMISSIONS.length);
    assert.ok(ROLE_DEFAULT_PERMISSIONS.manager.includes("invoices:cancel"));
    assert.ok(ROLE_DEFAULT_PERMISSIONS.manager.includes("refunds:manage"));
    assert.ok(!ROLE_DEFAULT_PERMISSIONS.cashier.includes("invoices:cancel"));
    assert.ok(!ROLE_DEFAULT_PERMISSIONS.cashier.includes("settings:manage"));
    assert.ok(ROLE_DEFAULT_PERMISSIONS.sales.includes("invoices:create"));
    assert.ok(!ROLE_DEFAULT_PERMISSIONS.sales.includes("payments:collect"));
  });

  it("checks staff permissions with role escalation safety", () => {
    const owner = seedStaff.find((s) => s.role === "owner")!;
    assert.equal(hasPermission(owner, "settings:manage"), true);
    assert.equal(hasPermission(owner, "invoices:cancel"), true);

    const cashier = seedStaff.find((s) => s.role === "cashier")!;
    assert.equal(hasPermission(cashier, "invoices:create"), true);
    assert.equal(hasPermission(cashier, "payments:collect"), true);
    assert.equal(hasPermission(cashier, "invoices:cancel"), false);
    assert.equal(hasPermission(cashier, "settings:manage"), false);

    // Inactive staff has zero permissions even if role is owner
    const inactiveOwner: StaffMember = { ...owner, status: "inactive" };
    assert.equal(hasPermission(inactiveOwner, "invoices:create"), false);
    assert.equal(hasPermission(inactiveOwner, "settings:manage"), false);

    // Null or undefined staff
    assert.equal(hasPermission(null, "invoices:create"), false);
    assert.equal(hasPermission(undefined, "invoices:create"), false);
  });

  it("identifies privileged actions requiring security verification", () => {
    assert.equal(isPrivilegedAction("settings:manage"), true);
    assert.equal(isPrivilegedAction("staff:manage"), true);
    assert.equal(isPrivilegedAction("invoices:cancel"), true);
    assert.equal(isPrivilegedAction("refunds:manage"), true);
    assert.equal(isPrivilegedAction("invoices:create"), false);
    assert.equal(isPrivilegedAction("reports:view"), false);
  });

  it("verifies staff security PIN accurately", () => {
    const manager = seedStaff.find((s) => s.role === "manager")!;
    assert.equal(verifyStaffPin(manager, "2233"), true);
    assert.equal(verifyStaffPin(manager, "0000"), false);
    assert.equal(verifyStaffPin(manager, ""), false);
    assert.equal(verifyStaffPin(null, "2233"), false);

    const staffWithoutPin: StaffMember = { ...manager, pin: undefined };
    assert.equal(verifyStaffPin(staffWithoutPin, "2233"), false);
  });

  it("generates sequential employee codes", () => {
    assert.equal(generateEmployeeCode(seedStaff), "EMP-005");
    assert.equal(generateEmployeeCode([]), "EMP-001");
  });
});
