// server/routes/auth.js — Authentication routes (Staff PIN Session & Owner Auth)
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const Staff = require("../models/Staff");
const Business = require("../models/Business");
const { signToken, signStaffToken, authenticate } = require("../middleware/auth");
const { checkRateLimit, recordFailedAttempt, resetRateLimit } = require("../utils/pinRateLimiter");

function formatStaffPublic(staff) {
  if (!staff) return null;
  const s = staff.toObject ? staff.toObject() : { ...staff };
  return {
    id: s._id.toString(),
    _id: s._id.toString(),
    employeeCode: s.employeeCode,
    name: s.name,
    role: s.role,
    status: s.status,
  };
}

function formatStaffSession(staff) {
  if (!staff) return null;
  const s = staff.toObject ? staff.toObject() : { ...staff };
  delete s.pinHash;
  s.id = s._id.toString();
  return s;
}

// GET /api/auth/businesses — public authorized selector list of active businesses
router.get("/businesses", async (req, res) => {
  try {
    const list = await Business.find({ status: "active" })
      .select("_id businessId businessName settings.location settings.logoText settings.invoicePrefix createdAt")
      .sort({ businessName: 1 })
      .lean();

    const result = list.map((b) => ({
      id: b._id.toString(),
      _id: b._id.toString(),
      businessId: b.businessId,
      businessName: b.businessName,
      location: b.settings?.location || "",
      logoText: b.settings?.logoText || "",
      invoicePrefix: b.settings?.invoicePrefix || "INV-",
    }));

    res.json(result);
  } catch (err) {
    console.error("[Auth] Failed to fetch businesses:", err);
    res.status(500).json({ message: "Unable to retrieve businesses list" });
  }
});

// GET /api/auth/businesses/:id/staff — public list of active staff members for chosen business
router.get("/businesses/:id/staff", async (req, res) => {
  try {
    const bizIdentifier = req.params.id;
    const business = await Business.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(bizIdentifier) ? bizIdentifier : null },
        { businessId: bizIdentifier },
      ],
      status: "active",
    }).lean();

    if (!business) {
      return res.status(404).json({ message: "Business not found or inactive" });
    }

    const staffList = await Staff.find({
      businessId: business._id,
      status: "active",
    })
      .sort({ employeeCode: 1, name: 1 })
      .lean();

    res.json(staffList.map(formatStaffPublic));
  } catch (err) {
    console.error("[Auth] Failed to fetch staff for business:", err);
    res.status(500).json({ message: "Unable to retrieve staff list" });
  }
});

// POST /api/auth/staff-session — Authenticate staff via PIN and issue secure session JWT
router.post("/staff-session", async (req, res) => {
  try {
    const { businessId, staffId, pin } = req.body;

    if (!businessId || !staffId || !pin) {
      return res.status(400).json({ message: "Business, staff selection, and PIN are required" });
    }

    const pinStr = String(pin).trim();
    if (!/^\d{4,6}$/.test(pinStr)) {
      return res.status(400).json({ message: "PIN must be between 4 and 6 numeric digits" });
    }

    // Rate limiting & Lockout check
    const rateCheck = checkRateLimit(staffId);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        message: `Too many failed attempts. Account temporarily locked for ${rateCheck.remainingSeconds || 900} seconds.`,
        locked: true,
        remainingSeconds: rateCheck.remainingSeconds,
      });
    }

    // Resolve business
    const business = await Business.findOne({
      $or: [
        { _id: mongoose.isValidObjectId(businessId) ? businessId : null },
        { businessId },
      ],
      status: "active",
    });

    if (!business) {
      return res.status(404).json({ message: "Business not found or inactive" });
    }

    // Find staff
    const staff = await Staff.findOne({
      _id: staffId,
      businessId: business._id,
      status: "active",
    }).select("+pinHash");

    if (!staff) {
      return res.status(404).json({ message: "Staff member not found or inactive" });
    }

    // Constant-time compare PIN
    const isMatch = await staff.comparePin(pinStr);
    if (!isMatch) {
      const record = recordFailedAttempt(staffId);
      // Audit without logging PIN
      console.warn(
        `[Audit] Failed PIN verification attempt for staff ${staff.employeeCode} (${staff._id}) from ${req.ip}`
      );

      if (record.locked) {
        staff.failedPinAttempts = (staff.failedPinAttempts || 0) + 1;
        staff.lockoutUntil = record.lockedUntil;
        await staff.save();
        return res.status(429).json({
          message: `Too many failed attempts. Account locked for ${record.remainingSeconds} seconds.`,
          locked: true,
          remainingSeconds: record.remainingSeconds,
        });
      }

      return res.status(401).json({
        message: `Invalid security PIN. ${record.remaining} attempt(s) remaining before temporary lockout.`,
        remainingAttempts: record.remaining,
      });
    }

    // Verification successful
    resetRateLimit(staffId);
    staff.lastActiveAt = new Date();
    staff.failedPinAttempts = 0;
    staff.lockoutUntil = null;
    await staff.save();

    const token = signStaffToken(staff, business._id);

    res.json({
      token,
      staff: formatStaffSession(staff),
      business: {
        id: business._id.toString(),
        _id: business._id.toString(),
        businessId: business.businessId,
        businessName: business.businessName,
        plan: business.plan,
        status: business.status,
        settings: business.settings || {},
      },
    });
  } catch (err) {
    console.error("[Auth] Staff session error:", err);
    res.status(500).json({ message: "Failed to authenticate staff session" });
  }
});

