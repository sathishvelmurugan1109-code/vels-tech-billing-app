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
  Download,
  Smartphone,
  Check,
  RotateCcw,
  SlidersHorizontal,
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
  StaffMember,
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
  downloadBackupFile,
  validateAndRestoreBackup,
  STORAGE_KEYS,
  addMoney,
  subtractMoney,
  roundMoney,
  formatCurrency,
} from "./services";
import {
  seedStaff,
  hasPermission,
  isPrivilegedAction,
} from "./services/staffService";

// Components & Modals
import {
  InvoiceRenderer,
  buildInvoiceHtmlDoc,
} from "./components/InvoiceRenderer";
import { shareInvoiceViaWhatsApp, setInvoiceLogo as setWaLogo } from "./services/whatsappService";
import { setInvoiceLogo as setPdfLogo } from "./services/pdfService";
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
import { HeaderStaffSwitcher } from "./components/HeaderStaffSwitcher";
import { StaffModal } from "./components/StaffModal";
import { PinVerificationModal } from "./components/PinVerificationModal";
import { StaffLoginScreen } from "./components/StaffLoginScreen";
import { BusinessManagementModal } from "./components/BusinessManagementModal";
import { authService, type StaffSessionResponse } from "./services/authService";

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
import { StaffPage } from "./pages/StaffPage";
import { api } from "./services/apiService";

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
  address: "SF No 412/2, Main Road, Veppur, Tamil Nadu",
  gstin: "33AAJFV1234B1Z7",
  phone: "+91 98765 00001",
  email: "billing@velstech.in",
  state: "Tamil Nadu",
  location: "Veppur",
  invoiceTerms: "1. Goods once sold will not be taken back.\n2. Warranty as per manufacturer policy.\n3. Subject to Veppur jurisdiction.\n4. E. & O.E.",
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
  footerMessage: "Thank you for shopping at VELS TECH • Veppur, Tamil Nadu",
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
  | "settings"
  | "staff";

