// server/middleware/auth.js — JWT auth middleware with login-free terminal support
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const Business = require("../models/Business");

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "dev-secret-change-in-production");
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured in production.");
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function signToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      businessId: user.businessId.toString(),
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET);

      const user = await User.findById(decoded.userId).select("-passwordHash");
      if (user && user.isActive) {
        req.user = user;
        req.userId = user._id.toString();
        req.businessId = user.businessId.toString();
        req.userRole = user.role;
        return next();
      }
    }

    // Login-Free POS Terminal Architecture:
    // Resolve the active registered business for the terminal
    const terminalBizId = req.headers["x-business-id"] || process.env.DEFAULT_BUSINESS_ID;
    let business = null;
    if (terminalBizId) {
      business = await Business.findOne({
        $or: [
          { _id: mongoose.isValidObjectId(terminalBizId) ? terminalBizId : null },
          { businessId: terminalBizId },
        ],
        status: "active",
      });
    }
    if (!business) {
      business = await Business.findOne({ status: "active" }).sort({ createdAt: 1 });
    }

    if (business) {
      req.business = business;
      req.businessId = business._id.toString();
      req.isTerminal = true;
      req.userId = "terminal";
      req.userRole = "terminal";
      return next();
    }

    return res.status(401).json({ message: "Authentication required" });
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    return res.status(401).json({ message: "Invalid token" });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Privileged authentication required" });
    }
    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

module.exports = { authenticate, authorize, signToken, JWT_SECRET, JWT_EXPIRES_IN };