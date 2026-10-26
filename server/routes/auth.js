// server/routes/auth.js — Authentication routes
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const Business = require("../models/Business");
const { signToken, authenticate } = require("../middleware/auth");

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

    // Create business first
    const business = await Business.create({
      businessName,
      ownerName: ownerName || name || "Owner",
      phone: phone || "",
      email: email.toLowerCase(),
      plan: plan || "Free",
      status: "active",
    });

    // Create user linked to business
    const user = await User.createUser({
      email: email.toLowerCase(),
      password,
      name: name || ownerName || "Owner",
      role: "owner",
      businessId: business._id,
    });

    const token = signToken(user);

    // Update last login
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

// POST /api/auth/login — Login with email/password
router.post("/login", async (req, res) => {
  try {
    const email = typeof req.body?.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";
    const password = typeof req.body?.password === "string"
      ? req.body.password
      : "";

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address" });
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
    const databaseUnavailable = mongoose.connection.readyState !== 1;
    res.status(databaseUnavailable ? 503 : 500).json({
      message: databaseUnavailable
        ? "Authentication service is temporarily unavailable"
        : "Unable to complete login",
    });
  }
});

// GET /api/auth/verify — Verify token and return current user
router.get("/verify", authenticate, async (req, res) => {
  try {
    const user = req.user;
    const business = await Business.findById(user.businessId);
    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        businessId: user.businessId.toString(),
        businessName: business ? business.businessName : "",
      },
      business: business
        ? {
            id: business._id.toString(),
            businessId: business.businessId,
            businessName: business.businessName,
            plan: business.plan,
            status: business.status,
          }
        : null,
    });
  } catch (err) {
    res.status(500).json({ message: "Verification failed", error: err.message });
  }
});

// POST /api/auth/logout — Client-side logout (token invalidation handled client-side)
router.post("/logout", authenticate, async (req, res) => {
  res.json({ message: "Logged out successfully" });
});

module.exports = router;