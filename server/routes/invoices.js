// server/routes/invoices.js — Enterprise Business-Scoped Invoicing & Atomic Sync
const express = require("express");
const { authenticate, requirePermission } = require("../middleware/auth");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");
const Product = require("../models/Product");
const Business = require("../models/Business");
const StockMovement = require("../models/StockMovement");

const router = express.Router();

function addId(item) {
  if (!item) return null;
  const value = item.toObject ? item.toObject() : { ...item };
  value.id = value._id ? value._id.toString() : value.id;
  return value;
}

// GET /api/invoices — list all invoices for the authenticated business
router.get("/", authenticate, async (req, res) => {
  try {
    const invoices = await Invoice.find({ businessId: req.businessId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(invoices.map(addId));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch invoices", error: err.message });
  }
});

// GET /api/invoices/:id — get single invoice
router.get("/:id", authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, businessId: req.businessId }).lean();
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });
    res.json(addId(invoice));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch invoice", error: err.message });
  }
});

// POST /api/invoices/next-number — Atomic sequence generator for unique invoice numbers
router.post("/next-number", authenticate, async (req, res) => {
  try {
    const business = await Business.findById(req.businessId);
    if (!business) return res.status(404).json({ message: "Business not found" });

    const prefix = business.settings?.invoicePrefix || "INV-";
    const existingCount = await Invoice.countDocuments({ businessId: req.businessId });

    // Sync baseline counter if needed
    if (!business.usage?.invoices || business.usage.invoices < existingCount) {
      await Business.findByIdAndUpdate(req.businessId, {
        $set: { "usage.invoices": existingCount },
      });
    }

    // Atomic increment
    const updated = await Business.findByIdAndUpdate(
      req.businessId,
      { $inc: { "usage.invoices": 1 } },
      { new: true }
    );

    const seq = updated.usage?.invoices || existingCount + 1;
    const invoiceNo = `${prefix}${String(seq).padStart(4, "0")}`;
    res.json({ invoiceNo, sequence: seq });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate invoice sequence", error: err.message });
  }
});

// POST /api/invoices — Create final invoice with atomic stock deduction & payment record
router.post("/", authenticate, requirePermission("invoices:create"), async (req, res) => {
  try {
    const invoiceData = { ...req.body };
    delete invoiceData._id;
    delete invoiceData.id;

    if (!Array.isArray(invoiceData.items) || invoiceData.items.length === 0) {
      return res.status(400).json({ message: "Invoice must contain at least one line item" });
    }

    if (!invoiceData.invoiceNo || !String(invoiceData.invoiceNo).trim()) {
      return res.status(400).json({ message: "Invoice number is required" });
    }

    invoiceData.businessId = req.businessId;
    invoiceData.staffId = req.staffId || "";
    invoiceData.staffName = req.staff?.name || req.user?.name || "Staff";
    invoiceData.staffRole = req.userRole || "cashier";

    // Create the invoice
    const invoice = await Invoice.create(invoiceData);

    // Atomically decrement stock and log movement
    for (const item of invoice.items) {
      if (item.productId && item.qty > 0) {
        try {
          await Product.findOneAndUpdate(
            { _id: item.productId, businessId: req.businessId },
            { $inc: { stock: -item.qty } }
          );

          await StockMovement.create({
            businessId: req.businessId,
            productId: item.productId,
            productName: item.name,
            type: "out",
            qty: item.qty,
            reason: "Sale",
            reference: invoice.invoiceNo,
            date: invoice.date || new Date().toISOString().slice(0, 10),
            staffId: req.staffId || "",
            staffName: req.staff?.name || "Staff",
          });
        } catch (stockErr) {
          console.warn("[Invoices] Stock deduction error for product:", item.productId, stockErr.message);
        }
      }
    }

    // If paid immediately, create matching Payment record
    if (invoice.paidAmount > 0 || invoice.paymentStatus === "Paid") {
      try {
        const idempotencyKey = `${invoice._id.toString()}:initial-payment`;
        await Payment.findOneAndUpdate(
          { businessId: req.businessId, idempotencyKey },
          {
            $setOnInsert: {
              businessId: req.businessId,
              idempotencyKey,
              type: "customer",
              customerId: invoice.customerId || "",
              customerName: invoice.customerName || "Walk-in Customer",
              invoiceId: invoice._id.toString(),
              invoiceNo: invoice.invoiceNo,
              amount: invoice.paidAmount || invoice.grandTotal,
              mode: invoice.paymentMode || "Cash",
              date: invoice.date || new Date().toISOString().slice(0, 10),
              reference: "",
              notes: `Payment for ${invoice.invoiceNo}`,
              verificationStatus: "verified",
              verificationMethod: "manual",
              staffId: req.staffId || "",
              staffName: req.staff?.name || "Staff",
              verifiedAt: new Date(),
            },
          },
          { upsert: true, new: true }
        );
      } catch (payErr) {
        console.warn("[Invoices] Payment record error:", payErr.message);
      }
    }

    res.status(201).json(addId(invoice));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Invoice number already exists in this business" });
    }
    console.error("[Invoices] Create error:", err);
    res.status(500).json({ message: "Failed to create invoice", error: err.message });
  }
});

