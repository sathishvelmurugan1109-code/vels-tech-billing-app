const express = require("express");
const { authenticate } = require("../middleware/auth");
const Invoice = require("../models/Invoice");
const Payment = require("../models/Payment");

const router = express.Router();

function addId(item) {
  const value = item.toObject ? item.toObject() : item;
  value.id = value._id.toString();
  return value;
}

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
          paymentMode: "UPI",
          paymentStatus: "Pending",
          paidAmount: 0,
          status: "Draft",
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

module.exports = router;
