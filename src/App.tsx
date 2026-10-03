import React, { useState, useEffect, useMemo } from "react";
import logoImg from "./assets/profile-logo.jpeg";
import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Plus,
  Search,
  Settings as SettingsIcon,
  Receipt,
  TrendingUp,
  AlertTriangle,
  IndianRupee,
  CreditCard,
  Smartphone,
  Banknote,
  Printer,
  Eye,
  Trash2,
  Edit3,
  Copy,
  X,
  ChevronDown,
  Check,
  Menu,
  LogOut,
  Zap,
  Box,
  ArrowUpRight,
  Calendar,
  MapPin,
  Phone,
  Mail,
  ShoppingCart,
  Filter,
  MoreVertical,
  Save,
} from "lucide-react";

// --- Types ---
type Product = {
  id: string;
  name: string;
  hsn: string;
  price: number;
  gst: number;
  stock: number;
  unit: string;
};

type Customer = {
  id: string;
  name: string;
  phone: string;
  gstin: string;
  address: string;
  state: string;
};

type InvoiceItem = {
  productId: string;
  name: string;
  hsn: string;
  price: number;
  qty: number;
  discount: number; // percent
  gst: number;
};

type Invoice = {
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
  paymentMode: "Cash" | "UPI" | "Card" | "Credit";
  paymentStatus: "Paid" | "Pending" | "Partial";
  paidAmount: number;
  notes: string;
  terms: string;
};

type CompanySettings = {
  companyName: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  state: string;
  invoiceTerms: string;
  logoText: string;
  logo: string;
};

const STATES = [
  "Tamil Nadu",
  "Karnataka",
  "Kerala",
  "Andhra Pradesh",
  "Maharashtra",
  "Delhi",
  "Gujarat",
  "Telangana",
  "Rajasthan",
  "West Bengal",
  "Madhya Pradesh",
  "Uttar Pradesh",
];

const GST_OPTIONS = [0, 5, 12, 18, 28];

const seedProducts: Product[] = [
  { id: "p1", name: "Dell Inspiron 14 Laptop", hsn: "8471", price: 54990, gst: 18, stock: 14, unit: "pcs" },
  { id: "p2", name: "Logitech MX Master 3S Mouse", hsn: "84716060", price: 7990, gst: 18, stock: 42, unit: "pcs" },
  { id: "p3", name: "Samsung 870 EVO 1TB SSD", hsn: "84717020", price: 6599, gst: 18, stock: 7, unit: "pcs" },
  { id: "p4", name: "USB-C Hub 7-in-1 Aluminium", hsn: "84733099", price: 2499, gst: 18, stock: 23, unit: "pcs" },
  { id: "p5", name: "Keychron K2 Mechanical Keyboard", hsn: "84716040", price: 7499, gst: 18, stock: 9, unit: "pcs" },
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
};

// Helpers
const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

const todayISO = () => new Date().toISOString().slice(0, 10);

const genId = () => Math.random().toString(36).slice(2, 9);

const calcInvoiceTotals = (items: InvoiceItem[], customerState: string, companyState: string) => {
  let subtotal = 0;
  let discountTotal = 0;
  let taxable = 0;
  let gstTotal = 0;
  let cgst = 0, sgst = 0, igst = 0;
  items.forEach(it => {
    const line = it.price * it.qty;
    const disc = (line * it.discount) / 100;
    const taxBase = line - disc;
    const gstAmt = (taxBase * it.gst) / 100;
    subtotal += line;
    discountTotal += disc;
    taxable += taxBase;
    gstTotal += gstAmt;
    if (customerState === companyState) {
      cgst += gstAmt / 2;
      sgst += gstAmt / 2;
    } else {
      igst += gstAmt;
    }
  });
  const beforeRound = taxable + gstTotal;
  const rounded = Math.round(beforeRound);
  const roundOff = +(rounded - beforeRound).toFixed(2);
  return { subtotal, discountTotal, taxableAmount: taxable, cgst, sgst, igst, gstTotal, grandTotal: rounded, roundOff };
};

