import React, { useState, useEffect, useMemo, useRef } from "react";
import logoImg from "./assets/profile-logo.jpeg";
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Package,
  Users,
  Truck,
  CreditCard,
  DollarSign,
  TrendingUp,
  Settings as SettingsIcon,
  Search,
  Bell,
  Menu,
  X,
  Plus,
  Zap,
  Box,
  MapPin,
  Printer,
  Smartphone,
  Check,
  RotateCcw,
  SlidersHorizontal,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";

// Domain Types
import type {
  Product,
  Customer,
  Supplier,
  Invoice,
  Purchase,
  Payment,
  StockMovement,
  SalesReturn,
  Expense,
  CompanySettings,
  PaymentMode,
  StockMovementType,
} from "./types";

// Services & Calculations
import {
  applyStockChanges,
  applyStockDelta,
  buildInvoiceRecord,
  derivePaymentStatus,
  planInvoiceMutation,
  purchaseStockChanges,
  reconcileSalesReturn,
  calculateSalesReturn,
  todayISO,
  safeGetStorage,
  safeSetStorage,
  transactionalStorageUpdate,
  createFullBackup,
  validateAndRestoreBackup,
  STORAGE_KEYS,
  addMoney,
  subtractMoney,
  roundMoney,
} from "./services";

// Components & Modals
import { InvoiceRenderer, buildInvoiceHtmlDoc, normalizeWaNumber, buildCustomerWaMessage } from "./components/InvoiceRenderer";
import { BarcodeScannerModal } from "./components/BarcodeScannerModal";
import { GlobalSearchModal } from "./components/GlobalSearchModal";
import { QuickActionsModal } from "./components/QuickActionsModal";
import { ProductModal } from "./components/ProductModal";
import { CustomerModal } from "./components/CustomerModal";
import { SupplierModal } from "./components/SupplierModal";
import { PurchaseModal } from "./components/PurchaseModal";
import { ReceivePaymentModal } from "./components/ReceivePaymentModal";
import { StockAdjustmentModal } from "./components/StockAdjustmentModal";
import { SalesReturnModal } from "./components/SalesReturnModal";
import { ExpenseModal } from "./components/ExpenseModal";
import { CustomerLedgerModal } from "./components/CustomerLedgerModal";
import { NotificationsPopover } from "./components/NotificationsPopover";

// Pages
import { DashboardPage } from "./pages/DashboardPage";
import { BillingPage } from "./pages/BillingPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { ProductsPage } from "./pages/ProductsPage";
import { CustomersPage } from "./pages/CustomersPage";
import { SuppliersPage } from "./pages/SuppliersPage";
import { PurchasesPage } from "./pages/PurchasesPage";
import { PaymentsPage } from "./pages/PaymentsPage";
import { ExpensesPage } from "./pages/ExpensesPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";

// Seed fallbacks when localStorage is initially empty
const seedProducts: Product[] = [
  { id: "p1", name: "Dell Inspiron 14 Laptop", hsn: "8471", price: 54990, purchasePrice: 48000, cost: 48000, gst: 18, stock: 14, unit: "pcs", barcode: "890123456701", sku: "DELL-INS-14", category: "Laptops" },
  { id: "p2", name: "Logitech MX Master 3S Mouse", hsn: "84716060", price: 7990, purchasePrice: 6500, cost: 6500, gst: 18, stock: 42, unit: "pcs", barcode: "890123456702", sku: "LOGI-MX3S", category: "Accessories" },
  { id: "p3", name: "Samsung 870 EVO 1TB SSD", hsn: "84717020", price: 6599, purchasePrice: 5200, cost: 5200, gst: 18, stock: 7, unit: "pcs", barcode: "890123456703", sku: "SAM-870-1TB", category: "Storage" },
  { id: "p4", name: "USB-C Hub 7-in-1 Aluminium", hsn: "84733099", price: 2499, purchasePrice: 1600, cost: 1600, gst: 18, stock: 23, unit: "pcs", barcode: "890123456704", sku: "HUB-7IN1-AL", category: "Accessories" },
  { id: "p5", name: "Keychron K2 Mechanical Keyboard", hsn: "84716040", price: 7499, purchasePrice: 5900, cost: 5900, gst: 18, stock: 9, unit: "pcs", barcode: "890123456705", sku: "KEY-K2-RGB", category: "Keyboards" },
];

const seedCustomers: Customer[] = [
  {
    id: "c1",
    name: "Arjun Enterprises",
    phone: "98765 43210",
    gstin: "33ABCDE1234F1Z5",
    address: "82, Avinashi Road, Coimbatore - 641004",
    state: "Tamil Nadu",
  },
  {
    id: "c2",
    name: "Sri Lakshmi Traders",
    phone: "98450 12345",
    gstin: "29ABCDE1234F1Z5",
    address: "MG Road, Bangalore - 560001",
    state: "Karnataka",
  },
];

const seedSuppliers: Supplier[] = [
  {
    id: "s1",
    name: "Coimbatore Tech Distributors",
    phone: "98422 11223",
    email: "sales@cbetrans.in",
    gstin: "33AABCT9988C1Z4",
    address: "Cross Cut Road, Gandhipuram, Coimbatore - 641012",
    state: "Tamil Nadu",
  },
  {
    id: "s2",
    name: "Bangalore Silicon Components",
    phone: "98801 33445",
    email: "supply@blrcomponents.com",
    gstin: "29AABCS5544B1Z2",
    address: "SP Road, Bangalore - 560002",
    state: "Karnataka",
  },
];