export default function App() {
  // --- App State (offline-first, no auth gate) ---
  const [dataLoaded, setDataLoaded] = useState(true);

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

  // --- Authentication & Multi-Tenant Business State ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => authService.isAuthenticated());
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [currentBusiness, setCurrentBusiness] = useState<any>(() => authService.getBusiness());
  const [showBusinessModal, setShowBusinessModal] = useState<boolean>(false);

  // --- Staff & Multi-User State ---
  const [staffList, setStaffList] = useState<StaffMember[]>(() =>
    safeGetStorage(STORAGE_KEYS.STAFF, seedStaff),
  );
  const [activeStaffId, setActiveStaffId] = useState<string>(() => {
    const authStaff = authService.getStaff();
    if (authStaff?.id) return authStaff.id;
    const stored = safeGetStorage<string>(STORAGE_KEYS.ACTIVE_STAFF_ID, "");
    return stored || seedStaff[0].id;
  });

  const currentStaff = useMemo(() => {
    const fromAuth = authService.getStaff();
    if (fromAuth && fromAuth.id === activeStaffId) return fromAuth;
    return (
      staffList.find((s) => (s.id === activeStaffId || (s as any)._id === activeStaffId) && s.status === "active") ||
      staffList.find((s) => s.status === "active") ||
      fromAuth ||
      staffList[0] ||
      null
    );
  }, [staffList, activeStaffId, isAuthenticated]);

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaffMember, setEditingStaffMember] = useState<StaffMember | null>(null);

  // Security Verification (PIN Challenge)
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinModalTitle, setPinModalTitle] = useState("");
  const [pinModalDesc, setPinModalDesc] = useState("");
  const [pinModalCallback, setPinModalCallback] = useState<((staff: StaffMember) => void) | null>(null);

  const requestPinVerification = (
    actionTitle: string,
    callback: () => void,
    actionDesc?: string,
  ) => {
    setPinModalTitle(actionTitle);
    setPinModalDesc(actionDesc || "Enter security PIN to authorize this privileged operation.");
    setPinModalCallback(() => (_verifiedStaff: StaffMember) => {
      callback();
    });
    setPinModalOpen(true);
  };

  const [settings, setSettings] = useState<CompanySettings>(() => {
    const stored = safeGetStorage<Partial<CompanySettings>>(STORAGE_KEYS.SETTINGS, {});
    const combined = { ...defaultSettings, ...stored };
    if (!combined.location || /palladam/i.test(combined.location)) {
      combined.location = "Veppur";
    }
    if (combined.address && /palladam/i.test(combined.address)) {
      combined.address = combined.address.replace(/palladam/gi, "Veppur");
    }
    if (combined.invoiceTerms && /palladam/i.test(combined.invoiceTerms)) {
      combined.invoiceTerms = combined.invoiceTerms.replace(/palladam/gi, "Veppur");
    }
    if (combined.footerMessage && /palladam/i.test(combined.footerMessage)) {
      combined.footerMessage = combined.footerMessage.replace(/palladam/gi, "Veppur");
    }
    return combined;
  });

  // Dynamic Browser Tab Title with location
  useEffect(() => {
    const loc = settings.location || "Veppur";
    document.title = `Vels Tech - Billing • ${loc}`;
  }, [settings.location]);

  // Navigation View
  const [view, setView] = useState<AppView>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  // Modal Controllers
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productInitialName, setProductInitialName] = useState("");

  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerCreatedCallback, setCustomerCreatedCallback] = useState<
    ((customerId: string) => void) | null
  >(null);

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
  const [billingInitialCustomerId, setBillingInitialCustomerId] = useState<string>("");
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
  setWaLogo(invoiceLogo);
  setPdfLogo(invoiceLogo);

  // Session verification on mount
  useEffect(() => {
    let alive = true;
    authService.verifySession().then((valid) => {
      if (!alive) return;
      setIsAuthenticated(valid);
      if (valid) {
        const biz = authService.getBusiness();
        if (biz) setCurrentBusiness(biz);
        const stf = authService.getStaff();
        if (stf?.id) setActiveStaffId(stf.id || (stf as any)._id);
      }
      setAuthChecking(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Load authoritative data from backend for active business
  const loadCloudData = async () => {
    if (!authService.isAuthenticated()) return;
    try {
      const [prods, custs, supps, invs, pays, movs, stf, sett, biz] = await Promise.all([
        api.products.list().catch(() => null),
        api.customers.list().catch(() => null),
        api.suppliers.list().catch(() => null),
        api.invoices.list().catch(() => null),
        api.payments.list().catch(() => null),
        api.stockMovements.list().catch(() => null),
        api.staff.list().catch(() => null),
        api.getSettings().catch(() => null),
        api.getBusiness().catch(() => null),
      ]);
      if (Array.isArray(prods) && prods.length > 0) setProducts(prods);
      if (Array.isArray(custs) && custs.length > 0) setCustomers(custs);
      if (Array.isArray(supps) && supps.length > 0) setSuppliers(supps);
      if (Array.isArray(invs) && invs.length > 0) setInvoices(invs);
      if (Array.isArray(pays) && pays.length > 0) setPayments(pays);
      if (Array.isArray(movs) && movs.length > 0) setStockMovements(movs);
      if (Array.isArray(stf) && stf.length > 0) setStaffList(stf);
      if (sett && Object.keys(sett).length > 0) setSettings((prev) => ({ ...prev, ...sett }));
      if (biz) setCurrentBusiness(biz);
    } catch (err) {
      console.warn("Cloud synchronization error:", err);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadCloudData();
    const handleFocus = () => loadCloudData();
    window.addEventListener("focus", handleFocus);
    const interval = setInterval(() => loadCloudData(), 30000);
    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  const handleStaffAuthenticated = (session: StaffSessionResponse) => {
    setIsAuthenticated(true);
    setCurrentBusiness(session.business);
    if (session.staff) {
      setActiveStaffId(session.staff.id || (session.staff as any)._id);
    }
    loadCloudData();
  };

  const handleLockTerminal = () => {
    authService.logout();
    setIsAuthenticated(false);
  };

  const handleSwitchStaffWithChallenge = (targetStaff: StaffMember) => {
    if (targetStaff.id === activeStaffId || (targetStaff as any)._id === activeStaffId) return;
    requestPinVerification(
      `Switch to ${targetStaff.name}`,
      () => {
        setActiveStaffId(targetStaff.id || (targetStaff as any)._id);
      },
      `Please enter ${targetStaff.name}'s security PIN to switch active cashier identity.`
    );
  };

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
  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.STAFF, staffList);
  }, [staffList]);
  useEffect(() => {
    safeSetStorage(STORAGE_KEYS.ACTIVE_STAFF_ID, activeStaffId);
  }, [activeStaffId]);

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
  const handleCreateInvoiceDraft = async (invoice: Invoice): Promise<Invoice> => {
    let saved: Invoice;
    try {
      saved = await api.invoices.createDraft(invoice);
    } catch (err) {
      console.warn("Could not sync invoice draft to backend API, keeping local:", err);
      saved = {
        ...invoice,
        id: invoice.id || `inv_draft_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        status: "Draft",
        paymentStatus: "Pending",
        paidAmount: 0,
      };
    }
    setInvoices((prev) => {
      const existingIndex = prev.findIndex(
        (candidate) => candidate.id === saved.id || candidate.invoiceNo === saved.invoiceNo,
      );
      if (existingIndex < 0) return [...prev, saved];
      return prev.map((candidate, index) => (index === existingIndex ? saved : candidate));
    });
    return saved as Invoice;
  };

  const handleConfirmManualPayment = async (
    draft: Invoice,
  ): Promise<{ invoice: Invoice; payment: Payment }> => {
    let savedInvoice: Invoice;
    let savedPayment: Payment;
    try {
      const { invoice, payment } = await api.invoices.confirmManualPayment(draft.id);
      savedInvoice = invoice as Invoice;
      savedPayment = {
        id: payment.id,
        receiptNo: payment.invoiceNo || `REC-${String(Date.now()).slice(-6)}`,
        date: payment.date || todayISO(),
        partyType: "customer",
        partyId: payment.customerId || draft.customerId,
        partyName: payment.customerName || draft.customerName,
        partyPhone: draft.customerPhone,
        invoiceId: payment.invoiceId || draft.id,
        invoiceNo: payment.invoiceNo || draft.invoiceNo,
        amount: payment.amount || draft.grandTotal,
        paymentMode: "UPI",
        notes: payment.notes,
        verificationStatus: payment.verificationStatus || "verified",
        verificationMethod: payment.verificationMethod || "manual",
        manualConfirmationBy: payment.manualConfirmationBy || currentStaff?.id,
        manualConfirmedAt: payment.manualConfirmedAt || new Date().toISOString(),
        staffId: currentStaff?.id,
        staffName: currentStaff?.name,
      };
    } catch (err) {
      console.warn("Could not confirm payment on backend API, confirming locally:", err);
      savedInvoice = {
        ...draft,
        status: "Paid",
        paymentStatus: "Paid",
        paidAmount: draft.grandTotal,
      };
      savedPayment = {
        id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        receiptNo: `REC-${String(Date.now()).slice(-6)}`,
        date: todayISO(),
        partyType: "customer",
        partyId: draft.customerId,
        partyName: draft.customerName,
        partyPhone: draft.customerPhone,
        invoiceId: draft.id,
        invoiceNo: draft.invoiceNo,
        amount: draft.grandTotal,
        paymentMode: "UPI",
        notes: "Manually confirmed UPI receipt",
        verificationStatus: "verified",
        verificationMethod: "manual",
        manualConfirmationBy: currentStaff?.id,
        manualConfirmedAt: new Date().toISOString(),
        staffId: currentStaff?.id,
        staffName: currentStaff?.name,
      };
    }

    setInvoices((prev) =>
      prev.map((candidate) => (candidate.id === savedInvoice.id ? savedInvoice : candidate)),
    );
    setPayments((prev) =>
      prev.some((candidate) => candidate.id === savedPayment.id)
        ? prev.map((candidate) => (candidate.id === savedPayment.id ? savedPayment : candidate))
        : [savedPayment, ...prev],
    );

    const mutation = planInvoiceMutation(null, savedInvoice, { businessState: settings.state });
    setProducts((prev) => applyStockChanges(prev, mutation.stockChanges));
    mutation.stockChanges.forEach((change) => {
      const product = products.find((candidate) => candidate.id === change.productId);
      const movement: StockMovement = {
        id: `sm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        date: savedInvoice.date,
        productId: change.productId,
        productName: product?.name || "Product",
        type: "Sale",
        quantity: change.delta,
        reference: `Invoice ${savedInvoice.invoiceNo}`,
        previousStock: product?.stock || 0,
        newStock: Math.max(0, (product?.stock || 0) + change.delta),
      };
      setStockMovements((prev) => [movement, ...prev]);
    });

    return { invoice: savedInvoice, payment: savedPayment };
  };

  const handleSaveInvoice = async (invoice: Invoice) => {
    const invoiceWithStaff: Invoice = {
      ...invoice,
      staffId: invoice.staffId || currentStaff?.id,
      staffName: invoice.staffName || currentStaff?.name,
      staffRole: invoice.staffRole || currentStaff?.role,
    };

    let savedAuthoritative: Invoice = invoiceWithStaff;
    try {
      if (!editingInvoiceRecord) {
        const created = await api.invoices.create(invoiceWithStaff);
        if (created?.id) {
          savedAuthoritative = created;
        }
      }
    } catch (err: any) {
      console.warn("Could not persist invoice to cloud backend:", err.message);
    }

    const oldInvoice = editingInvoiceRecord
      ? invoices.find((i) => i.id === editingInvoiceRecord.id) ?? null
      : null;

    if (editingInvoiceRecord) {
      setInvoices((prev) => prev.map((x) => (x.id === editingInvoiceRecord.id ? savedAuthoritative : x)));
    } else {
      setInvoices((prev) => [savedAuthoritative, ...prev]);

      // If invoice was paid (Cash, Card, or partial payment), record verifiable Payment receipt
      if (savedAuthoritative.paidAmount > 0) {
        const paymentRecord: Payment = {
          id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          receiptNo: `REC-${String(Date.now()).slice(-6)}`,
          date: savedAuthoritative.date,
          partyType: "customer",
          partyId: savedAuthoritative.customerId,
          partyName: savedAuthoritative.customerName,
          partyPhone: savedAuthoritative.customerPhone,
          invoiceId: savedAuthoritative.id,
          invoiceNo: savedAuthoritative.invoiceNo,
          amount: savedAuthoritative.paidAmount,
          paymentMode: savedAuthoritative.paymentMode,
          notes: `Settled on billing for ${savedAuthoritative.invoiceNo}`,
          verificationStatus: "verified",
          verificationMethod: "manual",
          verifiedAt: new Date().toISOString(),
          staffId: currentStaff?.id,
          staffName: currentStaff?.name,
        };
        setPayments((prev) => [paymentRecord, ...prev]);
      }
    }

    // Stock difference reconciliation
    const mutation = planInvoiceMutation(oldInvoice, savedAuthoritative, { businessState: settings.state });
    setProducts((prev) => applyStockChanges(prev, mutation.stockChanges));

    // Record Stock Movement Ledger entries
    mutation.stockChanges.forEach((change) => {
      const prod = products.find((p) => p.id === change.productId);
      const sm: StockMovement = {
        id: `sm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        date: savedAuthoritative.date,
        productId: change.productId,
        productName: prod?.name || "Product",
        type: change.delta < 0 ? "Sale" : "Sales Return",
        quantity: change.delta,
        reference: `Invoice ${savedAuthoritative.invoiceNo}`,
        previousStock: prod?.stock || 0,
        newStock: Math.max(0, (prod?.stock || 0) + change.delta),
        staffId: currentStaff?.id,
        staffName: currentStaff?.name,
      };
      setStockMovements((prev) => [sm, ...prev]);
    });

    // Reset billing and open invoice preview
    setEditingInvoiceRecord(null);
    setView("invoices");
    setViewingInvoice(savedAuthoritative);
  };

  const handleCancelInvoice = (inv: Invoice) => {
    if (inv.status === "Cancelled") return;

    const proceedCancel = () => {
      // Sync cancellation to cloud API
      api.invoices.cancel(inv.id).catch((err) => {
        console.warn("Could not cancel invoice on backend API:", err.message);
      });

      const mutation = planInvoiceMutation(inv, null, { businessState: settings.state });
      setInvoices((prev) =>
        prev.map((x) =>
          x.id === inv.id
            ? {
                ...x,
                status: "Cancelled",
                notes: `${x.notes || ""}\nCANCELLED by ${currentStaff?.name || "Staff"} on ${new Date().toLocaleDateString()}`.trim(),
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
          staffId: currentStaff?.id,
          staffName: currentStaff?.name,
        };
        setStockMovements((prev) => [sm, ...prev]);
      });
    };

    if (!hasPermission(currentStaff, "invoices:cancel")) {
      requestPinVerification(
        `Authorize Cancellation of ${inv.invoiceNo}`,
        proceedCancel,
        `Current role (${currentStaff?.role}) requires Manager or Owner PIN authorization to cancel invoices.`
      );
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to cancel ${inv.invoiceNo}? This will restore inventory stock and reverse the invoice.`,
      )
    )
      return;

    proceedCancel();
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
    if (paymentData.verificationStatus !== "verified" || !paymentData.verifiedAt) {
      alert("Payment remains pending until receipt is independently verified.");
      return;
    }
    const linkedInvoice = invoices.find((invoice) => invoice.id === paymentData.invoiceId);
    if (linkedInvoice) {
      const outstanding = Math.max(0, roundMoney(linkedInvoice.grandTotal - linkedInvoice.paidAmount));
      if (paymentData.amount > outstanding) {
        alert(`Payment cannot exceed the outstanding balance of ${formatCurrency(outstanding)}.`);
        return;
      }
    }
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
  const handleSaveProduct = async (productData: Omit<Product, "id"> & { id?: string }) => {
    let savedProduct: Product;
    if (productData.id) {
      try {
        savedProduct = await api.products.update(productData.id, productData);
      } catch (err) {
        savedProduct = { id: productData.id, ...productData } as Product;
      }
      setProducts((prev) =>
        prev.map((p) => (p.id === productData.id ? ({ ...p, ...savedProduct } as Product) : p)),
      );
    } else {
      try {
        savedProduct = await api.products.create(productData);
      } catch (err) {
        savedProduct = {
          id: `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          ...productData,
        } as Product;
      }
      setProducts((prev) => [...prev, savedProduct]);
    }
    setShowProductModal(false);
    setEditingProduct(null);
    setProductInitialName("");
  };

  // --- Handlers: Staff Management ---
  const handleSaveStaffMember = async (savedStaff: StaffMember) => {
    let res: StaffMember = savedStaff;
    const isEditing = staffList.some((s) => s.id === savedStaff.id || (s as any)._id === savedStaff.id);
    try {
      if (isEditing) {
        res = await api.staff.update(savedStaff.id, savedStaff);
      } else {
        res = await api.staff.create(savedStaff);
      }
    } catch (err: any) {
      console.warn("Could not sync staff to backend:", err.message);
    }
    setStaffList((prev) => {
      const exists = prev.some((s) => s.id === res.id || (s as any)._id === res.id);
      if (exists) {
        return prev.map((s) => (s.id === res.id || (s as any)._id === res.id ? res : s));
      }
      return [...prev, res];
    });
  };

  const handleToggleStaffStatus = async (s: StaffMember) => {
    const nextStatus = s.status === "active" ? "inactive" : "active";
    try {
      await api.staff.update(s.id, { status: nextStatus });
    } catch (err: any) {
      console.warn("Could not update staff status on backend:", err.message);
    }
    setStaffList((prev) =>
      prev.map((item) => (item.id === s.id ? { ...item, status: nextStatus } : item))
    );
  };

  const handleResetStaffPin = async (s: StaffMember) => {
    const newPin = window.prompt(`Enter new 4 to 6 digit security PIN for ${s.name}:`);
    if (!newPin) return;
    if (!/^\d{4,6}$/.test(newPin.trim())) {
      alert("PIN must be 4 to 6 numeric digits.");
      return;
    }
    try {
      await api.staff.resetPin(s.id, newPin.trim());
      alert(`Security PIN for ${s.name} updated successfully.`);
    } catch (err: any) {
      alert(`Could not reset PIN: ${err.message}`);
    }
  };

  // --- Handlers: Customers ---
  const handleSaveCustomer = async (customerData: Omit<Customer, "id"> & { id?: string }) => {
    let savedCustomer: Customer;
    if (customerData.id) {
      try {
        savedCustomer = await api.customers.update(customerData.id, customerData);
      } catch (err) {
        savedCustomer = { id: customerData.id, ...customerData } as Customer;
      }
      setCustomers((prev) =>
        prev.map((c) => (c.id === customerData.id ? ({ ...c, ...savedCustomer }) : c)),
      );
    } else {
      let res: any;
      try {
        res = await api.customers.create(customerData);
      } catch (err) {
        console.warn("Could not save customer to backend API, saving locally:", err);
        res = {
          ...customerData,
          id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        };
      }
      savedCustomer = {
        id: res.id || res._id,
        name: res.name || customerData.name,
        phone: res.phone !== undefined ? res.phone : (customerData.phone || ""),
        email: res.email || customerData.email,
        gstin: res.gstin !== undefined ? res.gstin : (customerData.gstin || ""),
        address: res.address !== undefined ? res.address : (customerData.address || ""),
        state: res.state || customerData.state,
        openingBalance:
          res.openingBalance !== undefined ? res.openingBalance : (customerData.openingBalance || 0),
        notes: res.notes || customerData.notes,
      };
      setCustomers((prev) => {
        const existingIdx = prev.findIndex((c) => c.id === savedCustomer.id);
        if (existingIdx >= 0) {
          return prev.map((c, i) => (i === existingIdx ? savedCustomer : c));
        }
        return [...prev, savedCustomer];
      });
    }
    if (savedCustomer?.id) customerCreatedCallback?.(savedCustomer.id);
    setCustomerCreatedCallback(null);
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
  const handleExportBackup = (): boolean => {
    try {
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
      const res = downloadBackupFile(backup);
      return res.ok;
    } catch (err) {
      console.error("Backup export error:", err);
      return false;
    }
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

  const shareOnWhatsApp = async (inv: Invoice) => {
    let waPhone = inv.customerPhone;
    if (!waPhone) {
      const entered = window.prompt(
        "Enter the customer's WhatsApp number with country code:",
        "",
      );
      if (entered === null) return;
      waPhone = entered;
    }
    const result = await shareInvoiceViaWhatsApp(
      { ...inv, customerPhone: waPhone },
      settings,
    );
    if (result.method === "failed") {
      window.alert(result.message);
    } else if (result.method === "download-then-wa") {
      window.alert(result.message);
    }
  };

  const downloadInvoiceFile = async (inv: Invoice) => {
    const { downloadBlob, generateInvoicePdfBlob, openInvoiceForPrint } =
      await import("./services/pdfService");
    const pdfBlob = await generateInvoicePdfBlob(inv, settings);
    if (pdfBlob) {
      downloadBlob(pdfBlob, `${inv.invoiceNo}.pdf`);
    } else {
      openInvoiceForPrint(inv, settings);
    }
  };

  // Category list helper for product modal
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Login-Free Staff Selection Flow
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mb-4">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-slate-400 text-sm font-medium animate-pulse">
          Initializing Vels Tech Secure Terminal...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <StaffLoginScreen onAuthenticated={handleStaffAuthenticated} />;
  }

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
              BILLING • {settings.location || "VEPPUR"}
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
            { k: "staff", label: "Staff & Users", icon: Users },
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
              <span className="mono text-zinc-400 text-[10px]">v1.1.0</span>
            </div>
            <div className="text-[12px] text-zinc-300 mt-1 leading-snug">
              Encrypted Local Storage • Full Offline PWA
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Drawer */}
      {mobileSidebarOpen && (
        <div className="no-print md:hidden fixed inset-0 z-40">
          <button
            type="button"
            aria-label="Close navigation menu"
            className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[84vw] max-w-[300px] bg-white shadow-2xl flex flex-col">
            <div className="h-[64px] flex items-center justify-between px-4 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <img src={appLogo} alt="Vels Tech Logo" className="h-8 w-8 rounded-lg object-cover" />
                <div className="leading-tight">
                  <div className="font-extrabold text-[14px]">VELS TECH</div>
                  <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                    Billing • {settings.location || "VEPPUR"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMobileSidebarOpen(false)}
                className="h-9 w-9 grid place-items-center rounded-xl bg-zinc-100 text-zinc-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

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
                { k: "staff", label: "Staff & Users", icon: Users },
                { k: "settings", label: "Settings", icon: SettingsIcon },
              ].map((item) => (
                <button
                  key={item.k}
                  type="button"
                  onClick={() => {
                    if (item.k === "billing") setEditingInvoiceRecord(null);
                    setView(item.k as AppView);
                    setMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition min-h-[44px] ${
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

            <div className="p-4 border-t border-zinc-100">
              <div className="rounded-2xl bg-zinc-900 text-white p-3.5">
                <div className="text-[12px] text-zinc-300 leading-snug">
                  Encrypted Local Storage • Full Offline PWA
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile Top Navigation Header */}
      <div className="no-print md:hidden sticky top-0 z-30 bg-white border-b border-zinc-200">
        <div className="flex items-center justify-between px-4 h-[60px]">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src={appLogo} alt="Vels Tech Logo" className="h-8 w-8 rounded-lg object-cover shrink-0" />
            <div className="min-w-0">
              <div className="font-extrabold text-[15px] leading-tight truncate">VELS TECH</div>
              <div className="text-[10px] text-zinc-400 font-semibold uppercase">
                BILLING • {settings.location || "VEPPUR"}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <HeaderStaffSwitcher
              currentStaff={currentStaff}
              staffList={staffList}
              currentBusiness={currentBusiness}
              onSelectStaff={handleSwitchStaffWithChallenge}
              onOpenStaffManagement={() => setView("staff")}
              onOpenBusinessManagement={() => setShowBusinessModal(true)}
              onLockTerminal={handleLockTerminal}
            />
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileSidebarOpen(true)}
              className="h-10 w-10 grid place-items-center rounded-xl bg-zinc-100 text-zinc-700"
            >
              <Menu className="h-5 w-5" />
            </button>
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
              className="h-9 px-2 sm:px-3 rounded-xl bg-indigo-600 text-white font-bold text-[12px] flex items-center gap-1 shrink-0"
            >
              ⚡ <span className="hidden sm:inline">Actions</span>
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
              <HeaderStaffSwitcher
                currentStaff={currentStaff}
                staffList={staffList}
                currentBusiness={currentBusiness}
                onSelectStaff={handleSwitchStaffWithChallenge}
                onOpenStaffManagement={() => setView("staff")}
                onOpenBusinessManagement={() => setShowBusinessModal(true)}
                onLockTerminal={handleLockTerminal}
              />
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
               initialCustomerId={billingInitialCustomerId}
              onInitialCustomerConsumed={() => setBillingInitialCustomerId("")}
              onSaveInvoice={handleSaveInvoice}
              onCreateInvoiceDraft={handleCreateInvoiceDraft}
              onConfirmManualPayment={handleConfirmManualPayment}
              onOpenBarcodeScanner={() => setShowBarcodeScannerModal(true)}
              onOpenAddProduct={(name) => {
                setProductInitialName(name || "");
                setEditingProduct(null);
                setShowProductModal(true);
              }}
              onOpenAddCustomer={(onCreated) => {
                setEditingCustomer(null);
                setCustomerCreatedCallback(() => onCreated);
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
              onWhatsApp={shareOnWhatsApp}
              onDownloadPdf={downloadInvoiceFile}
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
                setBillingInitialCustomerId(c.id);
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
              staffList={staffList}
            />
          )}

          {view === "staff" && (
            <StaffPage
              staffList={staffList}
              currentStaff={currentStaff}
              onAddStaff={() => {
                setEditingStaffMember(null);
                setShowStaffModal(true);
              }}
              onEditStaff={(s) => {
                setEditingStaffMember(s);
                setShowStaffModal(true);
              }}
              onToggleStatus={handleToggleStaffStatus}
              onResetPin={handleResetStaffPin}
              onRequestPinVerification={requestPinVerification}
            />
          )}

          {view === "settings" && (
            <SettingsPage
              settings={settings}
              onUpdateSettings={(updated) => {
                setSettings(updated);
                api.updateSettings(updated).catch(() => {});
              }}
              onExportBackup={handleExportBackup}
              onImportBackup={handleImportBackup}
              onResetData={handleResetData}
              onManageBusinesses={() => setShowBusinessModal(true)}
            />
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Phase 24) */}
      <div className="no-print md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-zinc-200 pb-[env(safe-area-inset-bottom)]">
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
                <Smartphone className="h-4 w-4" /> Send PDF via WhatsApp
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
                <Download className="h-4 w-4" /> Download Invoice PDF
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
          existingCustomers={customers}
          defaultState={settings.state}
          onSave={handleSaveCustomer}
          onSelectExisting={customerCreatedCallback ?? undefined}
          onClose={() => {
            setShowCustomerModal(false);
            setEditingCustomer(null);
            setCustomerCreatedCallback(null);
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
            setBillingInitialCustomerId(c.id);
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

      {/* 14. Staff Create / Edit Modal */}
      {showStaffModal && (
        <StaffModal
          isOpen={showStaffModal}
          staff={editingStaffMember}
          existingStaff={staffList}
          onSave={handleSaveStaffMember}
          onClose={() => {
            setShowStaffModal(false);
            setEditingStaffMember(null);
          }}
        />
      )}

      {/* 15. Security Verification / PIN Modal */}
      {pinModalOpen && (
        <PinVerificationModal
          isOpen={pinModalOpen}
          staff={currentStaff}
          allStaff={staffList}
          actionTitle={pinModalTitle}
          actionDescription={pinModalDesc}
          onSuccess={(verifiedStaff) => {
            setPinModalOpen(false);
            if (pinModalCallback) {
              pinModalCallback(verifiedStaff);
              setPinModalCallback(null);
            }
          }}
          onClose={() => {
            setPinModalOpen(false);
            setPinModalCallback(null);
          }}
        />
      )}

      {/* 16. Multi-Business / Branch Management Modal */}
      {showBusinessModal && (
        <BusinessManagementModal
          isOpen={showBusinessModal}
          currentBusiness={currentBusiness}
          onClose={() => setShowBusinessModal(false)}
          onSelectBusiness={(biz) => {
            setCurrentBusiness(biz);
            authService.setLastBusinessId(biz.businessId || biz.id);
            loadCloudData();
          }}
        />
      )}
    </div>
  );
}
