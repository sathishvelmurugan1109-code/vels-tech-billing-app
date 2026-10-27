// server/routes/staff.js — Staff management API with business tenant isolation
const express = require("express");
const router = express.Router();
const Staff = require("../models/Staff");
const { authenticate } = require("../middleware/auth");

function formatStaff(staff) {
  if (!staff) return staff;
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
    res.json(list.map((s) => formatStaff(s)));
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

// POST /api/staff — create new staff member
router.post("/", authenticate, async (req, res) => {
  try {
    const { employeeCode, name, role, phone, email, status, pin, permissions } = req.body;

    if (!employeeCode || !name) {
      return res.status(400).json({ message: "Employee code and name are required" });
    }

    const existing = await Staff.findOne({
      businessId: req.businessId,
      employeeCode: employeeCode.trim(),
    });
    if (existing) {
      return res.status(409).json({ message: "Employee code is already in use" });
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

// PUT /api/staff/:id — update staff member
router.put("/:id", authenticate, async (req, res) => {
  try {
    const { name, role, phone, email, status, pin, permissions } = req.body;

    const staff = await Staff.findOne({ _id: req.params.id, businessId: req.businessId });
    if (!staff) return res.status(404).json({ message: "Staff member not found" });

    if (name) staff.name = name.trim();
    if (role) staff.role = role;
    if (typeof phone === "string") staff.phone = phone.trim();
    if (typeof email === "string") staff.email = email.trim();
    if (status) staff.status = status;
    if (Array.isArray(permissions)) staff.permissions = permissions;
    if (pin) {
      staff.pinHash = await Staff.hashPin(pin);
    }

    await staff.save();
    res.json(formatStaff(staff));
  } catch (err) {
    res.status(500).json({ message: "Failed to update staff member", error: err.message });
  }
});

// POST /api/staff/verify-pin — verify staff PIN server-side
router.post("/verify-pin", authenticate, async (req, res) => {
  try {
    const { staffId, pin } = req.body;
    if (!staffId || !pin) {
      return res.status(400).json({ message: "Staff ID and PIN are required" });
    }

    const staff = await Staff.findOne({ _id: staffId, businessId: req.businessId }).select("+pinHash");
    if (!staff) return res.status(404).json({ message: "Staff member not found" });

    const isValid = await staff.comparePin(pin);
    if (!isValid) {
      return res.status(401).json({ valid: false, message: "Invalid security PIN" });
    }

    res.json({ valid: true, staff: formatStaff(staff) });
  } catch (err) {
    res.status(500).json({ message: "Verification failed", error: err.message });
  }
});

// DELETE /api/staff/:id — delete or deactivate staff member
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const staff = await Staff.findOneAndDelete({ _id: req.params.id, businessId: req.businessId });
    if (!staff) return res.status(404).json({ message: "Staff member not found" });
    res.json({ message: "Staff member removed", id: req.params.id });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete staff member", error: err.message });
  }
});

module.exports = router;