const defaultSettings: CompanySettings = {
  companyName: "VELS TECH",
  address: "SF No 412/2, Palladam Road, Palladam, Tiruppur - 641664, Tamil Nadu",
  gstin: "33AAJFV1234B1Z7",
  phone: "+91 98765 00001",
  email: "billing@velstech.in",
  state: "Tamil Nadu",
  invoiceTerms: "1. Goods once sold will not be taken back.\n2. Warranty as per manufacturer policy.\n3. Subject to Palladam jurisdiction.\n4. E. & O.E.",
  logoText: "VELS TECH",
  logo: "",
  upiId: "vels.tech@okicici",
  upiName: "VELS TECH",
  upiQr: "",
  invoicePrefix: "VELS-",
  startingInvoiceNo: 1,
  autoInvoiceNo: true,
  currency: "₹",
  roundOff: true,
  defaultPaymentMode: "UPI",
  defaultGst: 18,
  defaultNotes: "",
  footerMessage: "Thank you for shopping at VELS TECH • Palladam, Tamil Nadu",
};

export type AppView =
  | "dashboard"
  | "billing"
  | "invoices"
  | "products"
  | "customers"
  | "suppliers"
  | "purchases"
  | "payments"
  | "expenses"
  | "reports"
  | "settings";

export default function App() {
  // --- Persistent State ---
  const [products, setProducts] = useState<Product[]>(() =>
    safeGetStorage(STORAGE_KEYS.PRODUCTS, seedProducts),
  );
  const [customers, setCustomers] = useState<Customer[]>(() =>
    safeGetStorage(STORAGE_KEYS.CUSTOMERS, seedCustomers),
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
    safeGetStorage(STORAGE_KEYS.SUPPLIERS, seedSuppliers),
  );
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const stored = safeGetStorage<Invoice[]>(STORAGE_KEYS.INVOICES, []);
    return stored.map((inv) => {
      if (inv.status === "Cancelled" || (inv as any).paymentStatus === "Cancelled") {
        return {
          ...inv,
          status: "Cancelled",
          paymentStatus: derivePaymentStatus(inv.grandTotal, inv.paidAmount),
        };
      }
      return { ...inv, status: inv.status || "Saved" };
    });
  });
  const [purchases, setPurchases] = useState<Purchase[]>(() =>
    safeGetStorage(STORAGE_KEYS.PURCHASES, []),
  );
  const [payments, setPayments] = useState<Payment[]>(() =>
    safeGetStorage(STORAGE_KEYS.PAYMENTS, []),
  );
  const [stockMovements, setStockMovements] = useState<StockMovement[]>(() =>
    safeGetStorage(STORAGE_KEYS.STOCK_MOVEMENTS, []),
  );
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>(() =>
    safeGetStorage(STORAGE_KEYS.SALES_RETURNS, []),
  );
  const [expenses, setExpenses] = useState<Expense[]>(() =>
    safeGetStorage(STORAGE_KEYS.EXPENSES, []),
  );
  const [settings, setSettings] = useState<CompanySettings>(() => {
    const stored = safeGetStorage<Partial<CompanySettings>>(STORAGE_KEYS.SETTINGS, {});
    return { ...defaultSettings, ...stored };
  });

  // Navigation View
  const [view, setView] = useState<AppView>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  // Modal Controllers
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productInitialName, setProductInitialName] = useState("");

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showReceivePaymentModal, setShowReceivePaymentModal] = useState(false);
  const [paymentTargetCustomer, setPaymentTargetCustomer] = useState<Customer | null>(null);
  const [paymentTargetInvoice, setPaymentTargetInvoice] = useState<Invoice | null>(null);

  const [showStockAdjustmentModal, setShowStockAdjustmentModal] = useState(false);
  const [stockAdjustmentProduct, setStockAdjustmentProduct] = useState<Product | null>(null);
  const [stockAdjustmentType, setStockAdjustmentType] = useState<StockMovementType>("Adjustment");

  const [showSalesReturnModal, setShowSalesReturnModal] = useState(false);
  const [salesReturnInvoice, setSalesReturnInvoice] = useState<Invoice | null>(null);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [showCustomerLedgerModal, setShowCustomerLedgerModal] = useState(false);
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);

  const [showGlobalSearchModal, setShowGlobalSearchModal] = useState(false);
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false);
  const [showBarcodeScannerModal, setShowBarcodeScannerModal] = useState(false);
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);

  // Billing & Invoice View / Print
  const [editingInvoiceRecord, setEditingInvoiceRecord] = useState<Invoice | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [shareBusy, setShareBusy] = useState(false);

  /* ------------------------------------------------------------------
   * LOGO SYSTEMS — Two separate concerns, strictly preserved:
   * 1) appLogo  -> APP BRANDING ONLY (Sidebar, Mobile header).
   *    Uses profile-logo.jpeg. Must NEVER be replaced by business settings.
   * 2) invoiceLogo -> INVOICE ONLY (Invoice preview, print, A4 PDF, WhatsApp).
   *    Uses settings.logo || defaultLogoDataUrl || logoImg.
   * ------------------------------------------------------------------ */
  const appLogo = logoImg;

  const [defaultLogoDataUrl, setDefaultLogoDataUrl] = useState("");
  useEffect(() => {
    let alive = true;
    fetch(logoImg)
      .then((r) => r.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(String(fr.result));
            fr.onerror = () => reject(new Error("Could not read default logo"));
            fr.readAsDataURL(blob);
          }),
      )
      .then((dataUrl) => {
        if (alive) setDefaultLogoDataUrl(dataUrl);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const invoiceLogo = settings.logo || defaultLogoDataUrl || logoImg;

  // Persist State to LocalStorage
  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.PRODUCTS, products);
  }, [products]);
  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.CUSTOMERS, customers);
  }, [customers]);
  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.SUPPLIERS, suppliers);
  }, [suppliers]);
  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.INVOICES, invoices);
  }, [invoices]);
  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.PURCHASES, purchases);
  }, [purchases]);
  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.PAYMENTS, payments);
  }, [payments]);
  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.STOCK_MOVEMENTS, stockMovements);
  }, [stockMovements]);
  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.SALES_RETURNS, salesReturns);
  }, [salesReturns]);
  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.EXPENSES, expenses);
  }, [expenses]);
  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.SETTINGS, settings);
  }, [settings]);

  // Global Keyboard Shortcuts (⌘K for Search, ⌘N for Bill)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowGlobalSearchModal((v) => !v);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setEditingInvoiceRecord(null);
        setView("billing");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- Handlers: Invoice Operations ---
  const handleSaveInvoice = (invoice: Invoice) => {
    const oldInvoice = editingInvoiceRecord
      ? invoices.find((i) => i.id === editingInvoiceRecord.id) ?? null
      : null;

    if (editingInvoiceRecord) {
      setInvoices((prev) => prev.map((x) => (x.id === editingInvoiceRecord.id ? invoice : x)));
    } else {
      setInvoices((prev) => [...prev, invoice]);
    }

    // Stock difference reconciliation
    const mutation = planInvoiceMutation(oldInvoice, invoice, { businessState: settings.state });
    setProducts((prev) => applyStockChanges(prev, mutation.stockChanges));

    // Record Stock Movement Ledger entries
    mutation.stockChanges.forEach((change) => {
      const prod = products.find((p) => p.id === change.productId);
      const sm: StockMovement = {
        id: `sm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        date: invoice.date,
        productId: change.productId,
        productName: prod?.name || "Product",
        type: change.delta < 0 ? "Sale" : "Sales Return",
        quantity: change.delta,
        reference: `Invoice ${invoice.invoiceNo}`,
        previousStock: prod?.stock || 0,
        newStock: Math.max(0, (prod?.stock || 0) + change.delta),
      };
      setStockMovements((prev) => [sm, ...prev]);
    });

    // Reset billing and open invoice preview
    setEditingInvoiceRecord(null);
    setView("invoices");
    setViewingInvoice(invoice);
  };

  const handleCancelInvoice = (inv: Invoice) => {
    if (inv.status === "Cancelled") return;
    if (
      !window.confirm(
        `Are you sure you want to cancel ${inv.invoiceNo}? This will restore inventory stock and reverse the invoice.`,
      )
    )
      return;

    const mutation = planInvoiceMutation(inv, null, { businessState: settings.state });
    setInvoices((prev) =>
      prev.map((x) =>
        x.id === inv.id
          ? {
              ...x,
              status: "Cancelled",
              notes: `${x.notes || ""}\nCANCELLED on ${new Date().toLocaleDateString()}`.trim(),
            }
          : x,
      ),
    );
    setProducts((prev) => applyStockChanges(prev, mutation.stockChanges));

    // Record stock restoration movements
    mutation.stockChanges.forEach((change) => {
      const prod = products.find((p) => p.id === change.productId);
      const sm: StockMovement = {
        id: `sm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        date: todayISO(),
        productId: change.productId,
        productName: prod?.name || "Product",
        type: "Adjustment",
        quantity: change.delta,
        reference: `Cancelled ${inv.invoiceNo}`,
        previousStock: prod?.stock || 0,
        newStock: Math.max(0, (prod?.stock || 0) + change.delta),
      };
      setStockMovements((prev) => [sm, ...prev]);
    });
  };

  const handleDuplicateInvoice = (inv: Invoice) => {
    setEditingInvoiceRecord(null);
    setView("billing");
  };

  const handleEditInvoice = (inv: Invoice) => {
    setEditingInvoiceRecord(inv);
    setView("billing");
  };

  // --- Handlers: Stock Adjustments ---
  const handleSaveStockMovement = (movementData: Omit<StockMovement, "id">) => {
    const sm: StockMovement = {
      id: `sm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...movementData,
    };
    setProducts((prev) => applyStockDelta(prev, sm.productId, sm.quantity));
    setStockMovements((prev) => [sm, ...prev]);
    setShowStockAdjustmentModal(false);
  };

  // --- Handlers: Purchases ---
  const handleSavePurchase = (purchaseData: Omit<Purchase, "id">) => {
    const p: Purchase = {
      id: `po_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...purchaseData,
    };
    setPurchases((prev) => [p, ...prev]);

    // Inward stock
    const changes = purchaseStockChanges(p.items);
    setProducts((prev) => applyStockChanges(prev, changes));

    // Record movements
    changes.forEach((change) => {
      const prod = products.find((x) => x.id === change.productId);
      const sm: StockMovement = {
        id: `sm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        date: p.date,
        productId: change.productId,
        productName: prod?.name || "Product",
        type: "Purchase",
        quantity: change.delta,
        reference: `Purchase ${p.purchaseNo}`,
        previousStock: prod?.stock || 0,
        newStock: (prod?.stock || 0) + change.delta,
      };
      setStockMovements((prev) => [sm, ...prev]);
    });

    setShowPurchaseModal(false);
  };

  // --- Handlers: Payments ---
  const handleSavePayment = (paymentData: Omit<Payment, "id">) => {
    const pay: Payment = {
      id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...paymentData,
    };
    setPayments((prev) => [pay, ...prev]);

    // If payment was linked to an invoice, update paidAmount & status
    if (pay.invoiceId) {
      setInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id === pay.invoiceId) {
            const nextPaid = addMoney(inv.paidAmount, pay.amount);
            const nextStatus = derivePaymentStatus(inv.grandTotal, nextPaid);
            return {
              ...inv,
              paidAmount: nextPaid,
              paymentStatus: nextStatus,
            };
          }
          return inv;
        }),
      );
    }

    setShowReceivePaymentModal(false);
  };

  // --- Handlers: Sales Returns ---
  const handleSaveSalesReturn = (returnData: Omit<SalesReturn, "id">) => {
    const sr: SalesReturn = {
      id: `sr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ...returnData,
    };
    setSalesReturns((prev) => [sr, ...prev]);

    // Reconcile return and restore stock
    const returnLines = sr.items.map((it) => ({
      productId: it.productId,
      name: it.name,
      hsn: it.hsn,
      price: it.price,
      qty: it.qty,
      discount: it.discount,
      gst: it.gst,
    }));
    const calc = calculateSalesReturn(returnLines, settings.state, sr.customerState);
    const reconciliation = reconcileSalesReturn(calc, { refund: sr.refundAmount });

    setProducts((prev) => applyStockChanges(prev, reconciliation.stockChanges));

    // Record stock movement for each item
    reconciliation.stockChanges.forEach((change) => {
      const prod = products.find((x) => x.id === change.productId);
      const sm: StockMovement = {
        id: `sm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        date: sr.date,
        productId: change.productId,
        productName: prod?.name || "Product",
        type: "Sales Return",
        quantity: change.delta,
        reference: `Return ${sr.returnNo}`,
        previousStock: prod?.stock || 0,
        newStock: (prod?.stock || 0) + change.delta,
      };
      setStockMovements((prev) => [sm, ...prev]);
    });

    setShowSalesReturnModal(false);
  };

  // --- Handlers: Expenses ---
  const handleSaveExpense = (expenseData: Omit<Expense, "id"> & { id?: string }) => {
    if (expenseData.id) {
      setExpenses((prev) =>
        prev.map((e) => (e.id === expenseData.id ? ({ ...e, ...expenseData } as Expense) : e)),
      );
    } else {
      const exp: Expense = {
        id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...expenseData,
      } as Expense;
      setExpenses((prev) => [exp, ...prev]);
    }
    setShowExpenseModal(false);
    setEditingExpense(null);
  };

  // --- Handlers: Products ---
  const handleSaveProduct = (productData: Omit<Product, "id"> & { id?: string }) => {
    if (productData.id) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productData.id ? ({ ...p, ...productData } as Product) : p)),
      );
    } else {
      const prod: Product = {
        id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...productData,
      } as Product;
      setProducts((prev) => [...prev, prod]);
    }
    setShowProductModal(false);
    setEditingProduct(null);
    setProductInitialName("");
  };

  // --- Handlers: Customers ---
  const handleSaveCustomer = (customerData: Omit<Customer, "id"> & { id?: string }) => {
    if (customerData.id) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerData.id ? ({ ...c, ...customerData } as Customer) : c)),
      );
    } else {
      const cust: Customer = {
        id: `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...customerData,
      } as Customer;
      setCustomers((prev) => [...prev, cust]);
    }
    setShowCustomerModal(false);
    setEditingCustomer(null);
  };

  // --- Handlers: Suppliers ---
  const handleSaveSupplier = (supplierData: Omit<Supplier, "id"> & { id?: string }) => {
    if (supplierData.id) {
      setSuppliers((prev) =>
        prev.map((s) => (s.id === supplierData.id ? ({ ...s, ...supplierData } as Supplier) : s)),
      );
    } else {
      const supp: Supplier = {
        id: `supp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...supplierData,
      } as Supplier;
      setSuppliers((prev) => [...prev, supp]);
    }
    setShowSupplierModal(false);
    setEditingSupplier(null);
  };

  // --- Handlers: Backup & Restore ---
  const handleExportBackup = () => {
    const backup = createFullBackup({
      products,
      customers,
      suppliers,
      invoices,
      purchases,
      payments,
      stockMovements,
      salesReturns,
      expenses,
      settings,
    });
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vels-tech-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleImportBackup = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const result = validateAndRestoreBackup(text, (restored) => {
          setProducts(restored.products);
          setCustomers(restored.customers);
          setSuppliers(restored.suppliers);
          setInvoices(restored.invoices);
          setPurchases(restored.purchases);
          setPayments(restored.payments);
          setStockMovements(restored.stockMovements);
          setSalesReturns(restored.salesReturns);
          setExpenses(restored.expenses);
          setSettings(restored.settings);
          alert("Backup successfully restored!");
        });

        if (!result.ok) {
          alert(`Restore failed: ${result.error}`);
        }
      } catch (err: any) {
        alert(`Could not read backup file: ${err.message}`);
      }
    };
    input.click();
  };

  const handleResetData = () => {
    if (
      window.confirm(
        "CRITICAL: This will permanently reset all billing data, invoices, and customer balances. Are you absolutely sure?",
      )
    ) {
      localStorage.clear();
      window.location.reload();
    }
  };

  // Print & WhatsApp on Viewing Invoice
  const printCurrentInvoice = () => {
    requestAnimationFrame(() => window.print());
  };

  const shareOnWhatsApp = (inv: Invoice) => {
    const wa = normalizeWaNumber(inv.customerPhone);
    const msg = buildCustomerWaMessage(
      inv.customerName,
      inv.invoiceNo,
      inv.date,
      inv.grandTotal,
      inv.paymentStatus,
      inv.paymentMode,
      settings,
    );
    const targetUrl = wa.waNumber
      ? `https://wa.me/${wa.waNumber}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(targetUrl, "_blank");
  };

  const downloadInvoiceFile = (inv: Invoice) => {
    const html = buildInvoiceHtmlDoc(inv, settings, invoiceLogo);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.invoiceNo}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  // Category list helper for product modal
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-zinc-900 font-sans selection:bg-indigo-100">
      {/* Print Stylesheet */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm 10mm 10mm 10mm; }
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; border: none !important; box-shadow: none !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Desktop Sidebar (Left Navigation) */}
      <div className="no-print hidden md:flex fixed left-0 top-0 h-screen w-[260px] flex-col bg-white border-r border-zinc-200 z-30">
        {/* Brand Header */}
        <div className="h-[72px] flex items-center gap-3 px-6 border-b border-zinc-100">
          <img
            src={appLogo}
            alt="Vels Tech Logo"
            className="h-9 w-9 rounded-xl shadow-sm object-cover"
          />
          <div className="leading-tight">
            <div className="font-extrabold tracking-[-0.02em] text-[15px]">VELS TECH</div>
            <div className="text-[10px] text-zinc-400 font-bold tracking-widest uppercase">
              BILLING • PALLADAM
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 flex-1 space-y-1 overflow-y-auto">
          {[
            { k: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { k: "billing", label: "New Bill (POS)", icon: Receipt, badge: "⌘N" },
            { k: "invoices", label: "Invoices", icon: FileText },
            { k: "products", label: "Inventory", icon: Package },
            { k: "customers", label: "Customers & Ledger", icon: Users },
            { k: "suppliers", label: "Suppliers", icon: Truck },
            { k: "purchases", label: "Purchases", icon: Receipt },
            { k: "payments", label: "Payments", icon: CreditCard },
            { k: "expenses", label: "Expenses", icon: DollarSign },
            { k: "reports", label: "Reports & GST", icon: TrendingUp },
            { k: "settings", label: "Settings", icon: SettingsIcon },
          ].map((item) => (
            <button
              key={item.k}
              onClick={() => {
                if (item.k === "billing") setEditingInvoiceRecord(null);
                setView(item.k as AppView);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition ${
                view === item.k
                  ? "bg-indigo-600 text-white shadow-[0_6px_16px_-6px_rgba(79,70,229,0.7)]"
                  : "text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900"
              }`}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto bg-white/20 text-[10px] px-1.5 py-0.5 rounded font-bold mono">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer Info */}
        <div className="p-4 border-t border-zinc-100">
          <div className="rounded-2xl bg-zinc-900 text-white p-3.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Client
                Ready
              </span>
              <span className="mono text-zinc-400 text-[10px]">v2.2</span>
            </div>
            <div className="text-[12px] text-zinc-300 mt-1 leading-snug">
              Encrypted Local Storage • Full Offline PWA
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Top Navigation Header */}
      <div className="no-print md:hidden sticky top-0 z-30 bg-white border-b border-zinc-200">
        <div className="flex items-center justify-between px-4 h-[60px]">
          <div className="flex items-center gap-2.5">
            <img src={appLogo} alt="Vels Tech Logo" className="h-8 w-8 rounded-lg object-cover" />
            <div>
              <div className="font-extrabold text-[15px] leading-tight">VELS TECH</div>
              <div className="text-[10px] text-zinc-400 font-semibold">BILLING • PALLADAM</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGlobalSearchModal(true)}
              className="h-9 w-9 grid place-items-center rounded-xl bg-zinc-100 text-zinc-600"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowNotificationsPopover((v) => !v)}
              className="h-9 w-9 grid place-items-center rounded-xl bg-zinc-100 text-zinc-600 relative"
            >
              <Bell className="h-4 w-4" />
              {products.filter((p) => p.stock <= 10).length > 0 && (
                <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
              )}
            </button>
            <button
              onClick={() => setShowQuickActionsModal(true)}
              className="h-9 px-3 rounded-xl bg-indigo-600 text-white font-bold text-[12px] flex items-center gap-1"
            >
              ⚡ Actions
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="md:pl-[260px] min-w-0">
        <div className="max-w-[1280px] mx-auto p-4 md:p-7 min-w-0">
          {/* Desktop Topbar */}
          <div className="no-print hidden md:flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowGlobalSearchModal(true)}
                className="h-10 px-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 text-zinc-400 text-[13px] flex items-center gap-3 w-72 shadow-sm transition"
              >
                <Search className="h-4 w-4 text-zinc-400" />
                <span className="flex-1 text-left">Search anything...</span>
                <span className="mono text-[10px] bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded font-bold">
                  ⌘K
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <button
                  onClick={() => setShowNotificationsPopover((v) => !v)}
                  className="h-10 w-10 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 grid place-items-center relative shadow-sm transition"
                >
                  <Bell className="h-4 w-4" />
                  {products.filter((p) => p.stock <= 10).length > 0 && (
                    <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500" />
                  )}
                </button>
                {showNotificationsPopover && (
                  <NotificationsPopover
                    products={products}
                    invoices={invoices}
                    customers={customers}
                    lastBackupDate={localStorage.getItem(STORAGE_KEYS.LAST_BACKUP)}
                    onNavigateToProducts={() => {
                      setShowNotificationsPopover(false);
                      setView("products");
                    }}
                    onNavigateToInvoices={() => {
                      setShowNotificationsPopover(false);
                      setView("invoices");
                    }}
                    onNavigateToSettings={() => {
                      setShowNotificationsPopover(false);
                      setView("settings");
                    }}
                    onClose={() => setShowNotificationsPopover(false)}
                  />
                )}
              </div>

              <button
                onClick={() => setShowQuickActionsModal(true)}
                className="h-10 px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-800 font-bold text-[12.5px] flex items-center gap-2 shadow-sm transition"
              >
                ⚡ Quick Actions
              </button>

              {view !== "billing" && (
                <button
                  onClick={() => {
                    setEditingInvoiceRecord(null);
                    setView("billing");
                  }}
                  className="h-10 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[13px] flex items-center gap-2 shadow-sm transition"
                >
                  <Plus className="h-4 w-4" /> New Bill
                </button>
              )}
            </div>
          </div>

          {/* VIEW SWITCHER */}
          {view === "dashboard" && (
            <DashboardPage
              invoices={invoices}
              products={products}
              customers={customers}
              suppliers={suppliers}
              payments={payments}
              expenses={expenses}
              settings={settings}
              onNavigateToBilling={() => {
                setEditingInvoiceRecord(null);
                setView("billing");
              }}
              onNavigateToInvoices={() => setView("invoices")}
              onNavigateToProducts={() => setView("products")}
              onNavigateToCustomers={() => setView("customers")}
              onNavigateToPayments={() => setView("payments")}
              onViewInvoice={(inv) => setViewingInvoice(inv)}
              onOpenQuickActions={() => setShowQuickActionsModal(true)}
            />
          )}

          {view === "billing" && (
            <BillingPage
              products={products}
              customers={customers}
              invoices={invoices}
              settings={settings}
              editingInvoice={editingInvoiceRecord}
              onSaveInvoice={handleSaveInvoice}
              onOpenBarcodeScanner={() => setShowBarcodeScannerModal(true)}
              onOpenAddProduct={(name) => {
                setProductInitialName(name || "");
                setEditingProduct(null);
                setShowProductModal(true);
              }}
              onOpenAddCustomer={() => {
                setEditingCustomer(null);
                setShowCustomerModal(true);
              }}
              onCancelEdit={() => {
                setEditingInvoiceRecord(null);
                setView("invoices");
              }}
            />
          )}

          {view === "invoices" && (
            <InvoicesPage
              invoices={invoices}
              settings={settings}
              onNewInvoice={() => {
                setEditingInvoiceRecord(null);
                setView("billing");
              }}
              onViewInvoice={(inv) => setViewingInvoice(inv)}
              onEditInvoice={handleEditInvoice}
              onDuplicateInvoice={handleDuplicateInvoice}
              onCancelInvoice={handleCancelInvoice}
              onSalesReturn={(inv) => {
                setSalesReturnInvoice(inv);
                setShowSalesReturnModal(true);
              }}
            />
          )}

          {view === "products" && (
            <ProductsPage
              products={products}
              suppliers={suppliers}
              onAddProduct={() => {
                setEditingProduct(null);
                setProductInitialName("");
                setShowProductModal(true);
              }}
              onEditProduct={(p) => {
                setEditingProduct(p);
                setShowProductModal(true);
              }}
              onDeleteProduct={(p) => {
                if (confirm(`Delete ${p.name}?`)) {
                  setProducts((prev) => prev.filter((x) => x.id !== p.id));
                }
              }}
              onStockAdjustment={(p) => {
                setStockAdjustmentProduct(p);
                setStockAdjustmentType("Adjustment");
                setShowStockAdjustmentModal(true);
              }}
            />
          )}

          {view === "customers" && (
            <CustomersPage
              customers={customers}
              invoices={invoices}
              payments={payments}
              salesReturns={salesReturns}
              onAddCustomer={() => {
                setEditingCustomer(null);
                setShowCustomerModal(true);
              }}
              onEditCustomer={(c) => {
                setEditingCustomer(c);
                setShowCustomerModal(true);
              }}
              onDeleteCustomer={(c) => {
                if (confirm(`Delete customer ${c.name}?`)) {
                  setCustomers((prev) => prev.filter((x) => x.id !== c.id));
                }
              }}
              onViewLedger={(c) => {
                setLedgerCustomer(c);
                setShowCustomerLedgerModal(true);
              }}
              onNewInvoiceForCustomer={(c) => {
                setEditingInvoiceRecord(null);
                setView("billing");
              }}
              onReceivePaymentForCustomer={(c) => {
                setPaymentTargetCustomer(c);
                setPaymentTargetInvoice(null);
                setShowReceivePaymentModal(true);
              }}
            />
          )}

          {view === "suppliers" && (
            <SuppliersPage
              suppliers={suppliers}
              purchases={purchases}
              payments={payments}
              onAddSupplier={() => {
                setEditingSupplier(null);
                setShowSupplierModal(true);
              }}
              onEditSupplier={(s) => {
                setEditingSupplier(s);
                setShowSupplierModal(true);
              }}
              onDeleteSupplier={(s) => {
                if (confirm(`Delete supplier ${s.name}?`)) {
                  setSuppliers((prev) => prev.filter((x) => x.id !== s.id));
                }
              }}
              onNewPurchaseForSupplier={(s) => {
                setShowPurchaseModal(true);
              }}
            />
          )}

          {view === "purchases" && (
            <PurchasesPage
              purchases={purchases}
              onNewPurchase={() => setShowPurchaseModal(true)}
            />
          )}

          {view === "payments" && (
            <PaymentsPage
              payments={payments}
              onReceivePayment={() => {
                setPaymentTargetCustomer(null);
                setPaymentTargetInvoice(null);
                setShowReceivePaymentModal(true);
              }}
            />
          )}

          {view === "expenses" && (
            <ExpensesPage
              expenses={expenses}
              onAddExpense={() => {
                setEditingExpense(null);
                setShowExpenseModal(true);
              }}
              onEditExpense={(e) => {
                setEditingExpense(e);
                setShowExpenseModal(true);
              }}
              onDeleteExpense={(e) => {
                if (confirm("Delete this expense?")) {
                  setExpenses((prev) => prev.filter((x) => x.id !== e.id));
                }
              }}
            />
          )}

          {view === "reports" && (
            <ReportsPage
              invoices={invoices}
              products={products}
              customers={customers}
              suppliers={suppliers}
              purchases={purchases}
              payments={payments}
              stockMovements={stockMovements}
              salesReturns={salesReturns}
              expenses={expenses}
              settings={settings}
            />
          )}

          {view === "settings" && (
            <SettingsPage
              settings={settings}
              onUpdateSettings={(updated) => setSettings(updated)}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              onResetData={handleResetData}
            />
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Phase 24) */}
      <div className="no-print md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-zinc-200">
        <div className="grid grid-cols-5 h-[64px] items-center px-1">
          {[
            { k: "dashboard", label: "Home", icon: LayoutDashboard },
            { k: "billing", label: "Bill", icon: Receipt },
            { k: "invoices", label: "Invoices", icon: FileText },
            { k: "products", label: "Stock", icon: Package },
            { k: "more", label: "More", icon: MoreHorizontal },
          ].map((tab) => {
            const isMore = tab.k === "more";
            const active = isMore ? moreSheetOpen : view === tab.k;

            return (
              <button
                key={tab.k}
                onClick={() => {
                  if (isMore) {
                    setMoreSheetOpen((v) => !v);
                  } else {
                    setMoreSheetOpen(false);
                    if (tab.k === "billing") setEditingInvoiceRecord(null);
                    setView(tab.k as AppView);
                  }
                }}
                className={`flex flex-col items-center justify-center gap-1 py-1 h-full min-h-[44px] transition ${
                  active ? "text-indigo-600 font-bold" : "text-zinc-500 font-medium"
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span className="text-[10px]">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile "More" Bottom Sheet */}
      {moreSheetOpen && (
        <div className="no-print md:hidden fixed inset-0 z-40 bg-zinc-900/60 backdrop-blur-sm flex flex-col justify-end">
          <div className="bg-white rounded-t-[28px] p-5 pb-20 space-y-4 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <span className="font-extrabold text-[16px] text-zinc-900">All Modules & Tools</span>
              <button
                onClick={() => setMoreSheetOpen(false)}
                className="h-8 w-8 grid place-items-center rounded-xl bg-zinc-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { k: "customers", label: "Customers & Ledger", icon: Users },
                { k: "suppliers", label: "Suppliers & Vendors", icon: Truck },
                { k: "purchases", label: "Inward Purchases", icon: Receipt },
                { k: "payments", label: "Payment Receipts", icon: CreditCard },
                { k: "expenses", label: "Operating Expenses", icon: DollarSign },
                { k: "reports", label: "Reports & GST", icon: TrendingUp },
                { k: "settings", label: "Business Settings", icon: SettingsIcon },
              ].map((item) => (
                <button
                  key={item.k}
                  onClick={() => {
                    setView(item.k as AppView);
                    setMoreSheetOpen(false);
                  }}
                  className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition min-h-[44px] ${
                    view === item.k
                      ? "bg-indigo-50 border-indigo-200 text-indigo-900 font-bold"
                      : "bg-zinc-50 border-zinc-200 text-zinc-700"
                  }`}
                >
                  <item.icon className="h-5 w-5 text-indigo-600" />
                  <span className="text-[13px]">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {/* 1. Single Invoice View / Print / PDF / WhatsApp Modal */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-[70] bg-zinc-900/60 backdrop-blur-sm overflow-y-auto p-0 md:p-6">
          <div className="no-print max-w-[900px] mx-auto p-3 md:p-4 flex flex-wrap items-center justify-between gap-2">
            <button
              onClick={() => setViewingInvoice(null)}
              className="h-10 px-4 rounded-xl bg-white border border-zinc-200 text-[13px] font-semibold flex items-center gap-2 shadow-sm"
            >
              <X className="h-4 w-4" /> Close
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => shareOnWhatsApp(viewingInvoice)}
                className="h-10 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-white text-[13px] font-semibold flex items-center gap-2 shadow-sm transition"
              >
                <Smartphone className="h-4 w-4" /> WhatsApp
              </button>
              <button
                onClick={printCurrentInvoice}
                className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-semibold flex items-center gap-2 shadow-sm transition"
              >
                <Printer className="h-4 w-4" /> Print Invoice
              </button>
              <button
                onClick={() => downloadInvoiceFile(viewingInvoice)}
                className="h-10 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-[13px] font-semibold flex items-center gap-2 shadow-sm transition"
              >
                <Download className="h-4 w-4" /> A4 Invoice PDF
              </button>
            </div>
          </div>

          <InvoiceRenderer
            invoice={viewingInvoice}
            settings={settings}
            invoiceLogo={invoiceLogo}
            isPrintArea={true}
          />
          <div className="no-print h-12" />
        </div>
      )}

      {/* 2. Global Search Modal (⌘K) */}
      {showGlobalSearchModal && (
        <GlobalSearchModal
          invoices={invoices}
          products={products}
          customers={customers}
          suppliers={suppliers}
          payments={payments}
          onSelectInvoice={(inv) => {
            setViewingInvoice(inv);
          }}
          onSelectProduct={(p) => {
            setEditingProduct(p);
            setShowProductModal(true);
          }}
          onSelectCustomer={(c) => {
            setLedgerCustomer(c);
            setShowCustomerLedgerModal(true);
          }}
          onSelectSupplier={(s) => {
            setEditingSupplier(s);
            setShowSupplierModal(true);
          }}
          onClose={() => setShowGlobalSearchModal(false)}
        />
      )}

      {/* 3. Barcode Scanner Modal */}
      {showBarcodeScannerModal && (
        <BarcodeScannerModal
          products={products}
          onProductFound={(product) => {
            // If in billing view, product gets added; else go to billing view with product
            setView("billing");
          }}
          onOpenAddProductWithName={(query) => {
            setProductInitialName(query);
            setEditingProduct(null);
            setShowProductModal(true);
          }}
          onClose={() => setShowBarcodeScannerModal(false)}
        />
      )}

      {/* 4. Quick Actions Modal */}
      {showQuickActionsModal && (
        <QuickActionsModal
          onNewInvoice={() => {
            setEditingInvoiceRecord(null);
            setView("billing");
          }}
          onAddProduct={() => {
            setEditingProduct(null);
            setProductInitialName("");
            setShowProductModal(true);
          }}
          onAddCustomer={() => {
            setEditingCustomer(null);
            setShowCustomerModal(true);
          }}
          onReceivePayment={() => {
            setPaymentTargetCustomer(null);
            setPaymentTargetInvoice(null);
            setShowReceivePaymentModal(true);
          }}
          onStockIn={() => {
            setStockAdjustmentProduct(null);
            setStockAdjustmentType("Stock In");
            setShowStockAdjustmentModal(true);
          }}
          onStockAdjustment={() => {
            setStockAdjustmentProduct(null);
            setStockAdjustmentType("Adjustment");
            setShowStockAdjustmentModal(true);
          }}
          onSalesReturn={() => {
            setSalesReturnInvoice(null);
            setShowSalesReturnModal(true);
          }}
          onPurchaseEntry={() => {
            setShowPurchaseModal(true);
          }}
          onAddExpense={() => {
            setEditingExpense(null);
            setShowExpenseModal(true);
          }}
          onClose={() => setShowQuickActionsModal(false)}
        />
      )}

      {/* 5. Product Create / Edit Modal */}
      {showProductModal && (
        <ProductModal
          product={editingProduct}
          suppliers={suppliers}
          categories={allCategories}
          initialName={productInitialName}
          onSave={handleSaveProduct}
          onClose={() => {
            setShowProductModal(false);
            setEditingProduct(null);
            setProductInitialName("");
          }}
        />
      )}

      {/* 6. Customer Create / Edit Modal */}
      {showCustomerModal && (
        <CustomerModal
          customer={editingCustomer}
          defaultState={settings.state}
          onSave={handleSaveCustomer}
          onClose={() => {
            setShowCustomerModal(false);
            setEditingCustomer(null);
          }}
        />
      )}

      {/* 7. Supplier Create / Edit Modal */}
      {showSupplierModal && (
        <SupplierModal
          supplier={editingSupplier}
          defaultState={settings.state}
          onSave={handleSaveSupplier}
          onClose={() => {
            setShowSupplierModal(false);
            setEditingSupplier(null);
          }}
        />
      )}

      {/* 8. Purchase Entry Modal */}
      {showPurchaseModal && (
        <PurchaseModal
          suppliers={suppliers}
          products={products}
          settings={settings}
          onSavePurchase={handleSavePurchase}
          onClose={() => setShowPurchaseModal(false)}
        />
      )}

      {/* 9. Receive Payment Modal */}
      {showReceivePaymentModal && (
        <ReceivePaymentModal
          customers={customers}
          invoices={invoices}
          initialCustomer={paymentTargetCustomer}
          initialInvoice={paymentTargetInvoice}
          onSavePayment={handleSavePayment}
          onClose={() => {
            setShowReceivePaymentModal(false);
            setPaymentTargetCustomer(null);
            setPaymentTargetInvoice(null);
          }}
        />
      )}

      {/* 10. Stock Adjustment & Inward Modal */}
      {showStockAdjustmentModal && (
        <StockAdjustmentModal
          products={products}
          initialProduct={stockAdjustmentProduct}
          defaultType={stockAdjustmentType}
          onSaveMovement={handleSaveStockMovement}
          onClose={() => {
            setShowStockAdjustmentModal(false);
            setStockAdjustmentProduct(null);
          }}
        />
      )}

      {/* 11. Sales Return Modal */}
      {showSalesReturnModal && (
        <SalesReturnModal
          invoices={invoices}
          settings={settings}
          initialInvoice={salesReturnInvoice}
          onConfirmReturn={handleSaveSalesReturn}
          onClose={() => {
            setShowSalesReturnModal(false);
            setSalesReturnInvoice(null);
          }}
        />
      )}

      {/* 12. Expense Modal */}
      {showExpenseModal && (
        <ExpenseModal
          expense={editingExpense}
          onSaveExpense={handleSaveExpense}
          onClose={() => {
            setShowExpenseModal(false);
            setEditingExpense(null);
          }}
        />
      )}

      {/* 13. Customer Statement / Ledger Modal */}
      {showCustomerLedgerModal && ledgerCustomer && (
        <CustomerLedgerModal
          customer={ledgerCustomer}
          invoices={invoices}
          payments={payments}
          salesReturns={salesReturns}
          settings={settings}
          onNewInvoice={(c) => {
            setShowCustomerLedgerModal(false);
            setEditingInvoiceRecord(null);
            setView("billing");
          }}
          onReceivePayment={(c) => {
            setShowCustomerLedgerModal(false);
            setPaymentTargetCustomer(c);
            setPaymentTargetInvoice(null);
            setShowReceivePaymentModal(true);
          }}
          onViewInvoice={(inv) => {
            setShowCustomerLedgerModal(false);
            setViewingInvoice(inv);
          }}
          onClose={() => {
            setShowCustomerLedgerModal(false);
            setLedgerCustomer(null);
          }}
        />
      )}
    </div>
  );
}