// POST /api/invoices/drafts — Save / update draft
router.post("/drafts", authenticate, async (req, res) => {
  try {
    const draft = req.body;
    if (
      typeof draft?.invoiceNo !== "string" ||
      !draft.invoiceNo.trim() ||
      !Array.isArray(draft.items) ||
      draft.items.length === 0 ||
      !Number.isFinite(Number(draft.grandTotal)) ||
      Number(draft.grandTotal) < 0
    ) {
      return res.status(400).json({ message: "A valid invoice draft is required." });
    }

    const { id, _id, ...invoiceData } = draft;
    const saved = await Invoice.findOneAndUpdate(
      {
        businessId: req.businessId,
        invoiceNo: draft.invoiceNo.trim(),
        status: "Draft",
      },
      {
        $set: {
          ...invoiceData,
          invoiceNo: draft.invoiceNo.trim(),
          businessId: req.businessId,
          paymentMode: draft.paymentMode || "UPI",
          paymentStatus: "Pending",
          paidAmount: 0,
          status: "Draft",
          staffId: req.staffId || "",
          staffName: req.staff?.name || "Staff",
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json(addId(saved));
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "This invoice number is already in use." });
    }
    console.error("[Invoices] Could not save payment draft:", error);
    return res.status(500).json({ message: "Could not save the invoice draft." });
  }
});

// POST /api/invoices/:id/manual-payment — Confirm payment on draft
router.post("/:id/manual-payment", authenticate, async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });
    if (!invoice) return res.status(404).json({ message: "Invoice draft not found." });

    const idempotencyKey = `${invoice._id.toString()}:manual-confirmation`;
    if (invoice.paymentStatus === "Paid" && invoice.status === "Paid") {
      const existingPayment = await Payment.findOne({
        businessId: req.businessId,
        idempotencyKey,
      });
      if (!existingPayment) {
        return res.status(409).json({ message: "Paid invoice is missing its payment record." });
      }
      return res.json({ invoice: addId(invoice), payment: addId(existingPayment) });
    }
    if (invoice.status !== "Draft" || invoice.paymentStatus !== "Pending") {
      return res.status(409).json({ message: "This invoice is not awaiting manual payment confirmation." });
    }

    const confirmedAt = new Date();
    let payment;
    try {
      payment = await Payment.findOneAndUpdate(
        { businessId: req.businessId, idempotencyKey },
        {
          $setOnInsert: {
            businessId: req.businessId,
            idempotencyKey,
            type: "customer",
            customerId: invoice.customerId,
            customerName: invoice.customerName,
            invoiceId: invoice._id.toString(),
            invoiceNo: invoice.invoiceNo,
            amount: invoice.grandTotal,
            mode: "UPI",
            date: confirmedAt.toISOString().slice(0, 10),
            reference: "",
            notes: "Manually confirmed by authenticated staff; not gateway verified.",
            verificationStatus: "pending",
            verificationMethod: "manual",
            manualConfirmationBy: req.userId,
            manualConfirmedAt: confirmedAt,
            staffId: req.staffId || "",
            staffName: req.staff?.name || "Staff",
          },
        },
        { new: true, upsert: true, runValidators: true },
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
      payment = await Payment.findOne({ businessId: req.businessId, idempotencyKey });
      if (!payment) throw error;
    }

    if (payment.amount !== invoice.grandTotal || payment.invoiceId !== invoice._id.toString()) {
      return res.status(409).json({ message: "A conflicting payment record already exists." });
    }

    invoice.paymentMode = "UPI";
    invoice.paymentStatus = "Paid";
    invoice.status = "Paid";
    invoice.paidAmount = invoice.grandTotal;
    invoice.manualPaymentConfirmedBy = req.userId;
    invoice.manualPaymentConfirmedAt = payment.manualConfirmedAt;
    await invoice.save();

    return res.json({ invoice: addId(invoice), payment: addId(payment) });
  } catch (error) {
    console.error("[Invoices] Could not confirm manual payment:", error);
    return res.status(500).json({ message: "Could not save the payment. The draft is still available to retry." });
  }
});

// POST /api/invoices/:id/cancel — Cancel invoice and restore inventory
router.post("/:id/cancel", authenticate, requirePermission("invoices:cancel"), async (req, res) => {
  try {
    const invoice = await Invoice.findOne({
      _id: req.params.id,
      businessId: req.businessId,
    });
    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    if (invoice.status === "Cancelled") {
      return res.status(400).json({ message: "Invoice is already cancelled" });
    }

    invoice.status = "Cancelled";
    invoice.paymentStatus = "Cancelled";
    await invoice.save();

    // Restore stock
    for (const item of invoice.items) {
      if (item.productId && item.qty > 0) {
        try {
          await Product.findOneAndUpdate(
            { _id: item.productId, businessId: req.businessId },
            { $inc: { stock: item.qty } }
          );

          await StockMovement.create({
            businessId: req.businessId,
            productId: item.productId,
            productName: item.name,
            type: "in",
            qty: item.qty,
            reason: `Invoice ${invoice.invoiceNo} Cancelled`,
            reference: invoice.invoiceNo,
            date: new Date().toISOString().slice(0, 10),
            staffId: req.staffId || "",
            staffName: req.staff?.name || "Staff",
          });
        } catch (stockErr) {
          console.warn("[Invoices] Stock restore error:", stockErr.message);
        }
      }
    }

    res.json({ message: "Invoice cancelled and stock restored successfully", invoice: addId(invoice) });
  } catch (err) {
    res.status(500).json({ message: "Failed to cancel invoice", error: err.message });
  }
});

module.exports = router;
