import type { InvoiceStatus, DiscountType } from "../services/invoiceService";
import type { PaymentMode, PaymentStatus } from "../services/paymentService";

export type { InvoiceStatus, DiscountType, PaymentMode, PaymentStatus };

export type UnitType =
  | "pcs"
  | "kg"
  | "gm"
  | "litre"
  | "ml"
  | "box"
  | "packet"
  | "dozen"
  | "meter"
  | "sqft"
  | "set"
  | "roll"
  | string;

export interface Product {
  id: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  brand?: string;
  unit: UnitType;
  purchasePrice?: number;
  price: number;
  mrp?: number;
  gst: number;
  gstType?: "exclusive" | "inclusive";
  stock: number;
  openingStock?: number;
  lowStockLimit?: number;
  supplierId?: string;
  supplierName?: string;
  image?: string;
  description?: string;
  hsn: string;
  sac?: string;
  status?: "active" | "inactive";
  cost?: number; // alias for purchasePrice in calculation engine
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  gstin: string;
  address: string;
  state: string;
  openingBalance?: number;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  gstin?: string;
  state: string;
  openingBalance?: number;
  notes?: string;
}

export interface InvoiceItem {
  productId: string;
  name: string;
  hsn: string;
  price: number;
  qty: number;
  discount: number; // percent
  discountType?: "percent" | "amount";
  discountAmount?: number;
  priceInclusive?: boolean;
  gst: number;
  unit?: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerGstin: string;
  customerAddress: string;
  customerState: string;
  items: InvoiceItem[];
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstTotal: number;
  roundOff: number;
  grandTotal: number;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  status?: InvoiceStatus;
  businessState?: string;
  paidAmount: number;
  notes: string;
  terms: string;
}

export interface PurchaseItem {
  productId: string;
  name: string;
  hsn: string;
  purchasePrice: number;
  qty: number;
  discount: number;
  discountType?: "percent" | "amount";
  gst: number;
  priceInclusive?: boolean;
  unit?: string;
}

export interface Purchase {
  id: string;
  purchaseNo: string;
  supplierInvoiceNo?: string;
  supplierId: string;
  supplierName: string;
  supplierGstin?: string;
  supplierState?: string;
  date: string;
  items: PurchaseItem[];
  subtotal: number;
  discountTotal: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstTotal: number;
  grandTotal: number;
  paidAmount: number;
  paymentMode: PaymentMode;
  paymentStatus: PaymentStatus;
  notes?: string;
}

export interface Payment {
  id: string;
  receiptNo: string;
  date: string;
  partyType: "customer" | "supplier";
  partyId: string;
  partyName: string;
  partyPhone?: string;
  invoiceId?: string;
  invoiceNo?: string;
  amount: number;
  paymentMode: PaymentMode;
  reference?: string;
  notes?: string;
}

export type StockMovementType =
  | "Opening"
  | "Purchase"
  | "Sale"
  | "Sales Return"
  | "Purchase Return"
  | "Stock In"
  | "Stock Out"
  | "Adjustment"
  | "Damage"
  | "Expired";

export interface StockMovement {
  id: string;
  date: string;
  productId: string;
  productName: string;
  type: StockMovementType;
  quantity: number; // positive = added, negative = deducted
  reference: string;
  previousStock: number;
  newStock: number;
  notes?: string;
}

export interface SalesReturn {
  id: string;
  returnNo: string;
  invoiceId: string;
  invoiceNo: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  customerState: string;
  date: string;
  items: Array<{
    productId: string;
    name: string;
    hsn: string;
    price: number;
    qty: number;
    discount: number;
    gst: number;
    unit?: string;
  }>;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstTotal: number;
  total: number;
  refundAmount: number;
  creditAmount: number;
  reason: string;
  notes?: string;
}

export type ExpenseCategory =
  | "Rent"
  | "Electricity"
  | "Salary"
  | "Transport"
  | "Maintenance"
  | "Marketing"
  | "Office Supplies"
  | "Internet & Phone"
  | "Tea & Snacks"
  | "Other";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: PaymentMode;
  date: string;
  reference?: string;
  notes?: string;
}

export interface CompanySettings {
  companyName: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  state: string;
  invoiceTerms: string;
  logoText: string;
  logo: string;
  upiId: string;
  upiName: string;
  upiQr: string;
  paymentInstructions?: string;
  enableDynamicUpiQr?: boolean;

  // Invoice configuration (Phase 15)
  invoicePrefix?: string;
  startingInvoiceNo?: number;
  autoInvoiceNo?: boolean;
  invoiceDateFormat?: "YYYY-MM-DD" | "DD/MM/YYYY";
  currency?: string;
  decimalPrecision?: number;
  roundOff?: boolean;
  defaultPaymentMode?: PaymentMode;
  defaultGst?: number;
  defaultNotes?: string;
  footerMessage?: string;
  showGst?: boolean;
  showDiscount?: boolean;
  showCustomerGstin?: boolean;
  showHsn?: boolean;
  showPaymentDetails?: boolean;
  showQr?: boolean;
  showLogo?: boolean;
}
