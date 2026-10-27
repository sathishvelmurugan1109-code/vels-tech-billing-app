// server/migrate.js — Idempotent database migration script
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
const dotenv = require("dotenv");

if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, ".env") });
}

const Business = require("./models/Business");
const Staff = require("./models/Staff");
const Product = require("./models/Product");
const Customer = require("./models/Customer");
const Invoice = require("./models/Invoice");
const Supplier = require("./models/Supplier");

async function hashPin(pin) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(String(pin), salt);
}

async function runMigration() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/vels_billing";
  console.log(`[Migration] Connecting to ${uri}...`);
  await mongoose.connect(uri);
  console.log("[Migration] Connected to MongoDB.");

  // 1. Find or create default VELS TECH business
  let velsBusiness = await Business.findOne({
    $or: [{ businessName: "VELS TECH" }, { email: "velstechoffical@gmail.com" }],
  });

  if (!velsBusiness) {
    console.log("[Migration] Creating VELS TECH business...");
    velsBusiness = await Business.create({
      businessName: "VELS TECH",
      ownerName: "Sathish Velmurugan",
      email: "velstechoffical@gmail.com",
      phone: "+91 98765 00001",
      plan: "Enterprise",
      status: "active",
      settings: {
        companyName: "VELS TECH",
        address: "Near Bus Stand, Veppur, Tamil Nadu 606304",
        gstin: "33AABCV1234F1Z5",
        phone: "+91 98765 00001",
        email: "velstechoffical@gmail.com",
        state: "Tamil Nadu",
        location: "Veppur",
        invoicePrefix: "VELS-",
        startingInvoiceNo: 1,
        autoInvoiceNo: true,
        currency: "INR",
        roundOff: true,
        defaultPaymentMode: "Cash",
        showGst: true,
        showDiscount: true,
      },
    });
    console.log(`[Migration] VELS TECH business created: ${velsBusiness._id}`);
  } else {
    console.log(`[Migration] VELS TECH business verified: ${velsBusiness._id}`);
  }

  // 2. Associate unassigned records with VELS TECH
  const updateResults = await Promise.all([
    Product.updateMany({ businessId: { $exists: false } }, { $set: { businessId: velsBusiness._id } }),
    Customer.updateMany({ businessId: { $exists: false } }, { $set: { businessId: velsBusiness._id } }),
    Invoice.updateMany({ businessId: { $exists: false } }, { $set: { businessId: velsBusiness._id } }),
    Supplier.updateMany({ businessId: { $exists: false } }, { $set: { businessId: velsBusiness._id } }),
  ]);
  console.log("[Migration] Orphan records reconciled:", {
    products: updateResults[0].modifiedCount,
    customers: updateResults[1].modifiedCount,
    invoices: updateResults[2].modifiedCount,
    suppliers: updateResults[3].modifiedCount,
  });

  // 3. Seed default staff for VELS TECH if none exist
  const velsStaffCount = await Staff.countDocuments({ businessId: velsBusiness._id });
  if (velsStaffCount === 0) {
    console.log("[Migration] Seeding staff members for VELS TECH...");
    const staffSeeds = [
      {
        businessId: velsBusiness._id,
        employeeCode: "EMP-001",
        name: "Sathish Velmurugan",
        role: "owner",
        phone: "+91 98765 00001",
        email: "sathish@velstech.in",
        status: "active",
        pin: "1234",
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
      },
      {
        businessId: velsBusiness._id,
        employeeCode: "EMP-002",
        name: "Rajesh Kumar",
        role: "manager",
        phone: "+91 98765 00002",
        email: "rajesh@velstech.in",
        status: "active",
        pin: "2233",
        permissions: [
          "invoices:create",
          "invoices:edit",
          "invoices:cancel",
          "refunds:manage",
          "payments:collect",
          "products:manage",
          "inventory:adjust",
          "reports:view",
        ],
      },
      {
        businessId: velsBusiness._id,
        employeeCode: "EMP-003",
        name: "Priya Sharma",
        role: "cashier",
        phone: "+91 98765 00003",
        email: "priya@velstech.in",
        status: "active",
        pin: "3344",
        permissions: [
          "invoices:create",
          "payments:collect",
          "products:manage",
          "reports:view",
        ],
      },
      {
        businessId: velsBusiness._id,
        employeeCode: "EMP-004",
        name: "Arun Prakash",
        role: "sales",
        phone: "+91 98765 00004",
        email: "arun@velstech.in",
        status: "active",
        pin: "4455",
        permissions: ["invoices:create"],
      },
    ];

    for (const seed of staffSeeds) {
      const pinHash = await hashPin(seed.pin);
      await Staff.create({
        businessId: seed.businessId,
        employeeCode: seed.employeeCode,
        name: seed.name,
        role: seed.role,
        phone: seed.phone,
        email: seed.email,
        status: seed.status,
        pinHash,
        permissions: seed.permissions,
      });
      console.log(`[Migration] Seeded staff: ${seed.name} (${seed.employeeCode})`);
    }
  } else {
    console.log(`[Migration] VELS TECH already has ${velsStaffCount} staff members.`);
  }

  // 4. Ensure Test Business has at least 1 staff member for testing
  const testBusiness = await Business.findOne({ businessName: "Test Business" });
  if (testBusiness) {
    const testStaffCount = await Staff.countDocuments({ businessId: testBusiness._id });
    if (testStaffCount === 0) {
      const testPinHash = await hashPin("9999");
      await Staff.create({
        businessId: testBusiness._id,
        employeeCode: "TEST-001",
        name: "Test Administrator",
        role: "admin",
        phone: "+91 90000 00001",
        email: "admin@testbusiness.com",
        status: "active",
        pinHash: testPinHash,
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
      console.log("[Migration] Seeded Test Business staff: Test Administrator (TEST-001)");
    }
  }

  // 5. Ensure indexes are built
  console.log("[Migration] Syncing indexes...");
  await Staff.syncIndexes();
  await Invoice.syncIndexes();
  await Product.syncIndexes();
  await Customer.syncIndexes();

  console.log("[Migration] Migration completed successfully.");
}

if (require.main === module) {
  runMigration()
    .then(() => {
      console.log("[Migration] Done.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[Migration] Error:", err);
      process.exit(1);
    });
}

module.exports = { runMigration };
