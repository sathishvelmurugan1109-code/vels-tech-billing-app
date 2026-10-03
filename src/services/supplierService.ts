/**
 * supplierService.ts — Supplier Management & Ledger Engine (PHASE 9).
 */

import { addMoney, roundMoney, subtractMoney, sumMoney, toNumber } from "./money";
import { supplierOutstanding as computeSupplierOutstanding } from "./purchaseService";
import type { Supplier, Purchase, Payment } from "../types";

export type SupplierSummaryRow = {
  supplier: Supplier;
  totalPurchases: number;
  totalPaid: number;
  outstanding: number;
  purchaseCount: number;
};

/**
 * Computes live summary for each supplier across purchases and payment vouchers.
 */
export function summarizeSuppliers(
  suppliers: Supplier[],
  purchases: Purchase[],
  payments: Payment[] = [],
): SupplierSummaryRow[] {
  return (suppliers || []).map((supplier) => {
    const sPurchases = (purchases || []).filter((p) => p.supplierId === supplier.id);
    const sPayments = (payments || []).filter(
      (pay) => pay.partyType === "supplier" && pay.partyId === supplier.id,
    );

    const totalPurchases = sumMoney(sPurchases.map((p) => p.grandTotal));
    const purchasePaid = sumMoney(sPurchases.map((p) => p.paidAmount));
    const directPaid = sumMoney(sPayments.map((p) => p.amount));
    const totalPaid = addMoney(purchasePaid, directPaid);

    // Initial opening balance owed to supplier
    const opening = Math.max(0, toNumber(supplier.openingBalance));
    const calculatedOutstanding = Math.max(
      0,
      subtractMoney(addMoney(opening, totalPurchases), totalPaid),
    );

    return {
      supplier,
      totalPurchases,
      totalPaid,
      outstanding: calculatedOutstanding,
      purchaseCount: sPurchases.length,
    };
  });
}

export type SupplierLedgerEntry = {
  id: string;
  date: string;
  type: "Opening Balance" | "Purchase" | "Payment" | "Purchase Return";
  reference: string;
  debit: number; // payment made to supplier (decreases balance)
  credit: number; // purchase from supplier (increases balance)
  balance: number; // running outstanding
  notes?: string;
};

/**
 * Generates an itemised ledger statement for a supplier.
 */
export function generateSupplierLedger(
  supplier: Supplier,
  purchases: Purchase[],
  payments: Payment[],
): SupplierLedgerEntry[] {
  const entries: Array<Omit<SupplierLedgerEntry, "balance">> = [];

  // Opening balance
  const opening = Math.max(0, toNumber(supplier.openingBalance));
  if (opening > 0) {
    entries.push({
      id: `open-${supplier.id}`,
      date: "2026-01-01",
      type: "Opening Balance",
      reference: "Opening Balance",
      debit: 0,
      credit: opening,
      notes: "Account opening balance",
    });
  }

  // Purchases
  (purchases || [])
    .filter((p) => p.supplierId === supplier.id)
    .forEach((p) => {
      entries.push({
        id: p.id,
        date: p.date,
        type: "Purchase",
        reference: p.purchaseNo || p.supplierInvoiceNo || "Purchase",
        debit: 0,
        credit: p.grandTotal,
        notes: p.notes,
      });

      if (p.paidAmount > 0) {
        entries.push({
          id: `${p.id}-paid`,
          date: p.date,
          type: "Payment",
          reference: `Paid on ${p.purchaseNo}`,
          debit: p.paidAmount,
          credit: 0,
          notes: `${p.paymentMode} payment`,
        });
      }
    });

  // Direct payments
  (payments || [])
    .filter((pay) => pay.partyType === "supplier" && pay.partyId === supplier.id)
    .forEach((pay) => {
      entries.push({
        id: pay.id,
        date: pay.date,
        type: "Payment",
        reference: pay.receiptNo || "Payment Voucher",
        debit: pay.amount,
        credit: 0,
        notes: pay.notes || pay.reference,
      });
    });

  // Sort by date ascending
  entries.sort((a, b) => a.date.localeCompare(b.date));

  // Compute running balance
  let running = 0;
  return entries.map((entry) => {
    running = addMoney(running, entry.credit);
    running = subtractMoney(running, entry.debit);
    return {
      ...entry,
      balance: Math.max(0, running),
    };
  });
}
