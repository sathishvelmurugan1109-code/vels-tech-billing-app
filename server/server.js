// server/server.js — Express entry point
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, ".env") });
}

const { connectDB } = require("./config/db");
const { authenticate } = require("./middleware/auth");
const authRoutes = require("./routes/auth");
const businessRoutes = require("./routes/business");
const invoiceRoutes = require("./routes/invoices");
const staffRoutes = require("./routes/staff");
const createCrudRoutes = require("./routes/crudFactory");

// Models
const Product = require("./models/Product");
const Customer = require("./models/Customer");
const Supplier = require("./models/Supplier");
const Invoice = require("./models/Invoice");
const Purchase = require("./models/Purchase");
const Payment = require("./models/Payment");
const Expense = require("./models/Expense");
const StockMovement = require("./models/StockMovement");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5176",
  "http://127.0.0.1:5176",
];
const allowedOrigins = [
  ...new Set([
    ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : []),
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    ...defaultAllowedOrigins,
  ].map((o) => {
    const origin = o?.trim();
    return origin && !origin.includes("://") ? `https://${origin}` : origin;
  }).filter(Boolean)),
];

for (const origin of [...allowedOrigins]) {
  const parsedOrigin = new URL(origin);
  if (parsedOrigin.hostname === "localhost" || parsedOrigin.hostname === "127.0.0.1") {
    parsedOrigin.hostname =
      parsedOrigin.hostname === "localhost" ? "127.0.0.1" : "localhost";
    allowedOrigins.push(parsedOrigin.origin);
  }
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth routes (public)
app.use("/api/auth", authRoutes);

// Business routes (protected)
app.use("/api/business", businessRoutes);
app.use("/api/staff", staffRoutes);

// CRUD routes (protected)
app.use("/api/products", createCrudRoutes(Product));
app.use("/api/customers", createCrudRoutes(Customer));
app.use("/api/suppliers", createCrudRoutes(Supplier));
app.use("/api/invoices", invoiceRoutes);
app.use("/api/purchases", createCrudRoutes(Purchase));
app.use("/api/payments", createCrudRoutes(Payment));
app.use("/api/expenses", createCrudRoutes(Expense));
app.use("/api/stock-movements", createCrudRoutes(StockMovement));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("[Server] Error:", err);
  res.status(500).json({ message: "Internal server error", error: err.message });
});

// Start server
async function start() {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || "development"}`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `[Server] Port ${PORT} is already in use. Another instance may be running. ` +
            `Stop the existing process or change PORT. Shutting down.`
        );
      } else {
        console.error("[Server] Listen error:", err);
      }
      process.exit(1);
    });

    const shutdown = (signal) => {
      console.log(`[Server] Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        console.log("[Server] HTTP server closed.");
        process.exit(0);
      });
      // Force exit if close hangs
      setTimeout(() => process.exit(1), 5000).unref();
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err) {
    console.error("[Server] Failed to start:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { app, start, connectDB };