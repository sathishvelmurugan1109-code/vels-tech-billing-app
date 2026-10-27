// server/tests/multi-tenant-pin.test.js — Multi-Tenant Isolation & PIN Authentication Tests
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
const { resetRateLimit } = require("../utils/pinRateLimiter");

test("Multi-Tenant Isolation & PIN Verification Test Suite", async (t) => {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/vels_billing";
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    return new Promise((resolve) => server.close(resolve));
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  // Create two isolated test businesses
  const prefix = `TEST_${Date.now()}`;
  const bizA = await Business.create({
    businessName: `${prefix} Business Alpha`,
    ownerName: "Alpha Owner",
    email: `${prefix}_alpha@test.com`,
    status: "active",
    settings: { invoicePrefix: "ALPH-", startingInvoiceNo: 1, companyName: "Alpha Store" },
  });

  const bizB = await Business.create({
    businessName: `${prefix} Business Beta`,
    ownerName: "Beta Owner",
    email: `${prefix}_beta@test.com`,
    status: "active",
    settings: { invoicePrefix: "BETA-", startingInvoiceNo: 1, companyName: "Beta Store" },
  });

  const pinAlpha = "123456";
  const pinBeta = "654321";

  const staffAlpha = await Staff.create({
    businessId: bizA._id,
    employeeCode: "STAFF-A",
    name: "Alpha Staff Member",
    role: "owner",
    status: "active",
    pinHash: await Staff.hashPin(pinAlpha),
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

  const staffBeta = await Staff.create({
    businessId: bizB._id,
    employeeCode: "STAFF-B",
    name: "Beta Staff Member",
    role: "cashier",
    status: "active",
    pinHash: await Staff.hashPin(pinBeta),
    permissions: ["invoices:create", "payments:collect", "products:manage"],
  });

  resetRateLimit(staffAlpha._id);
  resetRateLimit(staffBeta._id);

  t.after(async () => {
    // Cleanup test data
    await Business.deleteMany({ _id: { $in: [bizA._id, bizB._id] } });
    await Staff.deleteMany({ businessId: { $in: [bizA._id, bizB._id] } });
    await Product.deleteMany({ businessId: { $in: [bizA._id, bizB._id] } });
    await Invoice.deleteMany({ businessId: { $in: [bizA._id, bizB._id] } });
    await Customer.deleteMany({ businessId: { $in: [bizA._id, bizB._id] } });
    await mongoose.connection.close();
  });

  let tokenA = "";
  let tokenB = "";

  await t.test("1. Business selection and safe staff listing", async () => {
    // List businesses
    const resBiz = await fetch(`${baseUrl}/api/auth/businesses`);
    assert.equal(resBiz.status, 200);
    const businesses = await resBiz.json();
    assert(Array.isArray(businesses));
    const foundA = businesses.find((b) => b.id === bizA._id.toString());
    assert(foundA, "Business Alpha must be in public businesses list");
    assert.equal(foundA.businessName, `${prefix} Business Alpha`);
    assert.equal(foundA.pinHash, undefined);

    // List staff for Business Alpha
    const resStaff = await fetch(`${baseUrl}/api/auth/businesses/${bizA._id}/staff`);
    assert.equal(resStaff.status, 200);
    const staffList = await resStaff.json();
    assert.equal(staffList.length, 1);
    assert.equal(staffList[0].employeeCode, "STAFF-A");
    assert.equal(staffList[0].pinHash, undefined);
  });

  await t.test("2. Staff PIN verification and rate limiting", async () => {
    // Reject wrong PIN
    const failRes = await fetch(`${baseUrl}/api/auth/staff-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: bizA._id.toString(),
        staffId: staffAlpha._id.toString(),
        pin: "000000",
      }),
    });
    assert.equal(failRes.status, 401);
    const failData = await failRes.json();
    assert(failData.remainingAttempts !== undefined);

    // Cross-tenant mismatch (Trying to use Staff A with Business B)
    const mismatchRes = await fetch(`${baseUrl}/api/auth/staff-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: bizB._id.toString(),
        staffId: staffAlpha._id.toString(),
        pin: pinAlpha,
      }),
    });
    assert.equal(mismatchRes.status, 404);

    // Successful authentication for Alpha
    const authResA = await fetch(`${baseUrl}/api/auth/staff-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: bizA._id.toString(),
        staffId: staffAlpha._id.toString(),
        pin: pinAlpha,
      }),
    });
    assert.equal(authResA.status, 200);
    const authDataA = await authResA.json();
    assert(authDataA.token, "Token must be returned");
    assert.equal(authDataA.staff.employeeCode, "STAFF-A");
    assert.equal(authDataA.business.businessName, `${prefix} Business Alpha`);
    tokenA = authDataA.token;

    // Successful authentication for Beta
    const authResB = await fetch(`${baseUrl}/api/auth/staff-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessId: bizB._id.toString(),
        staffId: staffBeta._id.toString(),
        pin: pinBeta,
      }),
    });
    assert.equal(authResB.status, 200);
    const authDataB = await authResB.json();
    tokenB = authDataB.token;
  });

  await t.test("3. Multi-tenant data isolation for products and customers", async () => {
    // Business Alpha creates Product A
    const prodResA = await fetch(`${baseUrl}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: "Alpha Exclusive Widget",
        price: 1500,
        stock: 50,
        unit: "pcs",
      }),
    });
    assert.equal(prodResA.status, 201);
    const prodA = await prodResA.json();
    assert.equal(prodA.name, "Alpha Exclusive Widget");

    // Business Beta creates Product B
    const prodResB = await fetch(`${baseUrl}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        name: "Beta Exclusive Gadget",
        price: 2500,
        stock: 30,
        unit: "pcs",
      }),
    });
    assert.equal(prodResB.status, 201);
    const prodB = await prodResB.json();

    // Verify Business Beta CANNOT see Product A
    const listResB = await fetch(`${baseUrl}/api/products`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(listResB.status, 200);
    const listB = await listResB.json();
    assert.equal(listB.length, 1);
    assert.equal(listB[0].name, "Beta Exclusive Gadget");
    assert(!listB.some((p) => p.name === "Alpha Exclusive Widget"));

    // Verify Business Beta CANNOT fetch Product A by direct ID
    const directRes = await fetch(`${baseUrl}/api/products/${prodA.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(directRes.status, 404);

    // Verify Business Beta CANNOT modify Product A
    const updateRes = await fetch(`${baseUrl}/api/products/${prodA.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ price: 10 }),
    });
    assert.equal(updateRes.status, 404);

    // Verify Business Beta CANNOT delete Product A
    const deleteRes = await fetch(`${baseUrl}/api/products/${prodA.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert.equal(deleteRes.status, 404);
  });

  await t.test("4. Atomic invoice sequence and stock deduction", async () => {
    // Generate next invoice number for Business Alpha
    const seqRes1 = await fetch(`${baseUrl}/api/invoices/next-number`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(seqRes1.status, 200);
    const seq1 = await seqRes1.json();
    assert.equal(seq1.invoiceNo, "ALPH-0001");

    // Fetch Product A id and stock
    const prodListA = await (
      await fetch(`${baseUrl}/api/products`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      })
    ).json();
    const prod = prodListA[0];
    const initialStock = prod.stock;

    // Create invoice in Business Alpha
    const invRes = await fetch(`${baseUrl}/api/invoices`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        invoiceNo: seq1.invoiceNo,
        date: "2026-10-27",
        customerName: "Alpha Customer",
        items: [
          {
            productId: prod.id,
            name: prod.name,
            price: 1500,
            qty: 5,
            gst: 18,
          },
        ],
        grandTotal: 8850,
        paidAmount: 8850,
        paymentStatus: "Paid",
        paymentMode: "Cash",
      }),
    });
    assert.equal(invRes.status, 201);
    const createdInv = await invRes.json();
    assert.equal(createdInv.invoiceNo, "ALPH-0001");

    // Verify stock decremented by 5
    const updatedProd = await (
      await fetch(`${baseUrl}/api/products/${prod.id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      })
    ).json();
    assert.equal(updatedProd.stock, initialStock - 5);

    // Verify Business Beta cannot see Alpha's invoice
    const invListB = await (
      await fetch(`${baseUrl}/api/invoices`, {
        headers: { Authorization: `Bearer ${tokenB}` },
      })
    ).json();
    assert.equal(invListB.length, 0);

    // Cancel invoice in Alpha and verify stock restored
    const cancelRes = await fetch(`${baseUrl}/api/invoices/${createdInv.id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert.equal(cancelRes.status, 200);

    const restoredProd = await (
      await fetch(`${baseUrl}/api/products/${prod.id}`, {
        headers: { Authorization: `Bearer ${tokenA}` },
      })
    ).json();
    assert.equal(restoredProd.stock, initialStock);
  });

  await t.test("5. Role permissions and privilege enforcement", async () => {
    // Staff Beta has role 'cashier' without 'settings:manage' or 'staff:manage'
    const settingsRes = await fetch(`${baseUrl}/api/business/current`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ businessName: "Hacked Beta Name" }),
    });
    assert.equal(settingsRes.status, 403, "Cashier must be rejected from modifying settings");

    // Staff Beta cannot add staff
    const addStaffRes = await fetch(`${baseUrl}/api/staff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ employeeCode: "HACK", name: "Hacker" }),
    });
    assert.equal(addStaffRes.status, 403, "Cashier must be rejected from adding staff");
  });
});
