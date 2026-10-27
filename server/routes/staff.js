// server/routes/staff.js — Enterprise Staff Management & Permissions API
const express = require("express");
const router = express.Router();
const Staff = require("../models/Staff");
const { authenticate, requirePermission } = require("../middleware/auth");
const { checkRateLimit, recordFailedAttempt, resetRateLimit } = require("../utils/pinRateLimiter");

function formatStaff(staff) {
  if (!staff) return null;
  const obj = staff.toObject ? staff.toObject() : { ...staff };
  obj.id = obj._id.toString();
  delete obj.pinHash;
  return obj;
}

// GET /api/staff — list staff for the authenticated business
router.get("/", authenticate, async (req, res) => {
  try {
    const list = await Staff.find({ businessId: req.businessId })
      .sort({ createdAt: 1 })
      .lean();
    res.json(list.map(formatStaff));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch staff members", error: err.message });
  }
});

// GET /api/staff/:id — get one staff member
router.get("/:id", authenticate, async (req, res) => {
  try {
    const staff = await Staff.findOne({ _id: req.params.id, businessId: req.businessId }).lean();
    if (!staff) return res.status(404).json({ message: "Staff member not found" });
    res.json(formatStaff(staff));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch staff member", error: err.message });
  }
});

// POST /api/staff — create new staff member (requires staff:manage)
router.post("/", authenticate, requirePermission("staff:manage"), async (req, res) => {
  try {
    const { employeeCode, name, role, phone, email, status, pin, permissions } = req.body;

    if (!employeeCode || !name) {
      return res.status(400).json({ message: "Employee code and name are required" });
    }

    if (pin) {
      const pinStr = String(pin).trim();
      if (!/^\d{4,6}$/.test(pinStr)) {
        return res.status(400).json({ message: "PIN must be between 4 and 6 numeric digits" });
      }
    }

    // Role escalation check
    if ((role === "owner" || role === "admin") && req.userRole !== "owner" && req.userRole !== "admin") {
      return res.status(403).json({ message: "Only an Owner or Admin can create privileged accounts" });
    }

    const existing = await Staff.findOne({
      businessId: req.businessId,
      employeeCode: employeeCode.trim(),
    });
    if (existing) {
      return res.status(409).json({ message: "Employee code is already in use in this business" });
    }

    let pinHash = "";
    if (pin) {
      pinHash = await Staff.hashPin(pin);
    }

    const staff = await Staff.create({
      businessId: req.businessId,
      employeeCode: employeeCode.trim(),
      name: name.trim(),
      role: role || "cashier",
      phone: phone || "",
      email: email || "",
      status: status || "active",
      pinHash,
      permissions: Array.isArray(permissions) ? permissions : [],
    });

    res.status(201).json(formatStaff(staff));
  } catch (err) {
    res.status(500).json({ message: "Failed to create staff member", error: err.message });
  }
});

// PUT /api/staff/:id — update staff member (requires staff:manage)
router.put("/:id", authenticate, requirePermission("staff:manage"), async (req, res) => {
  try {
    const { name, role, phone, email, status, pin, permissions } = req.body;

    const staff = await Staff.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!staff) return res.status(404).json({ message: "Staff member not found" });

    // Prevent staff from changing their own role or permissions
    if (req.staffId === req.params.id) {
      if (role && role !== staff.role) {
        return res.status(403).json({ message: "You cannot change your own role" });
      }
      if (Array.isArray(permissions) && JSON.stringify(permissions) !== JSON.stringify(staff.permissions)) {
        return res.status(403).json({ message: "You cannot change your own permissions" });
      }
    }

    // Role escalation check
    if (role && (role === "owner" || role === "admin") && req.userRole !== "owner" && req.userRole !== "admin") {
      return res.status(403).json({ message: "Only an Owner or Admin can assign privileged roles" });
    }

    if (name) staff.name = name.trim();
    if (role) staff.role = role;
    if (typeof phone === "string") staff.phone = phone.trim();
    if (typeof email === "string") staff.email = email.trim();
    if (status) staff.status = status;
    if (Array.isArray(permissions)) staff.permissions = permissions;
    if (pin) {
      const pinStr = String(pin).trim();
      if (!/^\d{4,6}$/.test(pinStr)) {
        return res.status(400).json({ message: "PIN must be between 4 and 6 numeric digits" });
      }
      staff.pinHash = await Staff.hashPin(pinStr);
    }

    await staff.save();
    res.json(formatStaff(staff));
  } catch (err) {
    res.status(500).json({ message: "Failed to update staff member", error: err.message });
  }
});