// GET /api/auth/verify — Verify token and return current session
router.get("/verify", authenticate, async (req, res) => {
  try {
    const business = await Business.findById(req.businessId).lean();
    if (!business) {
      return res.status(404).json({ message: "Business not found" });
    }

    if (req.sessionType === "staff") {
      const staff = await Staff.findById(req.staffId).lean();
      return res.json({
        sessionType: "staff",
        staff: formatStaffSession(staff),
        user: {
          id: staff?._id.toString(),
          name: staff?.name,
          role: staff?.role,
          employeeCode: staff?.employeeCode,
          permissions: staff?.permissions || [],
          businessId: req.businessId,
          businessName: business.businessName,
        },
        business: {
          id: business._id.toString(),
          _id: business._id.toString(),
          businessId: business.businessId,
          businessName: business.businessName,
          plan: business.plan,
          status: business.status,
          settings: business.settings || {},
        },
      });
    }

    // Admin/owner user session
    res.json({
      sessionType: "user",
      user: {
        id: req.user._id.toString(),
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        businessId: req.businessId,
        businessName: business.businessName,
      },
      business: {
        id: business._id.toString(),
        _id: business._id.toString(),
        businessId: business.businessId,
        businessName: business.businessName,
        plan: business.plan,
        status: business.status,
        settings: business.settings || {},
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Verification failed", error: err.message });
  }
});

// POST /api/auth/logout — Revoke session
router.post("/logout", authenticate, async (req, res) => {
  res.json({ message: "Logged out successfully" });
});

// POST /api/auth/register — Register a new business + owner user
router.post("/register", async (req, res) => {
  try {
    const { email, password, name, businessName, ownerName, phone, plan } = req.body;

    if (!email || !password || !businessName) {
      return res.status(400).json({ message: "Email, password, and business name are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const business = await Business.create({
      businessName,
      ownerName: ownerName || name || "Owner",
      phone: phone || "",
      email: email.toLowerCase(),
      plan: plan || "Free",
      status: "active",
    });

    const user = await User.createUser({
      email: email.toLowerCase(),
      password,
      name: name || ownerName || "Owner",
      role: "owner",
      businessId: business._id,
    });

    const token = signToken(user);
    user.lastLoginAt = new Date();
    await user.save();

    res.status(201).json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: business._id.toString(),
        businessName: business.businessName,
      },
      business: {
        id: business._id.toString(),
        businessId: business.businessId,
        businessName: business.businessName,
        plan: business.plan,
        status: business.status,
      },
    });
  } catch (err) {
    console.error("[Auth] Register error:", err);
    res.status(500).json({ message: "Registration failed", error: err.message });
  }
});

// POST /api/auth/login — Login with email/password (Admin fallback)
router.post("/login", async (req, res) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: "Account is deactivated" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const business = await Business.findById(user.businessId);
    if (!business || business.status !== "active") {
      return res.status(403).json({ message: "Business is inactive" });
    }

    const token = signToken(user);
    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: business._id.toString(),
        businessName: business.businessName,
      },
      business: {
        id: business._id.toString(),
        businessId: business.businessId,
        businessName: business.businessName,
        plan: business.plan,
        status: business.status,
      },
    });
  } catch (err) {
    console.error("[Auth] Login error:", err);
    res.status(500).json({ message: "Unable to complete login" });
  }
});

module.exports = router;
