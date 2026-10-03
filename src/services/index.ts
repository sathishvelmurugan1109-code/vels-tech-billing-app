/**
 * services/index.ts — ONE import point for the centralised calculation stack.
 *
 *   import { calculateInvoice, dashboardStats, formatCurrency } from "./services";
 *
 * Import order matters: money first, everything else builds on top of it.
 */

export * from "./money";
export * from "./gstService";
export * from "./paymentService";
export * from "./stockService";
export * from "./invoiceService";
export * from "./customerService";
export * from "./dateService";
export * from "./profitService";
export * from "./purchaseService";
export * from "./reportService";
export * from "./expenseService";
export * from "./supplierService";
export * from "./storageService";
export * from "./qrService";
