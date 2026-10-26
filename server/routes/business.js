// server/routes/business.js — Business info + settings routes
const express = require("express");
const router = express.Router();
const Business = require("../models/Business");
const { authenticate } = require("../middleware/auth");

// GET current business
router.get("/current", authenticate, async (req, res) => {
  try {
    const business = await Business.findById(req.businessId).lean();
    if (!business) return res.status(404).json({ message: "Business not found" });
    res.json(business);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch business", error: err.message });
  }
});

// PUT update business info
router.put("/current", authenticate, async (req, res) => {
  try {
    const data = { ...req.body };
    delete data.businessId;
    delete data._id;
    delete data.id;
    const business = await Business.findByIdAndUpdate(req.businessId, { $set: data }, { new: true, runValidators: true });
    if (!business) return res.status(404).json({ message: "Business not found" });
    res.json(business);
  } catch (err) {
    res.status(500).json({ message: "Failed to update business", error: err.message });
  }
});

// GET settings (extracted from business)
router.get("/settings", authenticate, async (req, res) => {
  try {
    const business = await Business.findById(req.businessId).lean();
    if (!business) return res.status(404).json({ message: "Business not found" });
    res.json(business.settings || {});
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch settings", error: err.message });
  }
});

// PUT settings
router.put("/settings", authenticate, async (req, res) => {
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

module.exports = router;