// POST /api/staff/:id/reset-pin — Secure PIN reset by administrator
router.post("/:id/reset-pin", authenticate, requirePermission("staff:manage"), async (req, res) => {
  try {
    const { newPin } = req.body;
    const pinStr = String(newPin || "").trim();
    if (!/^\d{4,6}$/.test(pinStr)) {
      return res.status(400).json({ message: "New PIN must be between 4 and 6 numeric digits" });
    }

    const staff = await Staff.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!staff) return res.status(404).json({ message: "Staff member not found" });

    staff.pinHash = await Staff.hashPin(pinStr);
    staff.failedPinAttempts = 0;
    staff.lockoutUntil = null;
    await staff.save();

    resetRateLimit(staff._id);

    console.log(`[Audit] PIN reset for staff ${staff.employeeCode} by ${req.staffId || req.userId}`);
    res.json({ message: "Staff PIN reset successfully", staff: formatStaff(staff) });
  } catch (err) {
    res.status(500).json({ message: "Failed to reset PIN", error: err.message });
  }
});

// POST /api/staff/verify-pin — verify staff PIN server-side for privileged actions
router.post("/verify-pin", authenticate, async (req, res) => {
  try {
    const staffId = req.body.staffId || req.staffId;
    const pin = req.body.pin;

    if (!staffId || !pin) {
      return res.status(400).json({ message: "Staff ID and PIN are required" });
    }

    const pinStr = String(pin).trim();

    // Check rate limit
    const rateCheck = checkRateLimit(staffId);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        valid: false,
        message: `Too many failed attempts. Locked for ${rateCheck.remainingSeconds || 900} seconds.`,
        locked: true,
      });
    }

    const staff = await Staff.findOne({ _id: staffId, businessId: req.businessId }).select("+pinHash");
    if (!staff) return res.status(404).json({ message: "Staff member not found" });

    const isValid = await staff.comparePin(pinStr);
    if (!isValid) {
      const record = recordFailedAttempt(staffId);
      console.warn(`[Audit] Failed re-verification PIN attempt for staff ${staff.employeeCode}`);

      if (record.locked) {
        return res.status(429).json({
          valid: false,
          message: `Too many failed attempts. Locked for ${record.remainingSeconds} seconds.`,
          locked: true,
        });
      }

      return res.status(401).json({
        valid: false,
        message: `Invalid security PIN. ${record.remaining} attempt(s) remaining.`,
        remainingAttempts: record.remaining,
      });
    }

    resetRateLimit(staffId);
    res.json({ valid: true, staff: formatStaff(staff) });
  } catch (err) {
    res.status(500).json({ message: "Verification failed", error: err.message });
  }
});

// DELETE /api/staff/:id — delete or deactivate staff member
router.delete("/:id", authenticate, requirePermission("staff:manage"), async (req, res) => {
  try {
    if (req.staffId === req.params.id) {
      return res.status(400).json({ message: "You cannot delete your own staff account" });
    }

    const staff = await Staff.findOneAndDelete({ _id: req.params.id, businessId: req.businessId });
    if (!staff) return res.status(404).json({ message: "Staff member not found" });
    res.json({ message: "Staff member removed", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete staff member", error: err.message });
  }
});

module.exports = router;
