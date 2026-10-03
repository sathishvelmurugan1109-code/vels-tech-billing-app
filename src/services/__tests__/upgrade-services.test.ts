import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildUpiUri, generateQrSvg, generateQrDataUrl } from "../qrService";
import {
  EXPENSE_CATEGORIES,
  filterExpenses,
  sumExpenses,
  summarizeExpensesByCategory,
  calculateNetProfitSummary,
} from "../expenseService";
import {
  summarizeSuppliers,
  generateSupplierLedger,
} from "../supplierService";
import type { Expense, Supplier, Purchase, Payment } from "../../types";

describe("qrService — UPI string & SVG builder", () => {
  it("builds compliant UPI pay URLs", () => {
    const url = buildUpiUri({
      upiId: "velstech@okaxis",
      upiName: "Vels Tech",
      amount: 1540.5,
      note: "Invoice INV-1001",
    });

    assert.ok(url.startsWith("upi://pay?"));
    assert.ok(url.includes("pa=velstech%40okaxis") || url.includes("pa=velstech@okaxis"));
    assert.ok(url.includes("am=1540.50"));
    assert.ok(url.includes("cu=INR"));
  });

  it("handles empty or zero amount gracefully without negative values", () => {
    const url = buildUpiUri({
      upiId: "shop@upi",
      upiName: "Shop Owner",
      amount: 0,
    });
    // When amount is 0, it shouldn't produce a negative or broken query
    assert.ok(url.startsWith("upi://pay?"));
    assert.ok(!url.includes("am=-"));
  });

  it("generates an SVG string representation of QR matrix", () => {
    const svg = generateQrSvg("upi://pay?pa=test@upi&pn=Test", 200);
    assert.ok(svg.includes("<svg"));
    assert.ok(svg.includes("</svg>"));
    assert.ok(svg.includes('viewBox="0 0 200 200"'));
  });

  it("generates data URL for HTML img display", () => {
    const dataUrl = generateQrDataUrl("upi://pay?pa=test@upi", 150);
    assert.ok(dataUrl.startsWith("data:image/svg+xml;utf8,"));
  });
});

describe("expenseService — operating expenses and net profit", () => {
  const expenses: Expense[] = [
    {
      id: "exp-1",
      date: "2026-10-01",
      category: "Rent",
      description: "Shop rent for October",
      amount: 12000,
      paymentMethod: "UPI",
      reference: "RENT-OCT",
      createdAt: "2026-10-01T10:00:00.000Z",
    },
    {
      id: "exp-2",
      date: "2026-10-02",
      category: "Electricity",
      description: "TNEB power bill",
      amount: 2500,
      paymentMethod: "Cash",
      createdAt: "2026-10-02T11:00:00.000Z",
    },
    {
      id: "exp-3",
      date: "2026-10-02",
      category: "Salary",
      description: "Assistant technician salary",
      amount: 15000,
      paymentMethod: "Bank Transfer",
      createdAt: "2026-10-02T12:00:00.000Z",
    },
  ];

  it("aggregates expenses accurately", () => {
    const total = sumExpenses(expenses);
    assert.equal(total, 29500);

    const categories = summarizeExpensesByCategory(expenses);
    assert.equal(categories.length, 3);
    assert.equal(categories[0].category, "Salary");
    assert.equal(categories[0].amount, 15000);
  });

  it("calculates net profit by deducting operating expenses from gross profit", () => {
    const revenue = 100000;
    const cogs = 50000; // gross profit = 50000
    const totalExpenses = 29500;
    const summary = calculateNetProfitSummary(revenue, cogs, totalExpenses, true);

    assert.equal(summary.grossProfit, 50000);
    assert.equal(summary.netProfit, 20500);
    assert.equal(summary.netMarginPct, 20.5);
  });

  it("filters expenses by category and search", () => {
    const filtered = filterExpenses(expenses, { category: "Electricity" });
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].amount, 2500);

    const searchResult = filterExpenses(expenses, { search: "technician" });
    assert.equal(searchResult.length, 1);
    assert.equal(searchResult[0].category, "Salary");
  });
});