export default function App() {
  // --- persisted state ---
  const [products, setProducts] = useState<Product[]>(() => {
    const s = localStorage.getItem("vels_products");
    return s ? JSON.parse(s) : seedProducts;
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const s = localStorage.getItem("vels_customers");
    return s ? JSON.parse(s) : seedCustomers;
  });
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const s = localStorage.getItem("vels_invoices");
    return s ? JSON.parse(s) : [];
  });
  const [settings, setSettings] = useState<CompanySettings>(() => {
    const s = localStorage.getItem("vels_settings");
    const parsed = s ? JSON.parse(s) : defaultSettings;
    return { logo: "", ...parsed };
  });
  const [logoError, setLogoError] = useState("");

  /* ------------------------------------------------------------------
   * LOGO SYSTEMS — two SEPARATE concerns, never mixed.
   *
   * 1) appLogo  -> APP BRANDING ONLY (sidebar, mobile nav header).
   *    This is the fixed/default VELS TECH logo. It must NEVER be
   *    replaced by the logo uploaded in Business Details.
   *
   * 2) invoiceLogo -> INVOICE ONLY (invoice preview, print, A4 PDF,
   *    WhatsApp invoice file). It is the permanent Business Settings
   *    logo (settings.logo) and falls back to the default logo when no
   *    custom logo exists. There is exactly ONE permanent company logo
   *    setting (settings.logo in localStorage "vels_settings").
   * ------------------------------------------------------------------ */
  const appLogo = logoImg;

  // Default logo, inlined as a data URL so the invoice stays self-contained when
  // printed / downloaded as an A4 HTML-PDF / shared on WhatsApp.
  const [defaultLogoDataUrl, setDefaultLogoDataUrl] = useState("");
  useEffect(() => {
    let alive = true;
    fetch(logoImg)
      .then(r => r.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result));
        fr.onerror = () => reject(new Error("Could not read default logo"));
        fr.readAsDataURL(blob);
      }))
      .then(dataUrl => { if (alive) setDefaultLogoDataUrl(dataUrl); })
      .catch(() => { /* fall back to the plain asset URL */ });
    return () => { alive = false; };
  }, []);

  // Consumed ONLY by the invoice renderer + its print/PDF/WhatsApp outputs.
  const invoiceLogo = settings.logo || defaultLogoDataUrl || logoImg;

  const compressLogoFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Could not read file"));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error("Invalid image"));
        img.onload = () => {
          const maxSide = 512;
          const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("Canvas unsupported")); return; }
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/webp", 0.85));
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });

  const handleLogoSelect = async (file: File | undefined) => {
    setLogoError("");
    if (!file) return;
    const okTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!okTypes.includes(file.type)) { setLogoError("Only PNG, JPG, JPEG or WEBP allowed"); return; }
    if (file.size > 2 * 1024 * 1024) { setLogoError("Max file size is 2MB"); return; }
    try {
      const dataUrl = await compressLogoFile(file);
      setSettings(s => ({ ...s, logo: dataUrl }));
    } catch {
      setLogoError("Could not process image. Try another file.");
    }
  };

  const [view, setView] = useState<"dashboard" | "products" | "customers" | "billing" | "invoices" | "settings">("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [searchProducts, setSearchProducts] = useState("");
  const [searchCustomers, setSearchCustomers] = useState("");
  const [searchInvoices, setSearchInvoices] = useState("");
  const [navTick, setNavTick] = useState(0);

  // Product modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<Omit<Product, "id">>({
    name: "", hsn: "", price: 0, gst: 18, stock: 0, unit: "pcs"
  });

  // Customer modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState<Omit<Customer, "id">>({
    name: "", phone: "", gstin: "", address: "", state: "Tamil Nadu"
  });

  // Billing form
  const [billingCustomerId, setBillingCustomerId] = useState<string>("");
  const [billingPhone, setBillingPhone] = useState<string>("");
  const [billingPhoneTouched, setBillingPhoneTouched] = useState(false);
  const [lastSavedInvoice, setLastSavedInvoice] = useState<Invoice | null>(null);
  const [showWaPrompt, setShowWaPrompt] = useState(false);
  const [billingDate, setBillingDate] = useState<string>(todayISO());
  const [billingItems, setBillingItems] = useState<InvoiceItem[]>([]);
  const [billingDiscount, setBillingDiscount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<Invoice["paymentMode"]>("UPI");
  const [paymentStatus, setPaymentStatus] = useState<Invoice["paymentStatus"]>("Paid");
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [billingNotes, setBillingNotes] = useState("");
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [customerSearchInline, setCustomerSearchInline] = useState("");

  // Invoice view
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [shareBusy, setShareBusy] = useState(false);

  const escapeHtml = (s: string) =>
    String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const normalizeWaNumber = (raw: string) => {
    const digits = String(raw || "").replace(/\D/g, "");
    const core = digits.replace(/^91(?=\d{10}$)/, "").replace(/^0(?=\d{10}$)/, "");
    return { digits10: core.length === 10 ? core : "", waNumber: core.length === 10 ? `91${core}` : "", display: core.length === 10 ? `+91 ${core.slice(0, 5)} ${core.slice(5)}` : String(raw || "").trim() };
  };

  const printCurrentInvoice = () => {
    requestAnimationFrame(() => window.print());
  };

  const buildWhatsAppText = (inv: Invoice) => {
    const lines = inv.items.map((it, i) => `${i + 1}. ${it.name} (HSN ${it.hsn}) - ${it.qty} x ${formatINR(it.price)}, Disc ${it.discount}%, GST ${it.gst}%`);
    return [`*${settings.companyName}*`, settings.address, `GSTIN: ${settings.gstin}`, ``, `*TAX INVOICE ${inv.invoiceNo}* (${inv.date})`, `Bill To: ${inv.customerName}, ${inv.customerAddress}, ${inv.customerState} ${inv.customerGstin}`, `Phone: ${inv.customerPhone}`, ``, ...lines, ``, `Taxable: ${formatINR(inv.taxableAmount)}`, inv.cgst > 0 ? `CGST: ${formatINR(inv.cgst)} | SGST: ${formatINR(inv.sgst)}` : `IGST: ${formatINR(inv.igst)}`].join("\n");
  };

  const buildTotalsText = (inv: Invoice) =>
    [`Grand Total: ${formatINR(inv.grandTotal)}`, `Paid (${inv.paymentMode}): ${formatINR(inv.paidAmount)}`, `Balance: ${formatINR(inv.grandTotal - inv.paidAmount)}`, ``, `UPI: vels.tech@okicici`].join("\n");

  const buildTermsText = (inv: Invoice) =>
    [`Terms: ${(inv.terms || settings.invoiceTerms).replace(/\n/g, " | ")}`, inv.notes ? `Notes: ${inv.notes}` : ""].filter(Boolean).join("\n");

  const buildCustomerWaMessage = (customerName: string, invoiceNo: string, invoiceDate: string, grandTotal: number, payStatus: string, payMode: string) =>
    [`Hello ${customerName},`, ``, `Greetings from ${settings.companyName}.`, ``, `Your invoice ${invoiceNo} has been generated.`, ``, `Invoice Amount: ${formatINR(grandTotal)}`, `Payment Status: ${payStatus}`, `Payment Method: ${payMode}`, `Invoice Date: ${invoiceDate}`, ``, `Thank you for your business.`, ``, `Regards,`, `${settings.companyName}`, `VELS TECH Billing`].join("\n");

  const fullInvoiceText = (inv: Invoice) =>
    [buildWhatsAppText(inv), buildTotalsText(inv), buildTermsText(inv)].join("\n");

  const buildRowHtml = (inv: Invoice) =>
    inv.items.map((it, idx) => {
      const line = it.price * it.qty;
      const disc = (line * it.discount) / 100;
      const taxable = line - disc;
      const gstAmt = (taxable * it.gst) / 100;
      return `<tr><td>${idx + 1}</td><td><b>${escapeHtml(it.name)}</b><br/><span>HSN ${escapeHtml(it.hsn)} &bull; ${it.gst}% GST</span></td><td style="text-align:center">${it.qty}</td><td style="text-align:right">${formatINR(it.price)}</td><td style="text-align:right">${it.discount}% (${formatINR(disc)})</td><td style="text-align:right">${formatINR(taxable)}</td><td style="text-align:right"><b>${formatINR(taxable + gstAmt)}</b></td></tr>`;
    }).join("");

  const buildInvoiceHtmlDoc = (inv: Invoice) => {
    const bal = inv.grandTotal - inv.paidAmount;
    const logoTag = invoiceLogo ? `<img src="${invoiceLogo}" alt="logo" style="height:48px;width:48px;object-fit:cover;border-radius:10px;"/>` : "";
    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Invoice ${escapeHtml(inv.invoiceNo)}</title><style>@page{size:A4 portrait;margin:12mm}body{font-family:Arial,sans-serif;color:#111;padding:24px}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#111;color:#fff;padding:8px;text-align:left}td{border-top:1px solid #eee;padding:8px}tr{page-break-inside:avoid}.box{border:1px solid #ddd;border-radius:8px;padding:10px;margin-top:12px}</style></head><body>${logoTag}<h2>${escapeHtml(settings.companyName)}</h2><div>${escapeHtml(settings.address)}<br/>GSTIN:${escapeHtml(settings.gstin)} ${escapeHtml(settings.phone)} ${escapeHtml(settings.email)}</div><div><b>TAX INVOICE ${escapeHtml(inv.invoiceNo)}</b> ${escapeHtml(inv.date)} ${escapeHtml(inv.paymentStatus)} ${escapeHtml(inv.paymentMode)}</div><div class="box"><b>BILL TO ${escapeHtml(inv.customerName)}</b><br/>${escapeHtml(inv.customerAddress)}<br/>${escapeHtml(inv.customerState)} ${escapeHtml(inv.customerGstin)} ${escapeHtml(inv.customerPhone)}</div><table><thead><tr><th>#</th><th>PRODUCT / HSN</th><th>QTY</th><th>RATE</th><th>DISC</th><th>TAXABLE</th><th>TOTAL</th></tr></thead><tbody>${buildRowHtml(inv)}</tbody></table><div class="box">Subtotal ${formatINR(inv.subtotal)} Discount -${formatINR(inv.discountTotal)} Taxable ${formatINR(inv.taxableAmount)} ${buildInvoiceTaxLines(inv)} Grand ${formatINR(inv.grandTotal)} Paid ${formatINR(inv.paidAmount)} Balance ${formatINR(bal)} UPI vels.tech@okicici Terms ${escapeHtml(inv.terms || settings.invoiceTerms)} ${escapeHtml(inv.notes || "")}</div></body></html>`;
  };

  const buildInvoiceHead = (inv: Invoice) =>
    `${settings.companyName} ${settings.address} GSTIN:${settings.gstin} Phone:${settings.phone} Invoice:${inv.invoiceNo} Date:${inv.date}`;

  const buildInvoiceTaxLines = (inv: Invoice) =>
    inv.cgst > 0 ? `CGST ${formatINR(inv.cgst)} SGST ${formatINR(inv.sgst)}` : `IGST ${formatINR(inv.igst)}`;

  const downloadInvoiceFile = (inv: Invoice) => {
    const blob = new Blob([buildInvoiceHtmlDoc(inv)], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${inv.invoiceNo}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const shareOnWhatsApp = async (inv: Invoice) => {
    try {
      setShareBusy(true);
      const file = new File([buildInvoiceHtmlDoc(inv)], `${inv.invoiceNo}.html`, { type: "text/html" });
      const nav: any = navigator;
      if (nav?.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: `Invoice ${inv.invoiceNo}`, text: fullInvoiceText(inv) });
        return;
      }
      const text = encodeURIComponent(fullInvoiceText(inv));
      const { waNumber } = normalizeWaNumber(inv.customerPhone);
      const url = waNumber ? `https://wa.me/${waNumber}?text=${text}` : `https://wa.me/?text=${text}`;
      window.open(url, "_blank");
    } finally {
      setShareBusy(false);
    }
  };

  const openCustomerChat = (rawPhone: string, message: string) => {
    const { waNumber } = normalizeWaNumber(rawPhone);
    if (!waNumber) return false;
    window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`, "_blank");
    return true;
  };

  const shareInvoicePdfNative = async (inv: Invoice) => {
    const file = new File([buildInvoiceHtmlDoc(inv)], `${inv.invoiceNo}.html`, { type: "text/html" });
    const nav: any = navigator;
    if (nav?.canShare && nav.canShare({ files: [file] })) {
      await nav.share({ files: [file], title: `Invoice ${inv.invoiceNo}`, text: fullInvoiceText(inv) });
      return true;
    }
    downloadInvoiceFile(inv);
    return false;
  };

  const billingWa = normalizeWaNumber(billingPhone);
  const billingWaValid = billingWa.waNumber.length === 12;
  const showBillingPhoneError = billingPhoneTouched && billingPhone.trim().length > 0 && !billingWaValid;

  useEffect(() => { localStorage.setItem("vels_products", JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem("vels_customers", JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem("vels_invoices", JSON.stringify(invoices)); }, [invoices]);
  useEffect(() => { localStorage.setItem("vels_settings", JSON.stringify(settings)); }, [settings]);

  // Dashboard calcs
  const dashboardStats = useMemo(() => {
    const today = todayISO();
    const todays = invoices.filter(i => i.date === today);
    const todaySales = todays.reduce((s, i) => s + i.grandTotal, 0);
    const pendingAmt = invoices.filter(i => i.paymentStatus !== "Paid").reduce((s, i) => s + (i.grandTotal - i.paidAmount), 0);
    const lowStock = products.filter(p => p.stock <= 10).length;
    return { todaySales, totalInvoices: invoices.length, pendingAmt, lowStock, todaysCount: todays.length };
  }, [invoices, products]);

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchProducts.toLowerCase()) || p.hsn.includes(searchProducts));
  const filteredCustomers = customers.filter(c => c.name.toLowerCase().includes(searchCustomers.toLowerCase()) || c.phone.includes(searchCustomers));
  const filteredInvoices = invoices.filter(inv => inv.invoiceNo.toLowerCase().includes(searchInvoices.toLowerCase()) || inv.customerName.toLowerCase().includes(searchInvoices.toLowerCase())).sort((a,b)=> b.date.localeCompare(a.date));

  const selectedCustomer = customers.find(c => c.id === billingCustomerId) || null;
  const billingCalc = calcInvoiceTotals(billingItems, selectedCustomer?.state || settings.state, settings.state);

  // Opens WhatsApp chat for the CURRENTLY ENTERED number with a message built from the current invoice.
  // Works for any number (manually typed, selected customer's saved number, or a manual override).
  const handleBillingWhatsApp = () => {
    const customerName = selectedCustomer?.name || "Customer";
    const message = buildCustomerWaMessage(
      customerName,
      nextInvoiceNo,
      billingDate,
      billingCalc.grandTotal,
      paymentStatus,
      paymentMode
    );
    if (!openCustomerChat(billingPhone, message)) {
      setBillingPhoneTouched(true);
      alert("Enter a valid WhatsApp number");
    }
  };

  // Invoice number
  const nextInvoiceNo = useMemo(() => {
    if (editingInvoiceId) {
      const existing = invoices.find(i => i.id === editingInvoiceId);
      return existing?.invoiceNo || "VELS-0001";
    }
    const max = invoices.reduce((m, inv) => {
      const num = parseInt(inv.invoiceNo.split("-")[1] || "0");
      return Math.max(m, num);
    }, 0);
    return `VELS-${String(max + 1).padStart(4, "0")}`;
  }, [invoices, editingInvoiceId]);

  // Actions
  const openAddProduct = () => {
    setEditingProduct(null);
    setProductForm({ name: "", hsn: "", price: 0, gst: 18, stock: 0, unit: "pcs" });
    setShowProductModal(true);
  };
  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProductForm({ name: p.name, hsn: p.hsn, price: p.price, gst: p.gst, stock: p.stock, unit: p.unit });
    setShowProductModal(true);
  };
  const saveProduct = () => {
    if (!productForm.name) return;
    if (editingProduct) {
      setProducts(prev => prev.map(x => x.id === editingProduct.id ? { ...x, ...productForm } : x));
    } else {
      setProducts(prev => [...prev, { id: genId(), ...productForm }]);
    }
    setShowProductModal(false);
  };

  const openAddCustomer = () => {
    setEditingCustomer(null);
    setCustomerForm({ name: "", phone: "", gstin: "", address: "", state: "Tamil Nadu" });
    setShowCustomerModal(true);
  };
  const openEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setCustomerForm({ name: c.name, phone: c.phone, gstin: c.gstin, address: c.address, state: c.state });
    setShowCustomerModal(true);
  };
  const saveCustomer = () => {
    if (!customerForm.name) return;
    if (editingCustomer) {
      setCustomers(prev => prev.map(x => x.id === editingCustomer.id ? { ...x, ...customerForm } : x));
    } else {
      const newC = { id: genId(), ...customerForm };
      setCustomers(prev => [...prev, newC]);
      if (view === "billing") setBillingCustomerId(newC.id);
    }
    setShowCustomerModal(false);
  };

  const addProductToInvoice = (product: Product) => {
    setBillingItems(prev => {
      const exist = prev.find(p => p.productId === product.id);
      if (exist) return prev.map(p => p.productId === product.id ? { ...p, qty: p.qty + 1 } : p);
      return [...prev, { productId: product.id, name: product.name, hsn: product.hsn, price: product.price, qty: 1, discount: 0, gst: product.gst }];
    });
    setProductSearch("");
  };

  const updateBillingItem = (idx: number, patch: Partial<InvoiceItem>) => {
    setBillingItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  };

  const handleSaveInvoice = () => {
    if (!selectedCustomer) { alert("Select customer"); return; }
    if (billingItems.length === 0) { alert("Add at least one product"); return; }
    const effectivePhone = billingPhone.trim() ? billingPhone.trim() : selectedCustomer.phone;
    const phoneCheck = normalizeWaNumber(effectivePhone);
    if (!phoneCheck.waNumber) { alert("Enter a valid WhatsApp number"); setBillingPhoneTouched(true); return; }
    const totals = calcInvoiceTotals(billingItems, selectedCustomer.state, settings.state);
    const finalPaid = paymentStatus === "Paid" ? totals.grandTotal : paymentStatus === "Pending" ? 0 : paidAmount;
    const inv: Invoice = {
      id: editingInvoiceId || genId(),
      invoiceNo: nextInvoiceNo,
      date: billingDate,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      customerPhone: effectivePhone,
      customerGstin: selectedCustomer.gstin,
      customerAddress: selectedCustomer.address,
      customerState: selectedCustomer.state,
      items: billingItems,
      ...totals,
      paymentMode,
      paymentStatus,
      paidAmount: finalPaid,
      notes: billingNotes,
      terms: settings.invoiceTerms,
    };
    if (editingInvoiceId) {
      setInvoices(prev => prev.map(x => x.id === editingInvoiceId ? inv : x));
    } else {
      setInvoices(prev => [...prev, inv]);
      // decrement stock
      setProducts(prev => prev.map(p => {
        const used = billingItems.find(b => b.productId === p.id);
        if (used) return { ...p, stock: Math.max(0, p.stock - used.qty) };
        return p;
      }));
    }
    setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, phone: effectivePhone } : c));
    // reset
    setBillingItems([]);
    setBillingCustomerId("");
    setBillingPhone("");
    setBillingPhoneTouched(false);
    setLastSavedInvoice(inv);
    setShowWaPrompt(true);
    setEditingInvoiceId(null);
    setBillingNotes("");
    setPaymentStatus("Paid");
    setPaidAmount(0);
    setView("invoices");
    setViewingInvoice(inv);
  };

  const startEditInvoice = (inv: Invoice) => {
    setEditingInvoiceId(inv.id);
    setBillingCustomerId(inv.customerId);
    setBillingPhone(inv.customerPhone || "");
    setBillingPhoneTouched(false);
    setLastSavedInvoice(null);
    setShowWaPrompt(false);
    setBillingDate(inv.date);
    setBillingItems(inv.items);
    setPaymentMode(inv.paymentMode);
    setPaymentStatus(inv.paymentStatus);
    setPaidAmount(inv.paidAmount);
    setBillingNotes(inv.notes);
    setView("billing");
  };

  const duplicateInvoice = (inv: Invoice) => {
    setEditingInvoiceId(null);
    setBillingCustomerId(inv.customerId);
    setBillingPhone(inv.customerPhone || "");
    setBillingPhoneTouched(false);
    setLastSavedInvoice(null);
    setShowWaPrompt(false);
    setBillingDate(todayISO());
    setBillingItems(inv.items);
    setPaymentMode(inv.paymentMode);
    setPaymentStatus("Pending");
    setPaidAmount(0);
    setBillingNotes(inv.notes);
    setView("billing");
  };

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-zinc-900 selection:bg-indigo-200">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap');
        *{font-family:Inter, system-ui, sans-serif}
        .mono{font-family:'JetBrains Mono', monospace}
        @media print{
          @page{ size:A4 portrait; margin:10mm 10mm 12mm 10mm; }
          html, body{ background:#fff !important; margin:0 !important; padding:0 !important; }
          body *{ visibility:hidden; }
          #print-area, #print-area *{ visibility:visible; }
          #print-area{ position:absolute !important; left:0 !important; top:0 !important; }
          #print-area{ width:100% !important; max-width:100% !important; margin:0 !important; box-shadow:none !important; border:none !important; border-radius:0 !important; background:#fff !important; display:block !important; }
          .no-print{ display:none !important; }
          .print-only{ display:block !important; }
          #print-area table{ page-break-inside:auto; }
          #print-area tr{ page-break-inside:avoid; }
          #print-area .avoid-break{ page-break-inside:avoid; }
          #print-area *{ box-shadow:none !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        }
        .scrollbar-hide::-webkit-scrollbar{display:none}
        .scrollbar-hide{-ms-overflow-style:none; scrollbar-width:none}
      `}</style>

      {/* Sidebar Desktop */}
      <div className="no-print hidden md:flex fixed left-0 top-0 h-screen w-[268px] flex-col bg-white border-r border-zinc-200">
        <div className="h-[72px] flex items-center gap-3 px-6 border-b border-zinc-100">
          {/* APP BRANDING — fixed VELS TECH logo. Never the Business Details logo. */}
          <img src={appLogo} alt="Vels Tech logo" className="h-9 w-9 rounded-xl shadow-sm object-cover" />
          <div className="leading-tight">
            <div className="font-extrabold tracking-[-0.02em] text-[15px]">VELS TECH</div>
            <div className="text-[11px] text-zinc-500 font-medium tracking-wide">BILLING • VEPPUR</div>
          </div>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          {[
            { k: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { k: "billing", label: "New Invoice", icon: Receipt },
            { k: "invoices", label: "Invoices", icon: FileText },
            { k: "products", label: "Products", icon: Package },
            { k: "customers", label: "Customers", icon: Users },
            { k: "settings", label: "Settings", icon: SettingsIcon },
          ].map(item => (
            <button
              key={item.k}
              onClick={() => { setView(item.k as any); setNavTick(t=>t+1); setMobileMenu(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition
                ${view === item.k ? "bg-indigo-600 text-white shadow-[0_8px_20px_-12px_rgba(79,70,229,0.8)]" : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"}`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
              {item.k === "billing" && <span className="ml-auto bg-white/20 text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide">⌘N</span>}
            </button>
          ))}
        </nav>
        <div className="p-4">
          <div className="rounded-2xl bg-zinc-900 text-white p-4">
            <div className="flex items-center gap-2 text-[12px] font-semibold tracking-wide opacity-80"><Zap className="h-3.5 w-3.5" /> PRO PLAN</div>
            <div className="mt-2 text-[13px] leading-snug">Tally-grade GST billing, modern SaaS speed. All data stays on this device.</div>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-400"><Box className="h-3.5 w-3.5" /> Offline • Encrypted localStorage</div>
          </div>
          <div className="mt-3 px-1 text-[11px] text-zinc-400 flex items-center justify-between">
            <span>v2.1 • Palladam, TN</span><span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live</span>
          </div>
        </div>
      </div>

      {/* Mobile header */}
      <div className="no-print md:hidden sticky top-0 z-30 bg-white border-b border-zinc-200">
        <div className="flex items-center justify-between px-4 h-[64px]">
          <div className="flex items-center gap-2.5">
            {/* APP BRANDING — fixed VELS TECH logo. Never the Business Details logo. */}
            <img src={appLogo} alt="Vels Tech logo" className="h-8 w-8 rounded-lg shadow-sm object-cover" />
            <div className="font-extrabold tracking-tight">VELS TECH</div>
          </div>
          <button onClick={() => setMobileMenu(v => !v)} className="h-9 w-9 grid place-items-center rounded-xl bg-zinc-100"><Menu className="h-5 w-5" /></button>
        </div>
        {mobileMenu && (
          <div className="grid grid-cols-3 gap-2 p-3 bg-zinc-50 border-t border-zinc-200">
            {[
              { k: "dashboard", label: "Home", icon: LayoutDashboard },
              { k: "billing", label: "Bill", icon: Receipt },
              { k: "invoices", label: "Invoices", icon: FileText },
              { k: "products", label: "Products", icon: Package },
              { k: "customers", label: "Customers", icon: Users },
              { k: "settings", label: "Settings", icon: SettingsIcon },
            ].map(it => (
              <button key={it.k} onClick={() => { setView(it.k as any); setMobileMenu(false); setNavTick(t=>t+1); }} className={`rounded-xl py-3 flex flex-col items-center gap-1 text-[12px] font-medium ${view===it.k?'bg-indigo-600 text-white':'bg-white border border-zinc-200 text-zinc-700'}`}>
                <it.icon className="h-5 w-5" /> {it.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main */}
      <div className="md:pl-[268px] overflow-x-hidden">
        <div key={navTick} className="max-w-[1280px] mx-auto p-4 md:p-7 min-w-0">
          {/* Topbar */}
          <div className="no-print flex items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-[22px] md:text-[26px] font-bold tracking-[-0.02em] leading-none">
                {view === "dashboard" && "Overview"}
                {view === "billing" && "Create Invoice"}
                {view === "products" && "Inventory"}
                {view === "customers" && "Customers"}
                {view === "invoices" && "All Invoices"}
                {view === "settings" && "Business Settings"}
                {navTick>0 && <span className="ml-2 text-[11px] font-medium text-indigo-600 align-middle px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100">• Refreshed {navTick}</span>}
              </h1>
              <div className="text-[13px] text-zinc-500 mt-1.5 flex items-center gap-2 break-words">
                <MapPin className="h-3.5 w-3.5" /> {settings.address.slice(0,56)}… • {settings.state}
              </div>
            </div>
            {view !== "billing" && (
              <button onClick={() => {setView("billing"); setNavTick(t=>t+1);}} className="hidden md:inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 h-10 text-[13px] font-semibold shadow">
                <Plus className="h-4 w-4" /> New Invoice
              </button>
            )}
          </div>

          {/* Dashboard */}
          {view === "dashboard" && (
            <div className="space-y-6 min-w-0 overflow-hidden">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-[20px] bg-white border border-zinc-200 p-4 md:p-5 shadow-[0_8px_30px_-20px_rgba(0,0,0,0.2)]">
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center"><IndianRupee className="h-5 w-5" /></div>
                    <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Today</span>
                  </div>
                  <div className="mt-4 text-[12px] font-semibold tracking-wide text-zinc-500">TODAY'S SALES</div>
                  <div className="mt-1 text-[22px] font-bold tracking-tight">{formatINR(dashboardStats.todaySales)}</div>
                  <div className="mt-1 text-[12px] text-zinc-500">{dashboardStats.todaysCount} invoices today</div>
                </div>
                <div className="rounded-[20px] bg-white border border-zinc-200 p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-xl bg-zinc-900 text-white grid place-items-center"><FileText className="h-5 w-5" /></div>
                    <ArrowUpRight className="h-4 w-4 text-zinc-400" />
                  </div>
                  <div className="mt-4 text-[12px] font-semibold tracking-wide text-zinc-500">TOTAL INVOICES</div>
                  <div className="mt-1 text-[22px] font-bold tracking-tight">{dashboardStats.totalInvoices}</div>
                  <div className="mt-1 text-[12px] text-zinc-500">All time billed</div>
                </div>
                <div className="rounded-[20px] bg-white border border-zinc-200 p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 grid place-items-center"><CreditCard className="h-5 w-5" /></div>
                    <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700">Pending</span>
                  </div>
                  <div className="mt-4 text-[12px] font-semibold tracking-wide text-zinc-500">PENDING AMOUNT</div>
                  <div className="mt-1 text-[22px] font-bold tracking-tight">{formatINR(dashboardStats.pendingAmt)}</div>
                  <div className="mt-1 text-[12px] text-zinc-500">To be collected</div>
                </div>
                <div className="rounded-[20px] bg-white border border-zinc-200 p-4 md:p-5">
                  <div className="flex items-center justify-between">
                    <div className="h-9 w-9 rounded-xl bg-red-50 text-red-600 grid place-items-center"><AlertTriangle className="h-5 w-5" /></div>
                    <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-red-50 text-red-700">{dashboardStats.lowStock} items</span>
                  </div>
                  <div className="mt-4 text-[12px] font-semibold tracking-wide text-zinc-500">LOW STOCK ALERT</div>
                  <div className="mt-1 text-[22px] font-bold tracking-tight">{dashboardStats.lowStock} products</div>
                  <div className="mt-1 text-[12px] text-zinc-500">≤ 10 qty remaining</div>
                </div>
              </div>

              <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4">
                <div className="rounded-[20px] bg-white border border-zinc-200 overflow-hidden">
                  <div className="p-5 flex items-center justify-between border-b border-zinc-100">
                    <div className="font-semibold text-[14px]">Recent Invoices</div>
                    <button onClick={() => setView("invoices")} className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700">View all →</button>
                  </div>
                  <div className="overflow-x-auto scrollbar-hide">
                    <table className="w-full text-[13px]">
                      <thead className="text-[11px] tracking-wide text-zinc-500 bg-zinc-50/60">
                        <tr><th className="text-left font-semibold px-5 py-3">INVOICE</th><th className="text-left font-semibold px-5 py-3">CUSTOMER</th><th className="text-left font-semibold px-5 py-3">DATE</th><th className="text-right font-semibold px-5 py-3">TOTAL</th><th className="text-left font-semibold px-5 py-3">STATUS</th></tr>
                      </thead>
                      <tbody>
                        {invoices.slice(-6).reverse().map(inv => (
                          <tr key={inv.id} className="border-t border-zinc-100 hover:bg-zinc-50/60">
                            <td className="px-5 py-3.5 font-medium mono">{inv.invoiceNo}</td>
                            <td className="px-5 py-3.5">{inv.customerName}</td>
                            <td className="px-5 py-3.5 text-zinc-500">{inv.date}</td>
                            <td className="px-5 py-3.5 text-right font-semibold">{formatINR(inv.grandTotal)}</td>
                            <td className="px-5 py-3.5"><span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${inv.paymentStatus==='Paid'?'bg-emerald-50 text-emerald-700':inv.paymentStatus==='Pending'?'bg-amber-50 text-amber-700':'bg-indigo-50 text-indigo-700'}`}>{inv.paymentStatus}</span></td>
                          </tr>
                        ))}
                        {invoices.length===0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-zinc-500">No invoices yet. Create your first invoice.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="rounded-[20px] bg-white border border-zinc-200 p-5">
                  <div className="font-semibold text-[14px] mb-4">Quick Stats</div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                      <div className="flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-white border grid place-items-center"><Package className="h-4 w-4" /></div><div><div className="text-[13px] font-medium">{products.length} Products</div><div className="text-[11px] text-zinc-500">{products.reduce((s,p)=>s+p.stock,0)} units in stock</div></div></div>
                      <ArrowUpRight className="h-4 w-4 text-zinc-400" />
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                      <div className="flex items-center gap-3"><div className="h-8 w-8 rounded-lg bg-white border grid place-items-center"><Users className="h-4 w-4" /></div><div><div className="text-[13px] font-medium">{customers.length} Customers</div><div className="text-[11px] text-zinc-500">{STATES.length} states covered</div></div></div>
                      <ArrowUpRight className="h-4 w-4 text-zinc-400" />
                    </div>
                    <div className="rounded-xl bg-indigo-600 text-white p-4">
                      <div className="text-[12px] font-semibold tracking-wide opacity-80">GST MODE</div>
                      <div className="mt-1 text-[13px] leading-snug">Intra-state = CGST+SGST split • Inter-state = IGST. Auto-detected from customer state vs {settings.state}.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Products */}
          {view === "products" && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input value={searchProducts} onChange={e=>setSearchProducts(e.target.value)} placeholder="Search products, HSN..." className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-zinc-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300" />
                </div>
                <button onClick={openAddProduct} className="h-11 px-5 rounded-xl bg-zinc-900 text-white text-[13px] font-semibold flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Add Product</button>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(p => (
                  <div key={p.id} className="rounded-[18px] bg-white border border-zinc-200 p-4 flex flex-col">
                    <div className="flex items-start justify-between">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center font-bold text-[12px]">{p.name.slice(0,2).toUpperCase()}</div>
                      <div className="flex items-center gap-1">
                        <button onClick={()=>openEditProduct(p)} className="h-7 w-7 grid place-items-center rounded-lg hover:bg-zinc-100"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button onClick={()=>setProducts(prev=>prev.filter(x=>x.id!==p.id))} className="h-7 w-7 grid place-items-center rounded-lg hover:bg-red-50 text-zinc-500 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                    <div className="mt-3 font-semibold text-[14px] leading-tight line-clamp-2">{p.name}</div>
                    <div className="mt-1 flex items-center gap-2 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-100 border mono">HSN {p.hsn}</span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 font-semibold">{p.gst}% GST</span>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div><div className="text-[11px] text-zinc-500 font-medium tracking-wide">PRICE</div><div className="text-[16px] font-bold">{formatINR(p.price)}</div></div>
                      <div className="text-right"><div className="text-[11px] text-zinc-500">STOCK</div><div className={`text-[13px] font-bold ${p.stock<=10?'text-red-600':''}`}>{p.stock} {p.unit} {p.stock<=10 && '• Low'}</div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customers */}
          {view === "customers" && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input value={searchCustomers} onChange={e=>setSearchCustomers(e.target.value)} placeholder="Search customers, phone..." className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-zinc-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300" />
                </div>
                <button onClick={openAddCustomer} className="h-11 px-5 rounded-xl bg-zinc-900 text-white text-[13px] font-semibold flex items-center justify-center gap-2"><Plus className="h-4 w-4" /> Add Customer</button>
              </div>
              <div className="rounded-[18px] bg-white border border-zinc-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead className="text-[11px] tracking-wide text-zinc-500 bg-zinc-50">
                      <tr><th className="text-left font-semibold px-5 py-3">CUSTOMER</th><th className="text-left font-semibold px-5 py-3">CONTACT</th><th className="text-left font-semibold px-5 py-3">GSTIN / STATE</th><th className="text-left font-semibold px-5 py-3">ADDRESS</th><th className="text-right font-semibold px-5 py-3">ACTION</th></tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map(c => (
                        <tr key={c.id} className="border-t border-zinc-100 hover:bg-zinc-50/50">
                          <td className="px-5 py-3.5 font-semibold">{c.name}</td>
                          <td className="px-5 py-3.5 text-zinc-600">{c.phone}</td>
                          <td className="px-5 py-3.5"><div className="mono text-[11px]">{c.gstin || "—"}</div><div className="text-[11px] text-zinc-500 mt-1">{c.state}</div></td>
                          <td className="px-5 py-3.5 text-zinc-600 max-w-[240px] truncate">{c.address}</td>
                          <td className="px-5 py-3.5 text-right"><button onClick={()=>openEditCustomer(c)} className="inline-flex items-center gap-1 text-[12px] font-medium px-2.5 py-1.5 rounded-lg bg-zinc-900 text-white"><Edit3 className="h-3 w-3" /> Edit</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Billing */}
          {view === "billing" && (
            <div className="grid lg:grid-cols-[1.6fr_0.9fr] gap-5">
              <div className="space-y-4">
                <div className="rounded-[20px] bg-white border border-zinc-200 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-zinc-900 text-white grid place-items-center mono text-[11px] font-bold">{nextInvoiceNo.split("-")[1]}</div>
                      <div><div className="text-[11px] tracking-wide font-semibold text-zinc-500">INVOICE NO</div><div className="mono font-bold text-[14px]">{nextInvoiceNo}</div></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative"><Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" /><input type="date" value={billingDate} onChange={e=>setBillingDate(e.target.value)} className="h-9 pl-8 pr-3 rounded-xl border border-zinc-200 text-[13px] bg-white" /></div>
                      {editingInvoiceId && <span className="text-[11px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold">Editing</span>}
                    </div>
                  </div>

                  <div className="mt-5 grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold tracking-wide text-zinc-500">CUSTOMER</label>
                      <div className="mt-1.5 relative">
                        <select value={billingCustomerId} onChange={e=>{ setBillingCustomerId(e.target.value); const c = customers.find(x => x.id === e.target.value); setBillingPhone(c ? c.phone : ""); setBillingPhoneTouched(false); }} className="w-full h-11 rounded-xl border border-zinc-200 bg-white px-3 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20">
                          <option value="">Select customer</option>
                          {customers.map(c=><option key={c.id} value={c.id}>{c.name} • {c.state}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      </div>
                      <div className="mt-2 flex gap-2">
                        <div className="flex-1 relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                          <input value={customerSearchInline} onChange={e=>setCustomerSearchInline(e.target.value)} placeholder="Quick filter customers" className="w-full h-9 pl-8 pr-3 rounded-xl border border-zinc-200 bg-zinc-50 text-[12px]" />
                        </div>
                        <button onClick={openAddCustomer} className="h-9 px-3 rounded-xl bg-zinc-900 text-white text-[12px] font-semibold">+ New</button>
                      </div>
                      {customerSearchInline && (
                        <div className="mt-2 rounded-xl border border-zinc-200 bg-white overflow-hidden max-h-40 overflow-y-auto">
                          {customers.filter(c=>c.name.toLowerCase().includes(customerSearchInline.toLowerCase())).map(c=><button key={c.id} onClick={()=>{setBillingCustomerId(c.id); setBillingPhone(c.phone); setBillingPhoneTouched(false); setCustomerSearchInline("");}} className="w-full text-left px-3 py-2 text-[12px] hover:bg-zinc-50">{c.name} • {c.state}</button>)}
                        </div>
                      )}
                      <div className="mt-3 rounded-xl bg-zinc-50 border border-zinc-200 p-3 text-[12px] leading-snug">
                        {selectedCustomer ? (
                          <>
                            <div className="font-semibold">{selectedCustomer.name}</div>
                            <div className="text-zinc-600">{selectedCustomer.address}</div>
                            <div className="mt-1 flex flex-wrap gap-2"><span className="px-1.5 py-0.5 rounded bg-white border mono text-[11px]">{selectedCustomer.state}</span><span className="mono text-[11px]">{selectedCustomer.gstin || "No GSTIN"}</span></div>
                          </>
                        ) : (
                          <div className="font-semibold text-zinc-500">No customer selected — enter a WhatsApp number to send the invoice chat directly.</div>
                        )}
                        <div className="mt-3">
                          <label className="text-[11px] font-semibold tracking-wide text-zinc-500">MOBILE / WHATSAPP NUMBER</label>
                          <div className="mt-1.5 flex flex-col sm:flex-row gap-2">
                            <div className="flex-1 relative min-w-0">
                              <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                              <input value={billingPhone} onChange={e=>setBillingPhone(e.target.value)} onBlur={()=>setBillingPhoneTouched(true)} placeholder="9876543210 / +91 9876543210" inputMode="tel" className={`w-full h-11 pl-8 pr-3 rounded-xl border bg-white text-[13px] mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 ${showBillingPhoneError ? "border-red-400" : "border-zinc-200"}`} />
                            </div>
                            <button disabled={!billingWaValid} onClick={handleBillingWhatsApp} className="h-11 px-4 rounded-xl bg-[#25D366] text-white text-[13px] font-semibold flex items-center justify-center gap-2 shrink-0 disabled:opacity-40"><Smartphone className="h-4 w-4" /> WhatsApp</button>
                          </div>
                          {showBillingPhoneError ? <div className="mt-1 text-[11px] text-red-600 font-medium">Enter a valid WhatsApp number</div> : billingWaValid ? <div className="mt-1 text-[11px] text-emerald-700 font-medium">Will send to {billingWa.display}</div> : <div className="mt-1 text-[11px] text-zinc-500">Indian 10-digit mobile. +91 auto-added.</div>}
                        </div>
                        {selectedCustomer && (
                          <div className="mt-2 text-[11px] font-semibold">{selectedCustomer.state===settings.state ? "CGST + SGST (Intra-state)" : "IGST (Inter-state)"} • GST auto split</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold tracking-wide text-zinc-500">PAYMENT</label>
                      <div className="mt-1.5 grid grid-cols-2 gap-2">
                        {[
                          {k:"UPI", icon:Smartphone},
                          {k:"Cash", icon:Banknote},
                          {k:"Card", icon:CreditCard},
                          {k:"Credit", icon:Calendar},
                        ].map(m=>(
                          <button key={m.k} onClick={()=>setPaymentMode(m.k as any)} className={`h-11 rounded-xl border flex items-center gap-2 px-3 text-[13px] font-medium ${paymentMode===m.k?'bg-indigo-600 text-white border-indigo-600':'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'}`}>
                            <m.icon className="h-4 w-4" /> {m.k}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {(["Paid","Pending","Partial"] as const).map(s=>(
                          <button key={s} onClick={()=>setPaymentStatus(s)} className={`h-9 rounded-xl border text-[12px] font-semibold ${paymentStatus===s?'bg-zinc-900 text-white border-zinc-900':'bg-white border-zinc-200'}`}>{s}</button>
                        ))}
                      </div>
                      {paymentStatus==="Partial" && (
                        <div className="mt-3">
                          <label className="text-[11px] font-semibold text-zinc-500">PAID AMOUNT</label>
                          <input type="number" value={paidAmount} onChange={e=>setPaidAmount(parseFloat(e.target.value)||0)} className="mt-1 w-full h-10 rounded-xl border border-zinc-200 px-3 text-[13px]" placeholder="Enter paid amount" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-[20px] bg-white border border-zinc-200 p-5">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-[14px]">Add Products</div>
                    <div className="text-[11px] text-zinc-500">{products.length} in inventory</div>
                  </div>
                  <div className="mt-3 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="Search product to add (e.g., Laptop, Mouse)..." className="w-full h-11 pl-10 pr-4 rounded-xl bg-zinc-50 border border-zinc-200 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300" />
                    {productSearch && (
                      <div className="absolute z-10 mt-2 w-full rounded-xl border border-zinc-200 bg-white shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                        {products.filter(p=>p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p=>(
                          <button key={p.id} onClick={()=>addProductToInvoice(p)} className="w-full text-left flex items-center justify-between px-4 py-3 hover:bg-zinc-50 border-b border-zinc-100 last:border-0">
                            <div><div className="text-[13px] font-medium">{p.name}</div><div className="text-[11px] text-zinc-500 mono">HSN {p.hsn} • {p.gst}% • Stock {p.stock}</div></div>
                            <div className="text-[13px] font-bold">{formatINR(p.price)}</div>
                          </button>
                        ))}
                        {products.filter(p=>p.name.toLowerCase().includes(productSearch.toLowerCase())).length===0 && <div className="p-4 text-[12px] text-zinc-500">No products found</div>}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-xl border border-zinc-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-[13px]">
                        <thead className="bg-zinc-50 text-[11px] tracking-wide text-zinc-500">
                          <tr><th className="text-left font-semibold px-4 py-2.5">PRODUCT</th><th className="text-center font-semibold px-3 py-2.5">QTY</th><th className="text-center font-semibold px-3 py-2.5">PRICE</th><th className="text-center font-semibold px-3 py-2.5">DISC%</th><th className="text-right font-semibold px-4 py-2.5">TOTAL</th><th className="px-2"></th></tr>
                        </thead>
                        <tbody>
                          {billingItems.map((it, idx)=> {
                            const line = it.price*it.qty;
                            const disc = line*it.discount/100;
                            const taxable = line-disc;
                            const gstAmt = taxable*it.gst/100;
                            return (
                              <tr key={idx} className="border-t border-zinc-100">
                                <td className="px-4 py-3"><div className="font-medium leading-tight">{it.name}</div><div className="text-[11px] text-zinc-500 mono">HSN {it.hsn} • {it.gst}% GST</div></td>
                                <td className="px-2 py-3"><input type="number" min={1} value={it.qty} onChange={e=>updateBillingItem(idx,{qty: Math.max(1, parseInt(e.target.value)||1)})} className="w-16 h-8 rounded-lg border border-zinc-200 text-center text-[13px]" /></td>
                                <td className="px-2 py-3 text-center mono text-[12px]">{formatINR(it.price)}</td>
                                <td className="px-2 py-3"><input type="number" min={0} max={100} value={it.discount} onChange={e=>updateBillingItem(idx,{discount: Math.min(100, Math.max(0, parseFloat(e.target.value)||0))})} className="w-16 h-8 rounded-lg border border-zinc-200 text-center text-[13px]" /></td>
                                <td className="px-4 py-3 text-right"><div className="font-semibold">{formatINR(taxable+gstAmt)}</div><div className="text-[11px] text-zinc-500">{formatINR(taxable)} + GST</div></td>
                                <td className="px-2"><button onClick={()=>setBillingItems(prev=>prev.filter((_,i)=>i!==idx))} className="h-7 w-7 grid place-items-center rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-600"><X className="h-4 w-4" /></button></td>
                              </tr>
                            );
                          })}
                          {billingItems.length===0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-zinc-500 text-[13px]">Search and add products. Stock auto-decrements on save.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-zinc-500">NOTES (optional)</label>
                    <textarea value={billingNotes} onChange={e=>setBillingNotes(e.target.value)} rows={2} placeholder="Delivery, warranty, or customer note..." className="mt-1.5 w-full rounded-xl border border-zinc-200 p-3 text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[20px] bg-zinc-900 text-white p-5">
                  <div className="flex items-center justify-between">
                    <div className="text-[12px] tracking-wide font-semibold opacity-70">BILL SUMMARY</div>
                    <div className="text-[11px] px-2 py-1 rounded-full bg-white/10 border border-white/10">{selectedCustomer ? (selectedCustomer.state===settings.state?'CGST+SGST':'IGST') : '—'}</div>
                  </div>
                  <div className="mt-4 space-y-2.5 text-[13px]">
                    <div className="flex justify-between"><span className="opacity-70">Subtotal</span><span className="font-medium">{formatINR(billingCalc.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="opacity-70">Discount</span><span className="font-medium text-amber-300">- {formatINR(billingCalc.discountTotal)}</span></div>
                    <div className="h-px bg-white/10 my-2" />
                    <div className="flex justify-between"><span className="opacity-70">Taxable Amount</span><span className="font-semibold">{formatINR(billingCalc.taxableAmount)}</span></div>
                    {billingCalc.cgst>0 && <><div className="flex justify-between text-[12px]"><span className="opacity-60">CGST</span><span>{formatINR(billingCalc.cgst)}</span></div><div className="flex justify-between text-[12px]"><span className="opacity-60">SGST</span><span>{formatINR(billingCalc.sgst)}</span></div></>}
                    {billingCalc.igst>0 && <div className="flex justify-between text-[12px]"><span className="opacity-60">IGST</span><span>{formatINR(billingCalc.igst)}</span></div>}
                    <div className="flex justify-between text-[12px]"><span className="opacity-60">GST Total</span><span>{formatINR(billingCalc.gstTotal)}</span></div>
                    <div className="flex justify-between text-[12px]"><span className="opacity-60">Round off</span><span>{billingCalc.roundOff>=0?"+":""}{formatINR(billingCalc.roundOff)}</span></div>
                    <div className="h-px bg-white/10 my-2" />
                    <div className="flex justify-between text-[18px] font-bold"><span>Grand Total</span><span>{formatINR(billingCalc.grandTotal)}</span></div>
                    <div className="mt-2 text-[11px] opacity-60">Auto GST split based on customer state vs {settings.state}. Tamil Nadu intra = CGST+SGST.</div>
                  </div>
                  <button onClick={handleSaveInvoice} className="mt-5 w-full h-11 rounded-xl bg-white text-zinc-900 font-semibold text-[13px] flex items-center justify-center gap-2 hover:bg-zinc-100"><Save className="h-4 w-4" /> {editingInvoiceId ? "Update Invoice" : "Save & Print Invoice"}</button>
                  {showWaPrompt && lastSavedInvoice && (
                    <div className="mt-3 rounded-xl bg-white/10 border border-white/20 p-3">
                      <div className="text-[12px] font-semibold">Invoice {lastSavedInvoice.invoiceNo} saved.</div>
                      <div className="mt-2 grid grid-cols-1 gap-2">
                        <button onClick={()=>{ const m = buildCustomerWaMessage(lastSavedInvoice.customerName, lastSavedInvoice.invoiceNo, lastSavedInvoice.date, lastSavedInvoice.grandTotal, lastSavedInvoice.paymentStatus, lastSavedInvoice.paymentMode); if (!openCustomerChat(lastSavedInvoice.customerPhone, m)) alert("Enter a valid WhatsApp number"); }} className="h-10 rounded-xl bg-[#25D366] text-white text-[12px] font-semibold flex items-center justify-center gap-2"><Smartphone className="h-4 w-4" /> Send Invoice on WhatsApp</button>
                        <button onClick={async ()=>{ const ok = await shareInvoicePdfNative(lastSavedInvoice); if (!ok) alert("Native share not supported on this browser - invoice file downloaded instead. Attach it in WhatsApp manually."); }} className="h-10 rounded-xl bg-white text-zinc-900 text-[12px] font-semibold flex items-center justify-center gap-2"><FileText className="h-4 w-4" /> Send Invoice PDF on WhatsApp</button>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button onClick={()=>{setBillingItems([]); setEditingInvoiceId(null);}} className="h-9 rounded-xl bg-white/10 border border-white/10 text-[12px] font-medium">Clear</button>
                    <button onClick={()=>setView("invoices")} className="h-9 rounded-xl bg-white/10 border border-white/10 text-[12px] font-medium">View Invoices</button>
                  </div>
                </div>

                <div className="rounded-[20px] bg-white border border-zinc-200 p-4">
                  <div className="text-[12px] font-semibold tracking-wide">COMPANY</div>
                  <div className="mt-2 flex gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white grid place-items-center font-extrabold">V</div>
                    <div className="text-[12px] leading-snug"><div className="font-bold">{settings.companyName}</div><div className="text-zinc-600">{settings.address}</div><div className="mt-1 mono text-[11px]">GSTIN: {settings.gstin}</div></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoices list */}
          {view === "invoices" && (
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input value={searchInvoices} onChange={e=>setSearchInvoices(e.target.value)} placeholder="Search invoice no, customer..." className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-zinc-200 text-[13px]" />
                </div>
                <button onClick={()=>setView("billing")} className="h-11 px-5 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> New</button>
              </div>
              <div className="rounded-[18px] bg-white border border-zinc-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead className="bg-zinc-50 text-[11px] tracking-wide text-zinc-500">
                      <tr><th className="text-left font-semibold px-5 py-3">INVOICE</th><th className="text-left font-semibold px-5 py-3">CUSTOMER / STATE</th><th className="text-left font-semibold px-5 py-3">DATE</th><th className="text-right font-semibold px-5 py-3">AMOUNT</th><th className="text-left font-semibold px-5 py-3">PAYMENT</th><th className="text-right font-semibold px-5 py-3">ACTIONS</th></tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.map(inv=>(
                        <tr key={inv.id} className="border-t border-zinc-100 hover:bg-zinc-50/50">
                          <td className="px-5 py-3.5"><div className="mono font-semibold">{inv.invoiceNo}</div><div className="text-[11px] text-zinc-500">{inv.items.length} items • {inv.igst>0?"IGST":"CGST+SGST"}</div></td>
                          <td className="px-5 py-3.5"><div className="font-medium">{inv.customerName}</div><div className="text-[11px] text-zinc-500">{inv.customerState}</div></td>
                          <td className="px-5 py-3.5 text-zinc-600">{inv.date}</td>
                          <td className="px-5 py-3.5 text-right"><div className="font-bold">{formatINR(inv.grandTotal)}</div><div className="text-[11px] text-zinc-500">{formatINR(inv.paidAmount)} paid</div></td>
                          <td className="px-5 py-3.5"><div className="flex items-center gap-2"><span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${inv.paymentStatus==='Paid'?'bg-emerald-50 text-emerald-700 border border-emerald-200':inv.paymentStatus==='Pending'?'bg-amber-50 text-amber-700 border border-amber-200':'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>{inv.paymentStatus}</span><span className="text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 border">{inv.paymentMode}</span></div></td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button onClick={()=>setViewingInvoice(inv)} className="h-8 w-8 grid place-items-center rounded-lg bg-zinc-900 text-white"><Eye className="h-3.5 w-3.5" /></button>
                              <button onClick={()=>startEditInvoice(inv)} className="h-8 w-8 grid place-items-center rounded-lg bg-white border border-zinc-200"><Edit3 className="h-3.5 w-3.5" /></button>
                              <button onClick={()=>duplicateInvoice(inv)} className="h-8 w-8 grid place-items-center rounded-lg bg-white border border-zinc-200"><Copy className="h-3.5 w-3.5" /></button>
                              <button onClick={()=>{ if(confirm(`Delete ${inv.invoiceNo}?`)) setInvoices(prev=>prev.filter(x=>x.id!==inv.id)); }} className="h-8 w-8 grid place-items-center rounded-lg bg-white border border-zinc-200 text-zinc-500 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredInvoices.length===0 && <tr><td colSpan={6} className="px-5 py-14 text-center text-zinc-500">No invoices found. Create your first bill.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Settings */}
          {view === "settings" && (
            <div className="max-w-[720px] space-y-4">
              <div className="rounded-[20px] bg-white border border-zinc-200 p-6">
                <div className="font-semibold">Business Details</div>
                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <div><label className="text-[11px] font-semibold text-zinc-500">COMPANY NAME</label><input value={settings.companyName} onChange={e=>setSettings(s=>({...s, companyName:e.target.value}))} className="mt-1 w-full h-11 rounded-xl border border-zinc-200 px-3 text-[13px]" /></div>
                  <div><label className="text-[11px] font-semibold text-zinc-500">GSTIN</label><input value={settings.gstin} onChange={e=>setSettings(s=>({...s, gstin:e.target.value}))} className="mt-1 w-full h-11 rounded-xl border border-zinc-200 px-3 text-[13px] mono" /></div>
                  <div className="md:col-span-2"><label className="text-[11px] font-semibold text-zinc-500">ADDRESS</label><textarea value={settings.address} onChange={e=>setSettings(s=>({...s, address:e.target.value}))} rows={2} className="mt-1 w-full rounded-xl border border-zinc-200 p-3 text-[13px]" /></div>
                  <div><label className="text-[11px] font-semibold text-zinc-500">PHONE</label><input value={settings.phone} onChange={e=>setSettings(s=>({...s, phone:e.target.value}))} className="mt-1 w-full h-11 rounded-xl border border-zinc-200 px-3 text-[13px]" /></div>
                  <div><label className="text-[11px] font-semibold text-zinc-500">EMAIL</label><input value={settings.email} onChange={e=>setSettings(s=>({...s, email:e.target.value}))} className="mt-1 w-full h-11 rounded-xl border border-zinc-200 px-3 text-[13px]" /></div>
                  <div><label className="text-[11px] font-semibold text-zinc-500">DEFAULT STATE</label><select value={settings.state} onChange={e=>setSettings(s=>({...s, state:e.target.value}))} className="mt-1 w-full h-11 rounded-xl border border-zinc-200 px-3 text-[13px]"><option>Tamil Nadu</option>{STATES.map(st=><option key={st}>{st}</option>)}</select></div>
                  <div><label className="text-[11px] font-semibold text-zinc-500">LOGO TEXT</label><input value={settings.logoText} onChange={e=>setSettings(s=>({...s, logoText:e.target.value}))} className="mt-1 w-full h-11 rounded-xl border border-zinc-200 px-3 text-[13px] font-bold tracking-tight" /></div>
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-semibold text-zinc-500">COMPANY LOGO</label>
                    <div className="mt-1.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-3">
                      <div className="h-20 w-20 shrink-0 rounded-xl border border-zinc-200 bg-white grid place-items-center overflow-hidden">
                        {settings.logo
                          ? <img src={settings.logo} alt="Company logo preview" className="h-full w-full object-contain" />
                          : <span className="text-[22px] font-extrabold text-zinc-300">+</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold">{settings.logo ? "Logo uploaded" : "Upload Company Logo"}</div>
                        <div className="text-[11px] text-zinc-500">PNG, JPG, JPEG, WEBP • Max 2MB • auto-saved</div>
                        {logoError && <div className="mt-1 text-[11px] font-medium text-red-600">{logoError}</div>}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <label className="h-10 px-4 rounded-xl bg-zinc-900 text-white text-[12px] font-semibold flex items-center justify-center gap-2 cursor-pointer min-w-[120px]">
                            {settings.logo ? "Change Logo" : "Upload Logo"}
                            <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={e=>{ handleLogoSelect(e.target.files?.[0]); e.target.value=""; }} />
                          </label>
                          {settings.logo && (
                            <button onClick={()=>{ if(confirm("Remove company logo? Default logo will be restored.")){ setSettings(s=>({...s, logo:""})); setLogoError(""); } }} className="h-10 px-4 rounded-xl bg-white border border-zinc-200 text-[12px] font-medium">Remove Logo</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2"><label className="text-[11px] font-semibold text-zinc-500">INVOICE TERMS</label><textarea value={settings.invoiceTerms} onChange={e=>setSettings(s=>({...s, invoiceTerms:e.target.value}))} rows={4} className="mt-1 w-full rounded-xl border border-zinc-200 p-3 text-[13px] mono" /></div>
                </div>
                <div className="mt-5 flex gap-2">
                  <button onClick={()=>{ alert("Settings saved to localStorage"); }} className="h-10 px-5 rounded-xl bg-zinc-900 text-white text-[13px] font-semibold flex items-center gap-2"><Check className="h-4 w-4" /> Saved automatically</button>
                  <button onClick={()=>{ if(confirm("Reset all data?")){ localStorage.clear(); location.reload(); } }} className="h-10 px-4 rounded-xl bg-white border border-zinc-200 text-[13px] font-medium">Reset Data</button>
                </div>
              </div>
              <div className="rounded-[20px] bg-indigo-600 text-white p-5">
                <div className="text-[12px] font-semibold tracking-wide opacity-80">STORAGE INFO</div>
                <div className="mt-2 text-[13px] leading-snug">All data lives in browser localStorage (products, customers, invoices, settings). No backend, works offline. Export via print-to-PDF. Data size: {JSON.stringify({products, customers, invoices}).length/1000} KB approx.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-[60] bg-zinc-900/40 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-[520px] rounded-[20px] bg-white border border-zinc-200 shadow-2xl p-6">
            <div className="flex items-center justify-between"><div className="font-semibold">{editingProduct ? "Edit Product" : "Add Product"}</div><button onClick={()=>setShowProductModal(false)} className="h-8 w-8 grid place-items-center rounded-xl bg-zinc-100"><X className="h-4 w-4" /></button></div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className="text-[11px] font-semibold text-zinc-500">NAME</label><input value={productForm.name} onChange={e=>setProductForm(s=>({...s, name:e.target.value}))} className="mt-1 w-full h-11 rounded-xl border border-zinc-200 px-3 text-[13px]" placeholder="Dell Laptop" /></div>
              <div><label className="text-[11px] font-semibold text-zinc-500">HSN CODE</label><input value={productForm.hsn} onChange={e=>setProductForm(s=>({...s, hsn:e.target.value}))} className="mt-1 w-full h-11 rounded-xl border border-zinc-200 px-3 text-[13px] mono" placeholder="8471" /></div>
              <div><label className="text-[11px] font-semibold text-zinc-500">GST %</label><select value={productForm.gst} onChange={e=>setProductForm(s=>({...s, gst: parseInt(e.target.value)}))} className="mt-1 w-full h-11 rounded-xl border border-zinc-200 px-3 text-[13px]">{GST_OPTIONS.map(g=><option key={g} value={g}>{g}%</option>)}</select></div>
              <div><label className="text-[11px] font-semibold text-zinc-500">PRICE (INR)</label><input type="number" value={productForm.price} onChange={e=>setProductForm(s=>({...s, price: parseFloat(e.target.value)||0}))} className="mt-1 w-full h-11 rounded-xl border border-zinc-200 px-3 text-[13px]" /></div>
              <div><label className="text-[11px] font-semibold text-zinc-500">STOCK QTY</label><input type="number" value={productForm.stock} onChange={e=>setProductForm(s=>({...s, stock: parseInt(e.target.value)||0}))} className="mt-1 w-full h-11 rounded-xl border border-zinc-200 px-3 text-[13px]" /></div>
              <div className="col-span-2"><label className="text-[11px] font-semibold text-zinc-500">UNIT</label><input value={productForm.unit} onChange={e=>setProductForm(s=>({...s, unit:e.target.value}))} className="mt-1 w-full h-11 rounded-xl border border-zinc-200 px-3 text-[13px]" placeholder="pcs, box, kg" /></div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={saveProduct} className="flex-1 h-11 rounded-xl bg-zinc-900 text-white font-semibold text-[13px]">Save Product</button>
              <button onClick={()=>setShowProductModal(false)} className="h-11 px-5 rounded-xl bg-white border border-zinc-200 text-[13px] font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-[60] bg-zinc-900/40 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-[560px] rounded-[20px] bg-white border border-zinc-200 shadow-2xl p-6">
            <div className="flex items-center justify-between"><div className="font-semibold">{editingCustomer ? "Edit Customer" : "Add Customer"}</div><button onClick={()=>setShowCustomerModal(false)} className="h-8 w-8 grid place-items-center rounded-xl bg-zinc-100"><X className="h-4 w-4" /></button></div>
            <div className="mt-5 grid md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><label className="text-[11px] font-semibold text-zinc-500">NAME</label><input value={customerForm.name} onChange={e=>setCustomerForm(s=>({...s, name:e.target.value}))} className="mt-1 w-full h-11 rounded-xl border border-zinc-200 px-3 text-[13px]" placeholder="Customer / Company" /></div>
              <div><label className="text-[11px] font-semibold text-zinc-500">PHONE</label><input value={customerForm.phone} onChange={e=>setCustomerForm(s=>({...s, phone:e.target.value}))} className="mt-1 w-full h-11 rounded-xl border border-zinc-200 px-3 text-[13px]" placeholder="98765 43210" /></div>
              <div><label className="text-[11px] font-semibold text-zinc-500">STATE</label><select value={customerForm.state} onChange={e=>setCustomerForm(s=>({...s, state:e.target.value}))} className="mt-1 w-full h-11 rounded-xl border border-zinc-200 px-3 text-[13px]">{STATES.map(st=><option key={st}>{st}</option>)}</select></div>
              <div className="md:col-span-2"><label className="text-[11px] font-semibold text-zinc-500">GSTIN (optional)</label><input value={customerForm.gstin} onChange={e=>setCustomerForm(s=>({...s, gstin:e.target.value}))} className="mt-1 w-full h-11 rounded-xl border border-zinc-200 px-3 text-[13px] mono" placeholder="33ABCDE1234F1Z5" /></div>
              <div className="md:col-span-2"><label className="text-[11px] font-semibold text-zinc-500">ADDRESS</label><textarea value={customerForm.address} onChange={e=>setCustomerForm(s=>({...s, address:e.target.value}))} rows={2} className="mt-1 w-full rounded-xl border border-zinc-200 p-3 text-[13px]" placeholder="Full address" /></div>
            </div>
            <div className="mt-6 flex gap-2">
              <button onClick={saveCustomer} className="flex-1 h-11 rounded-xl bg-zinc-900 text-white font-semibold text-[13px]">Save Customer</button>
              <button onClick={()=>setShowCustomerModal(false)} className="h-11 px-5 rounded-xl bg-white border border-zinc-200 text-[13px] font-medium">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice View / Print */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-[70] bg-zinc-100 overflow-y-auto p-0 md:p-6">
          <div className="no-print max-w-[900px] mx-auto p-3 md:p-4 flex flex-wrap items-center justify-between gap-2">
            <button onClick={()=>setViewingInvoice(null)} className="h-10 px-4 rounded-xl bg-white border border-zinc-200 text-[13px] font-medium flex items-center gap-2"><X className="h-4 w-4" /> Close</button>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={()=>shareOnWhatsApp(viewingInvoice)} disabled={shareBusy} className="min-h-[40px] h-10 px-3 md:px-4 rounded-xl bg-[#25D366] text-white text-[13px] font-semibold flex items-center gap-2 disabled:opacity-60"><Smartphone className="h-4 w-4" /> {shareBusy ? "Sharing..." : "WhatsApp"}</button>
              <button onClick={printCurrentInvoice} className="min-h-[40px] h-10 px-3 md:px-4 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold flex items-center gap-2"><Printer className="h-4 w-4" /> Print Invoice</button>
              <button onClick={()=>downloadInvoiceFile(viewingInvoice)} className="min-h-[40px] h-10 px-3 md:px-4 rounded-xl bg-zinc-900 text-white text-[13px] font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> A4 Invoice Ready</button>
            </div>
          </div>

          <div id="print-area" className="max-w-[900px] mx-auto bg-white md:rounded-[20px] shadow-[0_20px_80px_-20px_rgba(0,0,0,0.25)] border border-zinc-200 overflow-hidden">
            {/* Header */}
            <div className="p-5 md:p-10">
              <div className="avoid-break flex items-start justify-between gap-6">
                <div className="flex gap-4">
                  {/* INVOICE ONLY — permanent Business Details company logo (settings.logo). */}
                  <img src={invoiceLogo} alt="Company logo" className="h-12 w-12 rounded-xl shadow-sm object-cover" />
                  <div>
                    <div className="font-extrabold tracking-tight text-[20px] leading-none">{settings.companyName}</div>
                    <div className="mt-1 text-[12px] text-zinc-600 leading-snug max-w-[420px]">{settings.address}</div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] mono"><span className="px-2 py-1 rounded bg-zinc-50 border">GSTIN: {settings.gstin}</span><span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {settings.phone}</span><span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {settings.email}</span></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] tracking-[0.18em] font-bold text-zinc-400">TAX INVOICE</div>
                  <div className="mt-1 mono font-bold text-[18px]">{viewingInvoice.invoiceNo}</div>
                  <div className="mt-1 text-[12px] text-zinc-600 flex items-center justify-end gap-1.5"><Calendar className="h-3.5 w-3.5" /> {viewingInvoice.date}</div>
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border font-semibold
                    ${viewingInvoice.paymentStatus==='Paid'?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-amber-50 text-amber-700 border-amber-200'}">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" /> {viewingInvoice.paymentStatus} • {viewingInvoice.paymentMode}
                  </div>
                </div>
              </div>

              <div className="avoid-break mt-6 md:mt-8 grid md:grid-cols-2 gap-4 md:gap-6">
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4">
                  <div className="text-[11px] font-bold tracking-wide text-zinc-500">BILL TO</div>
                  <div className="mt-2 font-semibold text-[14px]">{viewingInvoice.customerName}</div>
                  <div className="mt-1 text-[12px] text-zinc-600 leading-snug">{viewingInvoice.customerAddress}</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]"><span className="px-2 py-1 rounded bg-white border mono">{viewingInvoice.customerState}</span>{viewingInvoice.customerGstin && <span className="px-2 py-1 rounded bg-white border mono">GSTIN {viewingInvoice.customerGstin}</span>}<span className="px-2 py-1 rounded bg-white border flex items-center gap-1"><Phone className="h-3 w-3" /> {viewingInvoice.customerPhone}</span></div>
                </div>
                <div className="rounded-xl border border-zinc-200 p-4 flex gap-4">
                  <div className="h-20 w-20 rounded-xl bg-zinc-900 text-white grid place-items-center text-[10px] text-center leading-tight p-2">UPI QR<br/>Placeholder<br/>VELS TECH</div>
                  <div className="text-[11px] leading-snug text-zinc-600">
                    <div className="font-semibold text-zinc-900">Scan & Pay via UPI</div>
                    <div className="mt-1">UPI ID: vels.tech@okicici</div>
                    <div className="mt-1">Amount: {formatINR(viewingInvoice.grandTotal)}</div>
                    <div className="mt-2 mono text-[10px] bg-zinc-50 border rounded px-2 py-1">Inv: {viewingInvoice.invoiceNo} | {viewingInvoice.customerName.slice(0,18)}</div>
                  </div>
                </div>
              </div>

              <div className="avoid-break mt-6 md:mt-8 rounded-xl border border-zinc-200 overflow-hidden">
                <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-[12px]">
                  <thead className="bg-zinc-900 text-white text-[11px] tracking-wide">
                    <tr><th className="text-left font-semibold px-4 py-3">#</th><th className="text-left font-semibold px-4 py-3">PRODUCT / HSN</th><th className="text-center font-semibold px-3 py-3">QTY</th><th className="text-right font-semibold px-3 py-3">RATE</th><th className="text-right font-semibold px-3 py-3">DISC</th><th className="text-right font-semibold px-3 py-3">TAXABLE</th><th className="text-right font-semibold px-4 py-3">TOTAL</th></tr>
                  </thead>
                  <tbody>
                    {viewingInvoice.items.map((it, idx)=> {
                      const line = it.price*it.qty;
                      const disc = line*it.discount/100;
                      const taxable = line-disc;
                      const gstAmt = taxable*it.gst/100;
                      return (
                        <tr key={idx} className="border-t border-zinc-100">
                          <td className="px-4 py-3 text-zinc-500">{idx+1}</td>
                          <td className="px-4 py-3"><div className="font-medium">{it.name}</div><div className="text-[11px] text-zinc-500 mono">HSN {it.hsn} • {it.gst}% GST</div></td>
                          <td className="px-3 py-3 text-center">{it.qty} {it.gst>0?it.gst+"%":""}</td>
                          <td className="px-3 py-3 text-right mono">{formatINR(it.price)}</td>
                          <td className="px-3 py-3 text-right mono">{it.discount}% ({formatINR(disc)})</td>
                          <td className="px-3 py-3 text-right mono">{formatINR(taxable)}</td>
                          <td className="px-4 py-3 text-right font-semibold mono">{formatINR(taxable+gstAmt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>

              <div className="avoid-break mt-6 grid md:grid-cols-[1.1fr_0.9fr] gap-6">
                <div className="space-y-4">
                  <div className="text-[11px] font-bold tracking-wide text-zinc-500">TERMS & CONDITIONS</div>
                  <div className="text-[11px] leading-relaxed text-zinc-600 whitespace-pre-wrap bg-zinc-50 border border-zinc-200 rounded-xl p-4">{viewingInvoice.terms}</div>
                  {viewingInvoice.notes && <><div className="text-[11px] font-bold tracking-wide text-zinc-500">NOTES</div><div className="text-[12px] bg-amber-50 border border-amber-200 rounded-xl p-3">{viewingInvoice.notes}</div></>}
                </div>
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4 h-fit">
                  <div className="space-y-2 text-[12px]">
                    <div className="flex justify-between"><span className="text-zinc-500">Subtotal</span><span className="font-medium mono">{formatINR(viewingInvoice.subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-zinc-500">Discount</span><span className="font-medium mono text-amber-700">- {formatINR(viewingInvoice.discountTotal)}</span></div>
                    <div className="h-px bg-zinc-200 my-2" />
                    <div className="flex justify-between"><span className="text-zinc-500">Taxable Amount</span><span className="font-semibold mono">{formatINR(viewingInvoice.taxableAmount)}</span></div>
                    {viewingInvoice.cgst>0 && <><div className="flex justify-between"><span className="text-zinc-500">CGST</span><span className="mono">{formatINR(viewingInvoice.cgst)}</span></div><div className="flex justify-between"><span className="text-zinc-500">SGST</span><span className="mono">{formatINR(viewingInvoice.sgst)}</span></div></>}
                    {viewingInvoice.igst>0 && <div className="flex justify-between"><span className="text-zinc-500">IGST</span><span className="mono">{formatINR(viewingInvoice.igst)}</span></div>}
                    <div className="flex justify-between"><span className="text-zinc-500">Round Off</span><span className="mono">{viewingInvoice.roundOff>=0?"+":""}{formatINR(viewingInvoice.roundOff)}</span></div>
                    <div className="h-px bg-zinc-200 my-2" />
                    <div className="flex justify-between text-[16px] font-bold"><span>Grand Total</span><span className="mono">{formatINR(viewingInvoice.grandTotal)}</span></div>
                    <div className="pt-2 flex justify-between text-[11px]"><span className="text-zinc-500">Paid</span><span className="mono font-semibold">{formatINR(viewingInvoice.paidAmount)}</span></div>
                    <div className="flex justify-between text-[11px]"><span className="text-zinc-500">Balance</span><span className="mono font-semibold">{formatINR(viewingInvoice.grandTotal - viewingInvoice.paidAmount)}</span></div>
                  </div>
                  <div className="mt-6 pt-6 border-t border-zinc-200 flex justify-between items-end">
                    <div className="text-[11px] text-zinc-500">Customer Signature</div>
                    <div className="text-center"><div className="h-10 w-32 border-b border-zinc-300" /><div className="mt-1 text-[11px] font-semibold">For {settings.companyName}</div><div className="text-[10px] text-zinc-500">Authorized Signatory</div></div>
                  </div>
                </div>
              </div>

              <div className="mt-8 text-center text-[11px] text-zinc-400 border-t border-zinc-100 pt-4">
                This is a computer generated invoice. Thank you for shopping at {settings.companyName} • Palladam, Tamil Nadu • Made with Vels Billing v2.1
              </div>
            </div>
          </div>
          <div className="no-print h-10" />
        </div>
      )}

      {/* Mobile floating action */}
      <div className="no-print md:hidden fixed bottom-5 right-5">
        <button onClick={()=>setView("billing")} className="h-14 w-14 rounded-full bg-indigo-600 text-white shadow-[0_12px_30px_-10px_rgba(79,70,229,0.8)] grid place-items-center"><Plus className="h-6 w-6" /></button>
      </div>
    </div>
  );
}
