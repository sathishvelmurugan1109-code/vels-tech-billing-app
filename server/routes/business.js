// server/routes/business.js — Multi-Business Management & Settings API
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Business = require("../models/Business");
const Staff = require("../models/Staff");
const { authenticate, requirePermission, authorize, signStaffToken } = require("../middleware/auth");

// GET /api/business/current — fetch currently active business
router.get("/current", authenticate, async (req, res) => {
  try {
    const business = await Business.findById(req.businessId).lean();
    if (!business) return res.status(404).json({ message: "Business not found" });
    business.id = business._id.toString();
    res.json(business);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch business", error: err.message });
  }
});

// PUT /api/business/current — update business info
router.put("/current", authenticate, requirePermission("settings:manage"), async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.businessId;
    delete data._id;
    delete data.id;
    const business = await Business.findByIdAndUpdate(
      req.businessId,
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!business) return res.status(404).json({ message: "Business not found" });
    const obj = business.toObject();
    obj.id = obj._id.toString();
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: "Failed to update business", error: err.message });
  }
});

// GET /api/business/settings — get business settings
router.get("/settings", authenticate, async (req, res) => {
  try {
    const business = await Business.findById(req.businessId).lean();
    if (!business) return res.status(404).json({ message: "Business not found" });
    res.json(business.settings || {});
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch settings", error: err.message });
  }
});

// PUT /api/business/settings — update business settings
router.put("/settings", authenticate, requirePermission("settings:manage"), async (req, res) => {
  try {
    const business = await Business.findByIdAndUpdate(
      req.businessId,
      { $set: { settings: req.body } },
      { new: true, runValidators: true }
    );
    if (!business) return res.status(404).json({ message: "Business not found" });
    res.json(business.settings);
  } catch (err) {
    res.status(500).json({ message: "Failed to update settings", error: err.message });
  }
});

// GET /api/business/all — list all businesses (for authorized administrators/switchers)
router.get("/all", authenticate, async (req, res) => {
  try {
    const list = await Business.find()
      .sort({ createdAt: -1 })
      .lean();

    const formatted = list.map((b) => ({
      id: b._id.toString(),
      _id: b._id.toString(),
      businessId: b.businessId,
      businessName: b.businessName,
      ownerName: b.ownerName,
      phone: b.phone,
      email: b.email,
      plan: b.plan,
      status: b.status,
      settings: b.settings || {},
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch businesses list", error: err.message });
  }
});

// POST /api/business — Create a new independent business (requires owner or admin)
router.post("/", authenticate, authorize("owner", "admin"), async (req, res) => {
  try {
    const { businessName, ownerName, phone, email, plan, status, settings, initialStaffPin } = req.body;

    if (!businessName || !businessName.trim()) {
      return res.status(400).json({ message: "Business name is required" });
    }

    const newBusiness = await Business.create({
      businessName: businessName.trim(),
      ownerName: ownerName?.trim() || req.staff?.name || "Administrator",
      phone: phone?.trim() || "",
      email: email?.trim() || "",
      plan: plan || "Pro",
      status: status || "active",
      settings: {
        companyName: businessName.trim(),
        currency: "INR",
        roundOff: true,
        invoicePrefix: `${businessName.trim().slice(0, 4).toUpperCase()}-`,
        startingInvoiceNo: 1,
        autoInvoiceNo: true,
        showGst: true,
        showDiscount: true,
        defaultPaymentMode: "Cash",
        ...settings,
      },
    });

    // Create initial Owner/Admin staff for this new business
    const pin = initialStaffPin || "1234";
    const pinHash = await Staff.hashPin(pin);
    const initialStaff = await Staff.create({
      businessId: newBusiness._id,
      employeeCode: "ADM-001",
      name: ownerName?.trim() || req.staff?.name || "Administrator",
      role: "owner",
      status: "active",
      pinHash,
      permissions: [
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
      ],
    });

    const obj = newBusiness.toObject();
    obj.id = obj._id.toString();
    res.status(201).json({ business: obj, initialStaff: { id: initialStaff._id.toString(), employeeCode: initialStaff.employeeCode } });
  } catch (err) {
    console.error("[Business] Create error:", err);
    res.status(500).json({ message: "Failed to create business", error: err.message });
  }
});

// PUT /api/business/:id/status — Toggle active/inactive
router.put("/:id/status", authenticate, authorize("owner", "admin"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !["active", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true }
    );
    if (!business) return res.status(404).json({ message: "Business not found" });

    res.json({ message: `Business marked as ${status}`, business });
  } catch (err) {
    res.status(500).json({ message: "Failed to update business status", error: err.message });
  }
});

module.exports = router;