describe("supplierService — supplier transactions & statement ledger", () => {
  const supplier: Supplier = {
    id: "sup-1",
    name: "Sri Lakshmi Traders",
    phone: "9876543210",
    email: "lakshmi@example.com",
    address: "Palladam",
    state: "Tamil Nadu",
    openingBalance: 5000,
    createdAt: "2026-09-01T00:00:00.000Z",
  };

  const purchases: Purchase[] = [
    {
      id: "pur-1",
      purchaseNo: "PUR-101",
      supplierId: "sup-1",
      supplierName: "Sri Lakshmi Traders",
      supplierInvoiceNo: "SINV-88",
      date: "2026-10-01",
      items: [
        {
          productId: "prod-1",
          name: "Thermal Paper Roll",
          quantity: 10,
          purchasePrice: 100,
          gstRate: 18,
          taxableAmount: 1000,
          gstAmount: 180,
          totalAmount: 1180,
        },
      ],
      subtotal: 1000,
      discountAmount: 0,
      taxableAmount: 1000,
      totalGst: 180,
      grandTotal: 1180,
      paidAmount: 1000,
      balanceAmount: 180,
      paymentMode: "UPI",
      status: "Received",
      createdAt: "2026-10-01T10:00:00.000Z",
    },
  ];

  const payments: Payment[] = [
    {
      id: "pay-1",
      receiptNo: "RCP-101",
      partyType: "supplier",
      partyId: "sup-1",
      partyName: "Sri Lakshmi Traders",
      amount: 180,
      date: "2026-10-02",
      paymentMethod: "Cash",
      reference: "CASH-180",
      notes: "Settled balance for PUR-101",
      createdAt: "2026-10-02T14:00:00.000Z",
    },
  ];

  it("calculates supplier total purchases, payments, and outstanding balance correctly", () => {
    const summaries = summarizeSuppliers([supplier], purchases, payments);
    assert.equal(summaries.length, 1);
    const summary = summaries[0];
    assert.equal(summary.totalPurchases, 1180);
    // Paid in purchase (1000) + explicit payment voucher (180) = 1180
    assert.equal(summary.totalPaid, 1180);
    assert.equal(summary.outstanding, 5000);
  });

  it("generates date-sorted ledger entries with running balance", () => {
    const ledger = generateSupplierLedger(supplier, purchases, payments);
    assert.ok(ledger.length >= 3);
    assert.equal(ledger[0].type, "Opening Balance");
    assert.equal(ledger[0].credit, 5000);
    assert.equal(ledger[ledger.length - 1].balance, 5000);
  });
});

import {
  safeGetStorage,
  safeSetStorage,
  transactionalStorageUpdate,
  createFullBackup,
  validateAndRestoreBackup,
  STORAGE_KEYS,
} from "../storageService";

describe("storageService — transactional storage & backup validation", () => {
  it("safely reads and writes keys with fallback", () => {
    safeSetStorage("test_key", { shop: "Vels Tech" });
    const val = safeGetStorage("test_key", { shop: "" });
    assert.equal(val.shop, "Vels Tech");

    const fallback = safeGetStorage("non_existent_key", "default_val");
    assert.equal(fallback, "default_val");
  });

  it("performs atomic transactional updates across keys", () => {
    const ok = transactionalStorageUpdate([
      { key: "tx_k1", value: [1, 2, 3] },
      { key: "tx_k2", value: { active: true } },
    ]);
    assert.equal(ok, true);
    assert.deepEqual(safeGetStorage("tx_k1", []), [1, 2, 3]);
  });

  it("generates and restores valid full backup payload", () => {
    const backup = createFullBackup({
      products: [],
      customers: [],
      suppliers: [],
      invoices: [],
      purchases: [],
      payments: [],
      stockMovements: [],
      salesReturns: [],
      expenses: [],
      settings: {
        companyName: "VELS TECH",
      },
    });

    assert.equal(backup.version, 2);
    assert.equal(backup.appName, "VELS TECH Billing");
    assert.ok(Array.isArray(backup.products));

    let restoredPayload: typeof backup | null = null;
    const result = validateAndRestoreBackup(JSON.stringify(backup), (data) => {
      restoredPayload = data;
    });

    assert.equal(result.ok, true);
    assert.ok(restoredPayload !== null);
  });

  it("rejects corrupted or incomplete backup files", () => {
    const invalidJson = "{ corrupted json ";
    const res1 = validateAndRestoreBackup(invalidJson, () => {});
    assert.equal(res1.ok, false);

    const missingArrays = JSON.stringify({ version: 2, appName: "test" });
    const res2 = validateAndRestoreBackup(missingArrays, () => {});
    assert.equal(res2.ok, false);
    assert.ok(res2.error?.includes("missing"));
  });
});

