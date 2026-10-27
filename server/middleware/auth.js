// server/middleware/auth.js — Cryptographic JWT Authentication & RBAC Middleware
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Staff = require("../models/Staff");
const Business = require("../models/Business");

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "dev-secret-change-in-production");
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured in production.");
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const STAFF_SESSION_EXPIRES_IN = process.env.STAFF_SESSION_EXPIRES_IN || "12h";

const ALL_PERMISSIONS = [
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

function signToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      businessId: user.businessId.toString(),
      email: user.email,
      role: user.role,
      sessionType: "user",
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function signStaffToken(staff, businessId) {
  const bizId = (businessId || staff.businessId).toString();
  return jwt.sign(
    {
      staffId: staff._id.toString(),
      businessId: bizId,
      employeeCode: staff.employeeCode,
      name: staff.name,
      role: staff.role,
      permissions: staff.permissions || [],
      sessionType: "staff",
    },
    JWT_SECRET,
    { expiresIn: STAFF_SESSION_EXPIRES_IN }
  );
}

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      return res.status(401).json({ message: "Authentication token missing" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.staffId) {
      const staff = await Staff.findById(decoded.staffId);
      if (!staff || staff.status !== "active") {
        return res.status(401).json({ message: "Staff account is inactive or revoked" });
      }

      // Ensure staff belongs to the business encoded in token
      if (staff.businessId.toString() !== decoded.businessId) {
        return res.status(403).json({ message: "Cross-business session mismatch" });
      }

      // Verify business is active
      const business = await Business.findById(staff.businessId);
      if (!business || business.status !== "active") {
        return res.status(403).json({ message: "Associated business is inactive" });
      }

      req.staff = staff;
      req.staffId = staff._id.toString();
      req.userId = staff._id.toString();
      req.businessId = staff.businessId.toString();
      req.business = business;
      req.userRole = staff.role;
      req.permissions = Array.isArray(staff.permissions) ? staff.permissions : [];
      req.sessionType = "staff";
      return next();
    }

    if (decoded.userId) {
      const user = await User.findById(decoded.userId).select("-passwordHash");
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "User account is inactive or revoked" });
      }

      const business = await Business.findById(user.businessId);
      if (!business || business.status !== "active") {
        return res.status(403).json({ message: "Associated business is inactive" });
      }

      req.user = user;
      req.userId = user._id.toString();
      req.staffId = user._id.toString();
      req.businessId = user.businessId.toString();
      req.business = business;
      req.userRole = user.role;
      req.permissions = ALL_PERMISSIONS;
      req.sessionType = "user";
      return next();
    }

    return res.status(401).json({ message: "Invalid session structure" });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Session expired. Please re-enter your PIN." });
    }
    return res.status(401).json({ message: "Invalid session token" });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(401).json({ message: "Privileged authentication required" });
    }
    if (roles.length > 0 && !roles.includes(req.userRole)) {
      return res.status(403).json({ message: "Insufficient role permissions" });
    }
    next();
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.userRole) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (req.userRole === "owner" || req.userRole === "admin") {
      return next();
    }
    if (Array.isArray(req.permissions) && req.permissions.includes(permission)) {
      return next();
    }
    return res.status(403).json({
      message: `Permission denied. Required privilege: "${permission}"`,
    });
  };
}

module.exports = {
  authenticate,
  authorize,
  requirePermission,
  signToken,
  signStaffToken,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  STAFF_SESSION_EXPIRES_IN,
};
