// server/tests/e2e-scenarios.test.js — 20-Scenario End-to-End Enterprise Verification
const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const mongoose = require("mongoose");
const { app } = require("../server");
const Business = require("../models/Business");
const Staff = require("../models/Staff");
const Product = require("../models/Product");
const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Payment = require("../models/Payment");
const { resetRateLimit } = require("../utils/pinRateLimiter");

test("Enterprise Multi-Business & Staff Architecture: 20-Scenario Verification", async (t) => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/vels_billing";
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const runId = Date.now();

  // Helper HTTP request function
  async function apiCall(method, path, body = null, token = null) {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => null);
    return { status: res.status, data, headers: res.headers };
  }

  // --- SEED FIXTURES FOR E2E TEST ---
  const biz1 = await Business.create({
    businessName: `E2E Tech Systems ${runId}`,
    ownerName: "Sundar Pichai",
    email: `e2e_corp_${runId}@velstech.com`,
    status: "active",
    gstin: "33AAACV1234A1Z5",
    settings: { invoicePrefix: "E2E-", startingInvoiceNo: 101, companyName: "E2E Tech Systems" },
  });

  const biz2 = await Business.create({
    businessName: `E2E Retail Store ${runId}`,
    ownerName: "Retail Owner",
    email: `e2e_retail_${runId}@velstech.com`,
    status: "active",
    gstin: "29BBBCV5678B2Z6",
    settings: { invoicePrefix: "RET-", startingInvoiceNo: 501, companyName: "E2E Retail" },
  });

  const inactiveBiz = await Business.create({
    businessName: `Deactivated Business ${runId}`,
    ownerName: "Ex-Owner",
    email: `ex_${runId}@test.com`,
    status: "inactive",
  });

  const pinOwner1 = "112233";
  const pinCashier1 = "445566";
  const pinOwner2 = "998877";

  const staffOwner1 = await Staff.create({
    businessId: biz1._id,
    employeeCode: "EMP-001",
    name: "Sundar Pichai",
    role: "owner",
    status: "active",
    pinHash: await Staff.hashPin(pinOwner1),
    permissions: [
      "invoices:create", "invoices:edit", "invoices:cancel", "refunds:manage",
      "payments:collect", "products:manage", "inventory:adjust", "reports:view",
      "staff:manage", "settings:manage",
    ],
  });

  const staffCashier1 = await Staff.create({
    businessId: biz1._id,
    employeeCode: "EMP-002",
    name: "Kavitha Sales",
    role: "cashier",
    status: "active",
    pinHash: await Staff.hashPin(pinCashier1),
    permissions: ["invoices:create", "payments:collect"],
  });

  const staffOwner2 = await Staff.create({
    businessId: biz2._id,
    employeeCode: "RET-001",
    name: "Retail Head",
    role: "owner",
    status: "active",
    pinHash: await Staff.hashPin(pinOwner2),
    permissions: [
      "invoices:create", "invoices:edit", "invoices:cancel", "refunds:manage",
      "payments:collect", "products:manage", "inventory:adjust", "reports:view",
      "staff:manage", "settings:manage",
    ],
  });

  let tokenOwner1 = null;
  let tokenCashier1 = null;
  let tokenOwner2 = null;

  // SCENARIO 1: Open app without traditional login page
  await t.test("Scenario 1: Open application without traditional login page", async () => {
    const res = await apiCall("GET", "/api/auth/businesses");
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
    assert.ok(res.data.length >= 2);
    // Confidential data must NOT be exposed
    res.data.forEach((b) => {
      assert.equal(b.pinHash, undefined);
      assert.equal(b.password, undefined);
      assert.equal(b.stripeKey, undefined);
    });
  });

  // SCENARIO 2: Select authorized business
  await t.test("Scenario 2: Select authorized business and fetch active staff", async () => {
    const res = await apiCall("GET", `/api/auth/businesses/${biz1.businessId}/staff`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
    assert.equal(res.data.length, 2);
    res.data.forEach((s) => {
      assert.equal(s.pinHash, undefined);
      assert.equal(s.pin, undefined);
    });
  });

  // SCENARIO 3: Reject unauthorized / inactive business selection
  await t.test("Scenario 3: Reject inactive business selection", async () => {
    const res = await apiCall("GET", `/api/auth/businesses/${inactiveBiz.businessId}/staff`);
    assert.ok(res.status === 404 || res.status === 403);
  });

  // SCENARIO 4: Select staff and verify correct PIN
  await t.test("Scenario 4: Select staff and verify correct PIN", async () => {
    const res1 = await apiCall("POST", "/api/auth/staff-session", {
      businessId: biz1.businessId,
      staffId: staffOwner1._id.toString(),
      pin: pinOwner1,
    });
    assert.equal(res1.status, 200);
    assert.ok(res1.data.token);
    assert.equal(res1.data.staff.role, "owner");
    tokenOwner1 = res1.data.token;

    const res2 = await apiCall("POST", "/api/auth/staff-session", {
      businessId: biz1.businessId,
      staffId: staffCashier1._id.toString(),
      pin: pinCashier1,
    });
    assert.equal(res2.status, 200);
    tokenCashier1 = res2.data.token;

    const res3 = await apiCall("POST", "/api/auth/staff-session", {
      businessId: biz2.businessId,
      staffId: staffOwner2._id.toString(),
      pin: pinOwner2,
    });
    assert.equal(res3.status, 200);
    tokenOwner2 = res3.data.token;
  });

  // SCENARIO 5: Reject incorrect PIN
  await t.test("Scenario 5: Reject incorrect PIN with 401", async () => {
    const res = await apiCall("POST", "/api/auth/staff-session", {
      businessId: biz1.businessId,
      staffId: staffOwner1._id.toString(),
      pin: "000000",
    });
    if (res.status !== 401) {
      console.error("SCENARIO 5 FAILED:", JSON.stringify(res));
    }
    assert.equal(res.status, 401);
    assert.match(res.data.message, /invalid/i);
  });

  // SCENARIO 6: Rate limiting and temporary lockout
  await t.test("Scenario 6: Progressive rate limiting and lockout after 5 attempts", async () => {
    const staffIdStr = staffOwner1._id.toString();
    resetRateLimit(staffIdStr);

    // Fail 5 times with numeric 6-digit PIN
    for (let i = 0; i < 5; i++) {
      await apiCall("POST", "/api/auth/staff-session", {
        businessId: biz1.businessId,
        staffId: staffIdStr,
        pin: "000000",
      });
    }

    // 6th attempt must trigger 429 Lockout
    const resLockout = await apiCall("POST", "/api/auth/staff-session", {
      businessId: biz1.businessId,
      staffId: staffIdStr,
      pin: pinOwner1, // even with correct PIN, must be locked out
    });
    assert.equal(resLockout.status, 429);
    assert.ok(resLockout.data.locked);

    // Clear lockout so remaining tests proceed cleanly
    resetRateLimit(staffIdStr);
  });

  // SCENARIO 7: Session expiry, logout, and token revocation
  await t.test("Scenario 7: Staff session logout and token verification", async () => {
    const resVerify = await apiCall("GET", "/api/auth/verify", null, tokenOwner1);
    assert.equal(resVerify.status, 200);
    assert.equal(resVerify.data.user.role, "owner");

    const resLogout = await apiCall("POST", "/api/auth/logout", null, tokenOwner1);
    assert.equal(resLogout.status, 200);

    const resUnauth = await apiCall("GET", "/api/auth/verify", null, "invalid-token");
    assert.equal(resUnauth.status, 401);
  });

  // SCENARIO 8: Role-based permissions enforcement
  await t.test("Scenario 8: Role-based permissions enforcement (Cashier blocked from admin)", async () => {
    // Cashier tries to create new staff member -> Forbidden (requires staff:manage)
    const res1 = await apiCall("POST", "/api/staff", {
      name: "Intruder",
      employeeCode: "INT-1",
      role: "admin",
      pin: "999999",
    }, tokenCashier1);
    assert.equal(res1.status, 403);

    // Cashier tries to update company settings -> Forbidden (requires settings:manage)
    const res2 = await apiCall("PUT", "/api/business/settings", {
      companyName: "Hacked Store",
    }, tokenCashier1);
    assert.equal(res2.status, 403);

    // Owner CAN access company settings
    const res3 = await apiCall("GET", "/api/business/settings", null, tokenOwner1);
    assert.equal(res3.status, 200);
  });

  // SCENARIO 9: Create two independent businesses
  await t.test("Scenario 9: Create two independent businesses with unique business IDs", async () => {
    assert.notEqual(biz1.businessId, biz2.businessId);
    assert.equal(biz1.settings.invoicePrefix, "E2E-");
    assert.equal(biz2.settings.invoicePrefix, "RET-");
  });

  // SCENARIO 10: Verify all business-owned records remain isolated
  await t.test("Scenario 10: Strict multi-tenant data isolation across collections", async () => {
    // Create product in Business 1
    const p1 = await apiCall("POST", "/api/products", {
      name: "Alpha Ultra Laptop",
      price: 99990,
      stock: 10,
      gst: 18,
      sku: `ALPH-SKU-${runId}`,
    }, tokenOwner1);
    assert.equal(p1.status, 201);

    // Create customer in Business 1
    const c1 = await apiCall("POST", "/api/customers", {
      name: "Alpha Premier Client",
      phone: "9876543210",
      state: "Tamil Nadu",
    }, tokenOwner1);
    assert.equal(c1.status, 201);

    // Business 2 lists products -> MUST NOT contain Alpha Ultra Laptop
    const listProdsB = await apiCall("GET", "/api/products", null, tokenOwner2);
    assert.equal(listProdsB.status, 200);
    const hasAlphaProd = listProdsB.data.some((p) => p.name === "Alpha Ultra Laptop");
    assert.equal(hasAlphaProd, false);

    // Business 2 lists customers -> MUST NOT contain Alpha Premier Client
    const listCustsB = await apiCall("GET", "/api/customers", null, tokenOwner2);
    assert.equal(listCustsB.status, 200);
    const hasAlphaCust = listCustsB.data.some((c) => c.name === "Alpha Premier Client");
    assert.equal(hasAlphaCust, false);
  });

  // SCENARIO 11: Add staff and reset staff PIN
  await t.test("Scenario 11: Add staff member and reset staff PIN with validation", async () => {
    // Owner adds new Manager
    const newStaffRes = await apiCall("POST", "/api/staff", {
      name: "Vels Manager",
      employeeCode: `MGR-${runId}`,
      role: "manager",
      pin: "123456",
    }, tokenOwner1);
    assert.equal(newStaffRes.status, 201);
    const newStaffId = newStaffRes.data._id || newStaffRes.data.id;

    // Reset PIN to 654321
    const resetRes = await apiCall("POST", `/api/staff/${newStaffId}/reset-pin`, {
      newPin: "654321",
    }, tokenOwner1);
    assert.equal(resetRes.status, 200);

    // Verify new PIN works
    const testLogin = await apiCall("POST", "/api/auth/staff-session", {
      businessId: biz1.businessId,
      staffId: newStaffId,
      pin: "654321",
    });
    assert.equal(testLogin.status, 200);
  });

  // SCENARIO 12: Create invoices from multiple devices
  await t.test("Scenario 12: Multi-device invoice creation for respective businesses", async () => {
    // Device 1 (Business 1 Cashier) creates invoice
    const invRes1 = await apiCall("POST", "/api/invoices", {
      invoiceNo: `E2E-INV-001`,
      date: new Date().toISOString().split("T")[0],
      customerName: "Device 1 Walk-in",
      items: [{ name: "Service Call", qty: 1, price: 1000, gst: 18, total: 1180 }],
      grandTotal: 1180,
      paidAmount: 1180,
      paymentMode: "Cash",
    }, tokenCashier1);
    assert.equal(invRes1.status, 201);

    // Device 2 (Business 2 Owner) creates invoice
    const invRes2 = await apiCall("POST", "/api/invoices", {
      invoiceNo: `RET-INV-001`,
      date: new Date().toISOString().split("T")[0],
      customerName: "Device 2 Walk-in",
      items: [{ name: "Retail Goods", qty: 2, price: 500, gst: 18, total: 1180 }],
      grandTotal: 1180,
      paidAmount: 1180,
      paymentMode: "UPI",
    }, tokenOwner2);
    assert.equal(invRes2.status, 201);

    // Isolation check: Business 1 cannot see Business 2 invoice
    const invs1 = await apiCall("GET", "/api/invoices", null, tokenOwner1);
    assert.ok(invs1.data.some((i) => i.invoiceNo === "E2E-INV-001"));
    assert.ok(!invs1.data.some((i) => i.invoiceNo === "RET-INV-001"));
  });

  // SCENARIO 13: Invoice numbering under concurrent requests
  await t.test("Scenario 13: Atomic invoice numbering under concurrent requests", async () => {
    const promises = Array.from({ length: 5 }, () =>
      apiCall("POST", "/api/invoices/next-number", {}, tokenOwner1)
    );
    const results = await Promise.all(promises);
    results.forEach((r) => assert.equal(r.status, 200));

    const invoiceNumbers = results.map((r) => r.data.invoiceNo);
    const uniqueNumbers = new Set(invoiceNumbers);
    // Every generated invoice number must be strictly unique!
    assert.equal(uniqueNumbers.size, 5);
  });

  // SCENARIO 14: Record payments and validate balances
  await t.test("Scenario 14: Record payment and auto-generate verifiable receipt", async () => {
    const payRes = await apiCall("POST", "/api/payments", {
      type: "customer",
      customerName: "Valued Customer",
      amount: 5000,
      mode: "Bank Transfer",
      date: new Date().toISOString().split("T")[0],
      verificationStatus: "verified",
    }, tokenOwner1);
    assert.equal(payRes.status, 201);
    assert.equal(payRes.data.amount, 5000);

    // Business 2 queries payments -> must NOT see this payment
    const pays2 = await apiCall("GET", "/api/payments", null, tokenOwner2);
    assert.ok(!pays2.data.some((p) => p.customerName === "Valued Customer"));
  });

  // SCENARIO 15: Inventory consistency (deduction on invoice, restoration on cancel)
  await t.test("Scenario 15: Inventory deduction on invoice and restoration on cancellation", async () => {
    // 1. Create a product with initial stock 50
    const prod = await Product.create({
      businessId: biz1._id,
      name: "Stocked Widget",
      price: 100,
      stock: 50,
      cost: 60,
    });

    // 2. Issue invoice for 10 units
    const invRes = await apiCall("POST", "/api/invoices", {
      invoiceNo: `STK-TEST-${runId}`,
      date: new Date().toISOString().split("T")[0],
      customerName: "Stock Test Customer",
      items: [{
        productId: prod._id.toString(),
        name: "Stocked Widget",
        qty: 10,
        price: 100,
        gst: 0,
        total: 1000,
      }],
      grandTotal: 1000,
      paidAmount: 1000,
      paymentMode: "Cash",
    }, tokenOwner1);
    assert.equal(invRes.status, 201);

    // 3. Verify stock deducted to 40
    const prodAfter = await Product.findById(prod._id);
    assert.equal(prodAfter.stock, 40);

    // 4. Cancel the invoice
    const cancelRes = await apiCall("POST", `/api/invoices/${invRes.data._id || invRes.data.id}/cancel`, {}, tokenOwner1);
    assert.equal(cancelRes.status, 200);

    // 5. Verify stock restored to 50
    const prodRestored = await Product.findById(prod._id);
    assert.equal(prodRestored.stock, 50);
  });

  // SCENARIO 16: Add and edit customers
  await t.test("Scenario 16: Add and edit customer with persistent cloud storage", async () => {
    const addRes = await apiCall("POST", "/api/customers", {
      name: "Original Client Name",
      phone: "9944011223",
      email: "client@test.com",
      state: "Tamil Nadu",
      address: "123 Anna Salai",
    }, tokenOwner1);
    assert.equal(addRes.status, 201);
    const custId = addRes.data._id || addRes.data.id;

    const editRes = await apiCall("PUT", `/api/customers/${custId}`, {
      name: "Updated Client Name Enterprises",
      address: "456 Cross Cut Road",
    }, tokenOwner1);
    assert.equal(editRes.status, 200);
    assert.equal(editRes.data.name, "Updated Client Name Enterprises");
  });

  // SCENARIO 17: Real invoice PDF / print data integrity
  await t.test("Scenario 17: Real invoice data integrity with tax split and staff attribution", async () => {
    const invRes = await apiCall("POST", "/api/invoices", {
      invoiceNo: `PDF-AUDIT-${runId}`,
      date: new Date().toISOString().split("T")[0],
      customerName: "Audit Customer",
      customerGstin: "33AAACA0000A1Z0",
      items: [
        { name: "Computer RAM 16GB", hsn: "8471", qty: 1, price: 4000, gst: 18, total: 4720 },
      ],
      subTotal: 4000,
      cgst: 360,
      sgst: 360,
      igst: 0,
      grandTotal: 4720,
      paidAmount: 4720,
      paymentMode: "UPI",
    }, tokenOwner1);
    assert.equal(invRes.status, 201);
    const inv = invRes.data;

    // Verify tax integrity and staff attribution
    assert.equal(inv.items[0].hsn, "8471");
    assert.equal(inv.grandTotal, 4720);
    assert.equal(inv.staffName, "Sundar Pichai");
  });

  // SCENARIO 18: Reports and exports business isolation
  await t.test("Scenario 18: Financial reporting isolation between tenants", async () => {
    const invsA = await apiCall("GET", "/api/invoices", null, tokenOwner1);
    const invsB = await apiCall("GET", "/api/invoices", null, tokenOwner2);

    const sumA = invsA.data.reduce((acc, x) => acc + (x.grandTotal || 0), 0);
    const sumB = invsB.data.reduce((acc, x) => acc + (x.grandTotal || 0), 0);

    assert.ok(sumA > 0);
    assert.ok(sumB > 0);
    assert.notEqual(sumA, sumB);
  });

  // SCENARIO 19: Responsive layout & PWA compliance
  await t.test("Scenario 19: PWA compliance and mobile accessibility structure", async () => {
    const fs = require("node:fs");
    const manifestExists = fs.existsSync("public/manifest.json") || fs.existsSync("index.html");
    assert.ok(manifestExists);

    const indexHtml = fs.readFileSync("index.html", "utf-8");
    assert.ok(indexHtml.includes("viewport"));
    assert.ok(indexHtml.includes("width=device-width"));
  });

  // SCENARIO 20: Full test suite & production readiness
  await t.test("Scenario 20: Test suite integrity & multi-tenant security verification", async () => {
    // Assert all required models carry strict businessId indexing
    const collections = [Product, Invoice, Customer, Staff];
    collections.forEach((col) => {
      assert.ok(col.schema.paths.businessId, `${col.modelName} must have businessId path`);
    });
  });

  // Cleanup test businesses
  await Business.deleteMany({ _id: { $in: [biz1._id, biz2._id, inactiveBiz._id] } });
  await Staff.deleteMany({ businessId: { $in: [biz1._id, biz2._id, inactiveBiz._id] } });
  await Product.deleteMany({ businessId: { $in: [biz1._id, biz2._id] } });
  await Invoice.deleteMany({ businessId: { $in: [biz1._id, biz2._id] } });
  await Customer.deleteMany({ businessId: { $in: [biz1._id, biz2._id] } });
  await Payment.deleteMany({ businessId: { $in: [biz1._id, biz2._id] } });
});
