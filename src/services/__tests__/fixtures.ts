/**
 * Shared fixtures for the calculation-engine test suite.
 * All data flows through the real engines — no golden files, no mocks.
 */
import type { InvoiceBuildInput } from "../invoiceService";
import { buildInvoiceRecord } from "../invoiceService";

export const BUSINESS = "Tamil Nadu";

let seq = 1000;
export function nextId(prefix = "t"): string {
  seq += 1;
  return `${prefix}${seq}`;
}

export type TestLine = { productId?: string; name?: string; hsn?: string; price?: number; qty?: number; discount?: number; discountType?: "percent" | "amount"; discountAmount?: number; gst?: number; priceInclusive?: boolean };

export function line(partial: Partial<TestLine> & { productId: string }): TestLine {
  return { name: "Item", hsn: "0000", price: 100, qty: 1, discount: 0, gst: 18, ...partial };
}

export function buildInvoice(
  partial: Partial<InvoiceBuildInput> & { customerId: string; items: TestLine[] },
  businessState = BUSINESS,
) {
  return buildInvoiceRecord({
    invoiceNo: `VELS-${nextId("n")}`,
    date: partial.date ?? "2026-10-01",
    customerId: partial.customerId,
    customerName: partial.customerName ?? "Customer",
    customerPhone: partial.customerPhone ?? "9876543210",
    customerGstin: partial.customerGstin ?? "",
    customerAddress: partial.customerAddress ?? "Addr",
    customerState: partial.customerState ?? BUSINESS,
    businessState,
    paymentMode: partial.paymentMode ?? "UPI",
    paymentStatus: partial.paymentStatus ?? "Paid",
    paidAmount: partial.paidAmount ?? 0,
    items: partial.items,
    status: partial.status ?? "Saved",
  } as InvoiceBuildInput);
}
