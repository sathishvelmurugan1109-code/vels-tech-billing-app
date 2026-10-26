# VELS TECH Billing Web App — Complete AI Feature Audit & Technical Inventory

**Auditor:** Senior Software Architect & Lead Application Auditor  
**Date of Audit:** October 26, 2026  
**Application Version:** 1.1.0  
**Target Environment:** Progressive Web App (PWA) / Single Page Application (SPA)  
**Primary Stack:** React 18, TypeScript 5, Vite 5, Tailwind CSS 3.4, Recharts 2.15, Lucide React, Service Worker Cache API, Web Storage API (LocalStorage).  
**Repository Working Directory:** `c:\Users\DELL\Desktop\vels-tech-webapp-pwa`

---

## Executive Summary

VELS TECH Billing Web App is an offline-first, client-side Progressive Web Application (PWA) built specifically for retail and wholesale billing, GST invoicing, inventory management, customer and supplier ledgers, and expense tracking. 

The application architecture is bifurcated into two main subsystems:
1. **The Client Billing App (`/` root route):** A zero-dependency, 100% offline-capable single-tenant billing client executing entirely inside the browser runtime. All data structures are persisted in browser `localStorage` using a centralized calculation and transactional storage engine. There is no remote backend, cloud database, user authentication barrier, or multi-tenant switching in the billing app itself.
2. **The Master Admin Portal (`/master-admin` route):** A separate dark-themed administrative dashboard intended for SaaS-level monitoring of multiple business subscribers. Unlike the billing client, this module communicates with an external HTTP REST API (`/api/auth/login`, `/api/stats`, `/api/businesses`), which is not bundled in this frontend repository.

The calculation engine located in `src/services/` represents an exceptionally robust, production-grade business math stack. All financial calculations (GST intra/inter-state split, line discounts, round-offs, stock mutations, customer outstandings, supplier running ledgers, and profit metrics) are centralized, preventing floating-point rounding drift through integer-paise math. The test suite contains 127 automated unit tests across 35 test suites, all passing with 100% success.

---

# Part A: Complete Feature Inventory by Category

---

### 1. Dashboard and Analytics

#### 1.1 Headline KPI Cards
- **Description:** Real-time business summary metrics including Today's Sales, Pending Invoices Count & Amount, Total Customer Receivables, Total Units in Stock, Low Stock Alerts, Out of Stock Alerts, Operating Expenses, and Gross/Net Profit.
- **Status:** **Implemented**
- **Relevant Source Files:**
  - UI: [`src/pages/DashboardPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/DashboardPage.tsx#L87-L320)
  - Business Engine: [`src/services/reportService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/reportService.ts#L1059-L1125), [`src/services/profitService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/profitService.ts), [`src/services/expenseService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/expenseService.ts)
- **Backend/API/Database Dependency:** Client `localStorage` (`vels_invoices`, `vels_products`, `vels_customers`, `vels_payments`, `vels_expenses`). Zero backend dependencies.
- **Test Coverage:** Automated unit tests in `reports-dash.test.ts`, `profit.test.ts`.
- **Known Bugs or Limitations:** Profit calculation accurately flags products lacking cost price (`hasCost: false`); when cost is absent, profit reports an honest zero or dash rather than fabricated margins.

#### 1.2 Chronological Sales Trend Chart
- **Description:** Recharts 7-day chronological bar/line visualization showing daily gross sales in rupees.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/pages/DashboardPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/DashboardPage.tsx#L171-L194)
- **Backend/API/Database Dependency:** None (dynamically aggregated from live `invoices` state).
- **Test Coverage:** Visual component; underlying range aggregation tested in `reports-dash.test.ts`.
- **Known Bugs or Limitations:** Defaults to last 7 calendar days; on narrow mobile screens (320px-375px), SVG chart width causes horizontal page scroll if not wrapped in touch-scrolling containers.

#### 1.3 Payment Methods Breakdown Donut/Pie Chart
- **Description:** Interactive pie chart breaking down revenue collected across payment modes: UPI, Cash, Card, and Credit.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/pages/DashboardPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/DashboardPage.tsx#L195-L206), [`src/services/reportService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/reportService.ts#L344)
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** `report.test.ts`.
- **Known Bugs or Limitations:** None. Excludes cancelled invoices.

#### 1.4 Top Selling Products & Customers Widgets
- **Description:** Lists top 5 revenue-generating products and top 5 lifetime spending customer accounts with quick links.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/pages/DashboardPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/DashboardPage.tsx#L126-L153)
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** `reports-lists.test.ts`.
- **Known Bugs or Limitations:** None.

#### 1.5 Date Range Preset Filtering
- **Description:** Global dashboard date range filter supporting: Today, Yesterday, This Week, This Month, Last Month, This Year, and Custom Date Range.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/pages/DashboardPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/DashboardPage.tsx#L83-L93), [`src/services/dateService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/dateService.ts#L101-L169)
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** `date.test.ts`.
- **Known Bugs or Limitations:** Handled completely in local browser calendar time; midnight rollover bugs are guarded against.

---

### 2. Authentication and User Management

#### 2.1 Client Billing App Authentication
- **Description:** User login, registration, password reset, and session management for the billing web app.
- **Status:** **Missing**
- **Relevant Source Files:** [`src/App.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx), [`src/main.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/main.tsx)
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** None.
- **Known Bugs or Limitations:** There is zero authentication in the client app. Anyone opening the root URL has immediate, unrestricted access to all financial data, invoices, and settings.

#### 2.2 Role-Based Access Control (RBAC) & Multi-User Staff Accounts
- **Description:** Granular permissions distinguishing between Business Owner, Store Manager, Cashier, and Accountant (e.g., restricting bill cancellation, discount limits, or data wipe).
- **Status:** **Missing**
- **Relevant Source Files:** None.
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** None.
- **Known Bugs or Limitations:** All operators operate as a single super-user with full administrative, deletion, and export rights.

#### 2.3 Master Admin Authentication (`/master-admin`)
- **Description:** Dedicated administrative login screen for platform owner to access SaaS metrics.
- **Status:** **Implemented (Client Connector)** / **Dependent on External API**
- **Relevant Source Files:**
  - Login Component: [`src/master-admin/pages/Login.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/master-admin/pages/Login.tsx)
  - API Client: [`src/master-admin/api.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/master-admin/api.ts#L84-L86)
- **Backend/API/Database Dependency:** External REST API at `http://localhost:5000` or `VITE_MASTER_ADMIN_API_URL` (`POST /api/auth/login`).
- **Test Coverage:** None in repository.
- **Known Bugs or Limitations:** The UI form has hardcoded default login hints: `Default: admin@velstech.in / Admin@123` rendered directly in the markup ([`Login.tsx` line 45](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/master-admin/pages/Login.tsx#L45)). If the external server is down, login fails with network connection error.

---

### 3. Business Profile and Multi-Tenant Support

#### 3.1 Business Profile Configuration
- **Description:** Complete company identity setup: Business Name, Legal Trade Name, GSTIN, Phone, Email, Physical Address, State (selection across 24+ Indian states), Location/City, Invoice Terms & Conditions, and Custom Footer Message.
- **Status:** **Implemented**
- **Relevant Source Files:**
  - Settings UI: [`src/pages/SettingsPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/SettingsPage.tsx#L125-L270)
  - Storage: [`src/services/storageService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/storageService.ts#L22)
  - Model: [`src/types/index.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/types/index.ts#L247-L283)
- **Backend/API/Database Dependency:** `localStorage` (`vels_settings`).
- **Test Coverage:** `storage.test.ts`.
- **Known Bugs or Limitations:** None. Automatically sanitizes and standardizes location identifiers (e.g., Veppur).

#### 3.2 Dual Logo Management System
- **Description:** Strict architectural separation between application branding logo (`appLogo` using [`src/assets/profile-logo.jpeg`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/assets/profile-logo.jpeg)) and customer-facing invoice logo (`invoiceLogo` customizable in Settings with client-side WebP 512px canvas compression).
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/App.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L304-L337), [`src/pages/SettingsPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/SettingsPage.tsx#L75-L100)
- **Backend/API/Database Dependency:** `localStorage` Base64 DataURL storage.
- **Test Coverage:** Validated in test suite.
- **Known Bugs or Limitations:** Large logos stored in Base64 consume a significant portion of the browser's 5MB `localStorage` budget.

#### 3.3 Multi-Tenant / Multi-Branch Switching (Billing App)
- **Description:** Ability for a single user to switch between multiple business entities, branches, or shops inside the billing app.
- **Status:** **Missing**
- **Relevant Source Files:** None.
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** None.
- **Known Bugs or Limitations:** App is strictly single-tenant. Running multiple businesses on the same computer requires using separate browser profiles.

#### 3.4 Multi-Tenant Directory (Master Admin)
- **Description:** Directory view of registered external businesses, showing plan, active status, contact details, and usage metrics.
- **Status:** **Partial** / **External API Dependent**
- **Relevant Source Files:** [`src/master-admin/pages/Members.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/master-admin/pages/Members.tsx), [`src/master-admin/pages/Detail.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/master-admin/pages/Detail.tsx)
- **Backend/API/Database Dependency:** External API (`GET /api/businesses`).
- **Test Coverage:** None in local test suite.
- **Known Bugs or Limitations:** Requires external backend to be running.

---

### 4. POS and Invoice Creation

#### 4.1 Fast POS Billing Screen
- **Description:** High-speed point-of-sale interface featuring real-time product search, customer auto-completion, quick-add frequent product pills, cart editing, live GST calculation, and one-click saving.
- **Status:** **Implemented**
- **Relevant Source Files:**
  - Screen: [`src/pages/BillingPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/BillingPage.tsx)
  - Calculation: [`src/services/invoiceService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/invoiceService.ts#L145-L264)
- **Backend/API/Database Dependency:** `localStorage` (`vels_invoices`, `vels_products`, `vels_customers`).
- **Test Coverage:** `customer-selection.test.ts`, `invoice-engine.test.ts`, `invoice-lines.test.ts`.
- **Known Bugs or Limitations:** None. Customer selection and invoice totals validation enforce canonical non-whitespace customer IDs.

#### 4.2 Auto Sequential Invoice Numbering
- **Description:** Automatically generates the next sequential invoice number based on user-configured prefix (`invoicePrefix`, default `VELS-`) and starting number (`startingInvoiceNo`).
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/pages/BillingPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/BillingPage.tsx#L111-L122)
- **Backend/API/Database Dependency:** Derived from highest existing integer in `vels_invoices`.
- **Test Coverage:** `invoice-engine.test.ts`.
- **Known Bugs or Limitations:** If invoices with non-standard numbering schemes are imported, regex parsing falls back to sequence count.

#### 4.3 Line-Item Discount Engine
- **Description:** Per-row discount support with percentage (%) or fixed cash amount, strictly capped so discount can never exceed row gross value.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/services/invoiceService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/invoiceService.ts#L153-L162)
- **Backend/API/Database Dependency:** Pure calculation engine.
- **Test Coverage:** `invoice-lines.test.ts` (Phase 4 discount engine suite).
- **Known Bugs or Limitations:** None. Negative discounts automatically clamped to zero.

#### 4.4 Invoice Editing & Difference Reconciliation
- **Description:** Re-opening a previously saved invoice for modification. Rather than duplicate deduction, the system computes the exact signed delta (`oldItems - newItems`) and applies only the difference to product stock and customer balance.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/App.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L388-L424), [`src/services/invoiceService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/invoiceService.ts#L455-L506)
- **Backend/API/Database Dependency:** Local state and `vels_invoices`.
- **Test Coverage:** `mutations.test.ts` (Phase 9 edit reconciliation).
- **Known Bugs or Limitations:** None.

#### 4.5 Invoice Cancellation & Stock Restoration
- **Description:** Soft cancellation of invoices with warning dialog, marking invoice as `Cancelled`, restoring all inventory stock, deducting customer receivables, and logging a "Cancelled Invoice" stock adjustment ledger entry.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/App.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L426-L465), [`src/services/invoiceService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/invoiceService.ts#L593-L615)
- **Backend/API/Database Dependency:** Local state.
- **Test Coverage:** `mutations.test.ts`.
- **Known Bugs or Limitations:** Once cancelled, re-cancelling contributes zero additional deltas (idempotent).

#### 4.6 Invoice Duplication
- **Description:** Duplicating an existing invoice to instantly create a new bill for another customer or transaction.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/App.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L467-L470), [`src/pages/InvoicesPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/InvoicesPage.tsx#L27)
- **Backend/API/Database Dependency:** Local state.
- **Test Coverage:** Covered in invoice workflows.
- **Known Bugs or Limitations:** None.

---

### 5. GST and Tax Calculations

#### 5.1 Dynamic Tax Type Resolution (Intra-state vs Inter-state)
- **Description:** Automatically evaluates the business state against the customer state. If equal, computes CGST (50%) + SGST (50%); if different, computes IGST (100%).
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/services/gstService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/gstService.ts#L36-L59)
- **Backend/API/Database Dependency:** None (Pure logic).
- **Test Coverage:** `invoice-lines.test.ts` (Phase 5 GST suite).
- **Known Bugs or Limitations:** None. Case and whitespace normalized. Historic invoices without saved state recover tax type from recorded splits.

#### 5.2 GST-Inclusive vs Exclusive Pricing
- **Description:** Supports items priced with GST included (`taxable = price * 100 / (100 + rate)`) or GST excluded (`taxable = price`).
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/services/gstService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/gstService.ts#L106-L139), [`src/services/invoiceService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/invoiceService.ts#L181-L188)
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** `invoice-lines.test.ts`.
- **Known Bugs or Limitations:** None.

#### 5.3 Integer Paise Precision & Round-Off Policy
- **Description:** Working math uses integer cents/paise (`toCents`, `fromCents`) to eliminate binary float drift (`0.1 + 0.2 = 0.30`). Round-off is applied strictly AFTER tax to the grand total to round to the nearest whole rupee, without distorting taxable bases or GST liabilities.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/services/money.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/money.ts#L38-L164)
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** `money.test.ts`.
- **Known Bugs or Limitations:** None.

---

### 6. PDF Generation and Printing

#### 6.1 Native Browser Print / Thermal Print
- **Description:** Uses CSS `@media print` with `@page { size: A4 portrait; margin: 8mm 10mm 10mm 10mm; }` isolating the `#print-area` invoice element and hiding all app headers/navigation.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/App.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L776-L786), [`src/components/InvoiceRenderer.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/components/InvoiceRenderer.tsx)
- **Backend/API/Database Dependency:** Browser Print API (`window.print()`).
- **Test Coverage:** Verified via CDP test automation.
- **Known Bugs or Limitations:** Thermal 80mm/58mm roll printing requires manual print-dialog configuration because `@page` is configured for standard A4 portrait.

#### 6.2 Standalone HTML Document Invoice Download
- **Description:** Generates a completely self-contained, offline HTML invoice with inline styles, embedded base64 logo, dynamic UPI QR image, itemized table, and tax breakdown.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/components/InvoiceRenderer.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/components/InvoiceRenderer.tsx#L98-L298)
- **Backend/API/Database Dependency:** Browser Blob & URL object creation.
- **Test Coverage:** Tested in DOM environment.
- **Known Bugs or Limitations:** None.

#### 6.3 Direct Binary PDF Generation (Client-side jsPDF/pdfmake)
- **Description:** Exporting invoice directly as a binary `.pdf` file without browser print dialog.
- **Status:** **UI-Only / Partial**
- **Relevant Source Files:** [`src/App.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L752-L763), [`src/App.tsx` line 1389](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L1389)
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** None.
- **Known Bugs or Limitations:** The UI button is labeled **"A4 Invoice PDF"**, but clicking it triggers `downloadInvoiceFile()`, which generates and downloads a `.html` file (`${invoiceNo}.html`), not a binary `.pdf`. Users must open the HTML file and select "Print > Save as PDF".

#### 6.4 WhatsApp Direct Invoice Sharing
- **Description:** Formats structured WhatsApp text with customer greetings, invoice number, items, total, balance, and company UPI ID, launching directly into WhatsApp web or mobile app via `https://wa.me/`.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/components/InvoiceRenderer.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/components/InvoiceRenderer.tsx#L22-L93), [`src/App.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L735-L750)
- **Backend/API/Database Dependency:** WhatsApp Universal Link Protocol.
- **Test Coverage:** Unit tested phone normalizers (`normalizeWaNumber`).
- **Known Bugs or Limitations:** Requires internet connectivity to open WhatsApp web/app.

---

### 7. Barcode Scanning

#### 7.1 Native Camera Barcode Detection
- **Description:** Scans physical product barcodes and QR codes using device camera stream via `navigator.mediaDevices.getUserMedia` and the `BarcodeDetector` Web API.
- **Status:** **Partial**
- **Relevant Source Files:** [`src/components/BarcodeScannerModal.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/components/BarcodeScannerModal.tsx#L64-L119)
- **Backend/API/Database Dependency:** Browser MediaStreams and native `window.BarcodeDetector`.
- **Test Coverage:** None.
- **Known Bugs or Limitations:** The `BarcodeDetector` API is only supported on Android Chrome and desktop Chromium browsers. On iOS Safari and Mozilla Firefox, `window.BarcodeDetector` is undefined; on these browsers, the camera video feed turns on, but automatic barcode decoding fails silently without an error prompt.

#### 7.2 Hardware USB/Bluetooth Barcode Scanner Support
- **Description:** Supports rapid input from handheld laser/CCD barcode scanners emulating keyboard input into the search field.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/components/BarcodeScannerModal.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/components/BarcodeScannerModal.tsx#L28-L62), [`src/pages/BillingPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/BillingPage.tsx#L85-L89)
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** Tested via manual input events.
- **Known Bugs or Limitations:** None.

#### 7.3 Unknown Barcode Quick Registration
- **Description:** When an unrecognized barcode is scanned, UI provides a button to open the "Add Product" modal with the scanned barcode pre-populated.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/components/BarcodeScannerModal.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/components/BarcodeScannerModal.tsx#L187-L200)
- **Backend/API/Database Dependency:** Local state.
- **Test Coverage:** Covered in modal callbacks.
- **Known Bugs or Limitations:** None.

---

### 8. Products and Inventory

#### 8.1 Product Catalog CRUD
- **Description:** Full product lifecycle management: Name, SKU, Barcode, Category, Brand, Unit Type (11 presets or custom), Purchase Cost, Selling Price, MRP, GST Rate, Tax Inclusivity, Current Stock, Opening Stock, Reorder Low Stock Limit, Supplier Linkage, and Status (Active/Inactive).
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/pages/ProductsPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/ProductsPage.tsx), [`src/components/ProductModal.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/components/ProductModal.tsx)
- **Backend/API/Database Dependency:** `localStorage` (`vels_products`).
- **Test Coverage:** `stock.test.ts`.
- **Known Bugs or Limitations:** None.

#### 8.2 Dual Stock Valuation
- **Description:** Computes inventory asset worth at Cost Price (`cost * stock`) and at Selling Price (`price * stock`) independently without mixing bases.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/services/stockService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/stockService.ts#L105-L117)
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** `stock.test.ts` (Phase 12 valuation suite).
- **Known Bugs or Limitations:** None.

#### 8.3 Stock Movements Ledger & Adjustments
- **Description:** Dedicated stock movement tracking recording delta, movement type ("Stock In", "Stock Out", "Adjustment", "Damage", "Expired", "Purchase", "Sale", "Sales Return"), timestamp, and reference document.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/components/StockAdjustmentModal.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/components/StockAdjustmentModal.tsx), [`src/types/index.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/types/index.ts#L167-L190)
- **Backend/API/Database Dependency:** `localStorage` (`vels_stock_movements`).
- **Test Coverage:** `stock.test.ts`.
- **Known Bugs or Limitations:** None. Stock floored at 0 unless `allowNegative` is configured.

---

### 9. Customers and Ledger

#### 9.1 Customer Master Directory
- **Description:** Create, update, list, and delete customer profiles: Name, 10-digit Phone, Email, GSTIN, Billing Address, State, Opening Balance, and Notes.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/pages/CustomersPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/CustomersPage.tsx), [`src/components/CustomerModal.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/components/CustomerModal.tsx)
- **Backend/API/Database Dependency:** `localStorage` (`vels_customers`).
- **Test Coverage:** `customers.test.ts`.
- **Known Bugs or Limitations:** None.

#### 9.2 Customer Running Ledger Statement
- **Description:** Itemized debit/credit account statement. Invoices and debit opening balances increase receivables; customer payment receipts and sales returns decrease receivables. Computes running balance after every chronological transaction.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/components/CustomerLedgerModal.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/components/CustomerLedgerModal.tsx), [`src/services/customerService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/customerService.ts)
- **Backend/API/Database Dependency:** Real records derived from `invoices`, `payments`, `salesReturns`.
- **Test Coverage:** `customers.test.ts` (Phase 8 customer outstanding suite).
- **Known Bugs or Limitations:** Cancelled invoices are automatically excluded from customer ledger balances.

---

### 10. Suppliers and Purchases

#### 10.1 Supplier Directory & Payables
- **Description:** Supplier management with Name, Phone, Email, Address, State, GSTIN, Opening Balance Owed, and Notes. Displays Total Purchases, Total Paid, and Balance Owed.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/pages/SuppliersPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/SuppliersPage.tsx), [`src/components/SupplierModal.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/components/SupplierModal.tsx), [`src/services/supplierService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/supplierService.ts)
- **Backend/API/Database Dependency:** `localStorage` (`vels_suppliers`).
- **Test Coverage:** `upgrade-services.test.ts`.
- **Known Bugs or Limitations:** None.

#### 10.2 Inward Purchase Entries
- **Description:** Record vendor purchase bills with purchase number, vendor invoice number, supplier selection, purchase price, quantity, discount, GST rate, paid amount, and payment mode.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/pages/PurchasesPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/PurchasesPage.tsx), [`src/components/PurchaseModal.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/components/PurchaseModal.tsx), [`src/services/purchaseService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/purchaseService.ts)
- **Backend/API/Database Dependency:** `localStorage` (`vels_purchases`, `vels_products`, `vels_stock_movements`).
- **Test Coverage:** `purchase-returns.test.ts`.
- **Known Bugs or Limitations:** Automatically inwards inventory stock and records stock movement.

#### 10.3 Supplier Ledger Statement
- **Description:** Itemized chronological vendor statement with purchases (credit), payments (debit), and running balance.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/services/supplierService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/supplierService.ts#L64-L143)
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** `upgrade-services.test.ts`.
- **Known Bugs or Limitations:** None.

---

### 11. Payments and Outstanding Balances

#### 11.1 Payment Receipts & Vouchers
- **Description:** Record incoming customer payments or outgoing supplier payments with receipt number (`REC-XXXXXX`), date, payment mode (Cash, UPI, Card, Bank/Cheque), invoice linkage, amount, and reference notes.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/pages/PaymentsPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/PaymentsPage.tsx), [`src/components/ReceivePaymentModal.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/components/ReceivePaymentModal.tsx), [`src/services/paymentService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/paymentService.ts)
- **Backend/API/Database Dependency:** `localStorage` (`vels_payments`, `vels_invoices`).
- **Test Coverage:** `payment.test.ts`.
- **Known Bugs or Limitations:** Recording a payment against an invoice automatically updates the invoice's `paidAmount` and re-derives `paymentStatus` ("Paid", "Partial", "Pending").

#### 11.2 Outstanding Calculation Engine
- **Description:** Centralized pure logic for computing customer outstandings (`invoice balances - recorded receipts`) and supplier payables.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/services/customerService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/customerService.ts#L44-L104)
- **Backend/API/Database Dependency:** Pure calculation engine.
- **Test Coverage:** `customers.test.ts`, `payment.test.ts`.
- **Known Bugs or Limitations:** None.

---

### 12. Expenses

#### 12.1 Operating Expense Management
- **Description:** Track daily operational overheads across 10 categories: Rent, Electricity, Salary, Transport, Maintenance, Marketing, Office Supplies, Internet & Phone, Tea & Snacks, Other.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/pages/ExpensesPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/ExpensesPage.tsx), [`src/components/ExpenseModal.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/components/ExpenseModal.tsx), [`src/services/expenseService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/expenseService.ts)
- **Backend/API/Database Dependency:** `localStorage` (`vels_expenses`).
- **Test Coverage:** `upgrade-services.test.ts`.
- **Known Bugs or Limitations:** None.

#### 12.2 Net Profit Calculation
- **Description:** Deducts operating expenses from gross profit (`Gross Profit - Expenses = Net Profit`) to calculate honest net margins.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/services/expenseService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/expenseService.ts#L93-L137)
- **Backend/API/Database Dependency:** Derived from invoices, product costs, and expenses.
- **Test Coverage:** `upgrade-services.test.ts`.
- **Known Bugs or Limitations:** None.

---

### 13. Reports and Exports

#### 13.1 12 Modular Business Reports
- **Description:** 12 specialized reports with date filtering and data tables:
  1. Sales Summary Report
  2. GST Liability Report (Rate-wise slabs: 0, 5, 12, 18, 28%)
  3. Payment Collection Report
  4. Profit & Loss Report
  5. Stock Valuation & Inventory Report
  6. Stock Movement Audit Trail Report
  7. Customer Receivables Report
  8. Supplier Payables Report
  9. Inward Purchases Report
  10. Operating Expenses Report
  11. Sales Returns & Credit Notes Report
  12. Invoice Register Report
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/pages/ReportsPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/ReportsPage.tsx), [`src/services/reportService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/reportService.ts)
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** `reports-sales.test.ts`, `reports-gst.test.ts`, `reports-dash.test.ts`, `reports-lists.test.ts`.
- **Known Bugs or Limitations:** None.

#### 13.2 CSV Data Export
- **Description:** Instant client-side CSV spreadsheet generation and download for any active report table.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/pages/ReportsPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/ReportsPage.tsx#L160-L215)
- **Backend/API/Database Dependency:** Browser Blob and object download.
- **Test Coverage:** Manual and CDP tested.
- **Known Bugs or Limitations:** None.

---

### 14. Subscription Plans and Payment Integration

#### 14.1 Payment Gateway Integration (Razorpay, Stripe, Cashfree, Paytm)
- **Description:** Automated payment gateway SDK for customer card/netbanking payments or link creation.
- **Status:** **Missing**
- **Relevant Source Files:** None.
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** None.
- **Known Bugs or Limitations:** There is no online payment gateway integrated. All payment modes (UPI, Cash, Card, Bank) record manual offline settlements. (UPI QR is static/offline NPCI string generation).

#### 14.2 SaaS Subscription Tier Enforcement
- **Description:** In-app subscription billing, paywalls, or feature gating based on plan tiers (Free, Pro, Enterprise).
- **Status:** **UI-Only / Missing in Client**
- **Relevant Source Files:** [`src/master-admin/api.ts` line 8](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/master-admin/api.ts#L8)
- **Backend/API/Database Dependency:** Master Admin model field only.
- **Test Coverage:** None.
- **Known Bugs or Limitations:** In the billing web app, all features are completely unlocked with no license checks, trial timers, or subscription constraints.

---

### 15. Admin Panel

#### 15.1 Master Admin Dashboard (`/master-admin`)
- **Description:** Centralized SaaS admin console for the software owner.
- **Status:** **Implemented (Client)** / **Requires External Backend**
- **Relevant Source Files:**
  - App Shell: [`src/master-admin/MasterAdminApp.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/master-admin/MasterAdminApp.tsx)
  - API Client: [`src/master-admin/api.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/master-admin/api.ts)
  - Charts: [`src/master-admin/pages/Charts.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/master-admin/pages/Charts.tsx)
  - Member Directory: [`src/master-admin/pages/Members.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/master-admin/pages/Members.tsx)
  - Detail Modal: [`src/master-admin/pages/Detail.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/master-admin/pages/Detail.tsx)
- **Backend/API/Database Dependency:** External API server at `http://localhost:5000` or `VITE_API_URL` (`/api/stats`, `/api/businesses`, `/api/businesses/:id/status`).
- **Test Coverage:** None in local test runner.
- **Known Bugs or Limitations:** Backend server code is not located within this repository. Without the external backend running, the admin page displays a connection error.

---

### 16. Mobile Responsiveness and Accessibility

#### 16.1 Mobile Navigation & Layout Adaptability
- **Description:** Dedicated mobile drawer with backdrop blur, sticky mobile top bar (60px), 5-tab bottom navigation bar, slide-up "More" sheet, and safe-area padding (`pb-[env(safe-area-inset-bottom)]`).
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/App.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L860-L985), [`src/App.tsx` lines 1280-1360](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L1280-L1360)
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** Responsive CDP automation test (`qa-cdp.mjs`) verified across widths from 320px to 1440px.
- **Known Bugs or Limitations:** High-column tables on Reports and Dashboard trigger horizontal scrolling on screens under 375px.

#### 16.2 Accessibility (A11y)
- **Description:** WCAG compliance features: visible focus rings, reduced motion support, semantic button labeling.
- **Status:** **Partial**
- **Relevant Source Files:** [`src/index.css`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/index.css#L15-L29), [`src/App.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx)
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** Manual review.
- **Known Bugs or Limitations:** Missing WAI-ARIA modal dialog roles (`role="dialog"`, `aria-modal="true"`) and `aria-live` regions for live invoice calculation updates.

---

### 17. Search, Filters, Notifications and Keyboard Shortcuts

#### 17.1 Global Search Modal (⌘K / Ctrl+K)
- **Description:** Omnibar search modal searching concurrently across Invoices, Inventory Products, Customers, and Suppliers with keyboard shortcut.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/components/GlobalSearchModal.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/components/GlobalSearchModal.tsx), [`src/App.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L370-L376)
- **Backend/API/Database Dependency:** Client state.
- **Test Coverage:** Tested in DOM environment.
- **Known Bugs or Limitations:** None.

#### 17.2 System Notifications & Alert Popover
- **Description:** Real-time indicator alerting the business owner to Out of Stock items, Low Stock warnings, Pending invoice receivables, and Stale Backup reminders (>7 days old).
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/components/NotificationsPopover.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/components/NotificationsPopover.tsx), [`src/App.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L1006-L1037)
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** Visual component; underlying conditions tested.
- **Known Bugs or Limitations:** None.

#### 17.3 Keyboard Shortcuts
- **Description:** Fast shortcuts: `⌘K` / `Ctrl+K` for Global Search, `⌘N` / `Ctrl+N` for New Bill, `Escape` to close navigation drawer and modals.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/App.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L255-L261), [`src/App.tsx` lines 370-385](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L370-L385)
- **Backend/API/Database Dependency:** Window keyboard event listeners.
- **Test Coverage:** Tested in browser environment.
- **Known Bugs or Limitations:** None.

---

### 18. Security, Permissions, Validation and Audit Logs

#### 18.1 Numeric & Financial Data Validation
- **Description:** Comprehensive protection against `NaN`, `Infinity`, null, negative amounts, or malformed data entering calculations or persistence.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/services/money.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/money.ts#L17-L37), [`src/services/invoiceService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/invoiceService.ts#L357-L377)
- **Backend/API/Database Dependency:** None.
- **Test Coverage:** `money.test.ts` (Phase 26 validation guards).
- **Known Bugs or Limitations:** None.

#### 18.2 Application Security & Cryptographic Protection
- **Description:** Data encryption at rest and in transit, session protection, authorization boundaries.
- **Status:** **Missing**
- **Relevant Source Files:** [`src/services/storageService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/storageService.ts)
- **Backend/API/Database Dependency:** LocalStorage API.
- **Test Coverage:** Storage tests.
- **Known Bugs or Limitations:** Despite UI badge text displaying "Encrypted Local Storage", the data in `localStorage` is saved as **plain, unencrypted JSON strings**. Any browser extension or cross-site script (XSS) can immediately read all financial records.

#### 18.3 User Audit Logs
- **Description:** Tamper-evident record of user logins, price adjustments, invoice edits, or record deletions with user identification.
- **Status:** **Partial**
- **Relevant Source Files:** [`src/types/index.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/types/index.ts#L179-L190), [`src/App.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L403-L419)
- **Backend/API/Database Dependency:** Local state (`vels_stock_movements`).
- **Test Coverage:** `stock.test.ts`.
- **Known Bugs or Limitations:** Inventory stock changes are fully audited with timestamps and reference numbers. However, customer deletions, expense modifications, or invoice edits do not generate an immutable user audit trail.

---

### 19. Offline Functionality and Local Storage

#### 19.1 Service Worker & PWA Caching
- **Description:** Offline Service Worker caching the App Shell (`/`, `/manifest.json`, icon assets) allowing the application to launch and run with complete fidelity when network connectivity is severed.
- **Status:** **Implemented**
- **Relevant Source Files:**
  - Service Worker: [`public/sw.js`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/public/sw.js)
  - Manifest: [`public/manifest.json`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/public/manifest.json)
  - Registration: [`src/main.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/main.tsx#L89-L96)
- **Backend/API/Database Dependency:** Service Worker & Cache Storage APIs.
- **Test Coverage:** Service Worker lifecycle.
- **Known Bugs or Limitations:** Vite PWA plugin is listed in devDependencies but configuration uses a direct custom service worker script in `public/sw.js`.

#### 19.2 Zero-Dependency Offline UPI QR Generator
- **Description:** Generates standard NPCI UPI QR code matrices using pure TypeScript without any external network API, third-party JavaScript libraries, or CDN calls.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/services/qrService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/qrService.ts)
- **Backend/API/Database Dependency:** Zero dependencies. Complete offline Reed-Solomon polynomial math and SVG/DataURL generation.
- **Test Coverage:** `upgrade-services.test.ts` (qrService suite).
- **Known Bugs or Limitations:** None.

#### 19.3 Transactional Storage with Rollback
- **Description:** Atomic multi-key updates to `localStorage` that capture snapshots before write and roll back to previous state if a browser `QuotaExceededError` occurs.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/services/storageService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/storageService.ts#L90-L118)
- **Backend/API/Database Dependency:** Web Storage API.
- **Test Coverage:** `upgrade-services.test.ts`.
- **Known Bugs or Limitations:** `localStorage` has a hard 5MB-10MB quota per domain. High-volume businesses with years of data or numerous logo images will encounter quota limits unless migrated to IndexedDB.

---

### 20. Backup, Recovery and Deployment Support

#### 20.1 Complete System Backup Export & Validation
- **Description:** Exports all 10 business datasets (Products, Customers, Suppliers, Invoices, Purchases, Payments, Stock Movements, Sales Returns, Expenses, Company Settings) into a structured JSON file.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/services/storageService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/storageService.ts#L120-L199), [`src/pages/SettingsPage.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/pages/SettingsPage.tsx#L46-L63)
- **Backend/API/Database Dependency:** Browser Blob and download anchor pattern.
- **Test Coverage:** `upgrade-services.test.ts`.
- **Known Bugs or Limitations:** Download triggers direct `.json` save without opening empty browser tabs.

#### 20.2 Strict Backup Import & Schema Validation
- **Description:** Reads uploaded `.json` backup file, validates schema and critical arrays (products, customers, invoices), and transactionally restores the application state.
- **Status:** **Implemented**
- **Relevant Source Files:** [`src/services/storageService.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/services/storageService.ts#L201-L271), [`src/App.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L684-L717)
- **Backend/API/Database Dependency:** FileReader and transactional storage.
- **Test Coverage:** `upgrade-services.test.ts`.
- **Known Bugs or Limitations:** Malformed or foreign JSON files are safely rejected without corrupting existing records.

#### 20.3 Deployment Configuration
- **Description:** One-click deployment configurations for production hosting on modern static web hosts.
- **Status:** **Implemented**
- **Relevant Source Files:**
  - Netlify: [`netlify.toml`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/netlify.toml)
  - Vercel: [`public/vercel.json`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/public/vercel.json)
  - Vite: [`vite.config.ts`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/vite.config.ts)
- **Backend/API/Database Dependency:** Static hosting (Vercel, Netlify, GitHub Pages).
- **Test Coverage:** Production build verified (`vite build` completes in ~14s).
- **Known Bugs or Limitations:** Build produces a main chunk of 898 kB; code-splitting / dynamic imports are recommended to optimize initial load.

---

# Part B: Existing Features That Work End-to-End

These features are completely wired to live application state, business calculation engines, and persistence mechanisms, operating without any mock data:

1. **Point of Sale (POS) Billing:**
   - Sequential invoice number generation with custom business prefix.
   - Dynamic product search, quantity adjustment, line-item percentage or flat discount.
   - Real-time GST calculation (Intra-state CGST/SGST vs Inter-state IGST).
   - Cash, UPI, Card, and Credit payment modes with partial amount support.
   - Duplicate-save protection and automatic stock deduction.
2. **Stock & Inventory Engine:**
   - Full Product CRUD with category, unit, barcode, HSN, purchase cost, and selling price.
   - Dual stock valuation at Cost vs Selling price.
   - Stock movements ledger tracking 10 distinct inventory movement types.
   - Reorder and low stock notification thresholds.
3. **Customer Ledger & Outstanding Receivables:**
   - Customer profile management with state and GSTIN validation.
   - Comprehensive running ledger statement with debit (invoices) and credit (payments, returns).
   - Real-time customer receivables calculation across all invoices.
4. **Supplier Management & Inward Purchases:**
   - Vendor directory with opening balances and payables calculation.
   - Inward purchase bill recording with automatic inventory restocking.
   - Supplier ledger statements.
5. **Payment Receipts & Vouchers:**
   - Standalone payment receipts updating customer outstanding balances and invoice payment statuses.
6. **Sales Returns & Refunds:**
   - Itemized sales returns with tax reversal (CGST/SGST/IGST), inventory restoration, and credit note/cash refund options.
7. **Operating Expenses & Profit Calculations:**
   - Expense categorization across 10 categories.
   - Net Profit calculation deducting expenses from gross margins.
8. **Comprehensive Reporting & CSV Export:**
   - 12 active reports covering Sales, GST, Payments, Profit, Stock, Movements, Customers, Suppliers, Purchases, Expenses, Returns, and Invoices.
   - 1-click CSV spreadsheet export for every report.
9. **Zero-Dependency UPI QR Code Generation:**
   - Pure TypeScript offline generator creating valid NPCI dynamic payment QR codes with invoice amount embedded.
10. **Invoice Printing & Standalone HTML Export:**
    - Clean A4 portrait print stylesheet and self-contained HTML invoice download.
11. **Direct WhatsApp Messaging:**
    - Formatted bill sharing via WhatsApp Web and WhatsApp Mobile.
12. **System Backup & Recovery:**
    - Transactional export and import of complete system data with schema validation.
13. **PWA Offline Operation:**
    - App shell caching via Service Worker enabling 100% functionality without internet access.

---

# Part C: Features That Are Only UI Placeholders

The following items are visually present in the UI or labels but do not execute real end-to-end functionality:

1. **"A4 Invoice PDF" Button:**
   - **File:** [`src/App.tsx` line 1389](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L1389)
   - **Current Behavior:** Downloads an HTML document (`.html`), not a binary `.pdf` file.
2. **"Encrypted Local Storage" Label:**
   - **File:** [`src/App.tsx` line 854](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L854), [`src/App.tsx` line 932](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/App.tsx#L932)
   - **Current Behavior:** Plain text UI badge. Data stored in `localStorage` is completely unencrypted plain JSON.
3. **Master Admin SaaS Subscription Plans (Free / Pro / Enterprise):**
   - **File:** [`src/master-admin/api.ts` line 8](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/master-admin/api.ts#L8), [`src/master-admin/pages/Charts.tsx`](file:///c:/Users/DELL/Desktop/vels-tech-webapp-pwa/src/master-admin/pages/Charts.tsx)
   - **Current Behavior:** Displayed on charts and modals, but there is no subscription billing engine, plan expiration logic, or feature gating in the client app.
4. **Thermal Receipt Printing (58mm / 80mm):**
   - **Current Behavior:** Print stylesheet is hardcoded to `@page { size: A4 portrait; }`. There is no selectable 3-inch/2-inch thermal receipt layout.

---

# Part D: Missing Features

The following standard commercial billing application capabilities are absent from the current codebase:

1. **User Authentication & Staff Access Control:**
   - No login, PIN, or biometric lock for the billing app.
   - No multi-user role permissions (Cashier mode vs Admin mode).
2. **Multi-Tenant / Multi-Branch Switching:**
   - Cannot manage two or more shops/locations within the same app instance.
3. **Payment Gateway Integration:**
   - No integration with payment gateways (Razorpay, Stripe, Cashfree, or UPI POS machines).
4. **Cloud Database Synchronization & Multi-Device Real-Time Sync:**
   - No automated sync to Firebase, Supabase, PostgreSQL, or CouchDB. Data resides exclusively on the single physical device where it was entered.
5. **Direct Binary PDF Generation:**
   - No bundled library (`jspdf`, `pdfmake`, `@react-pdf/renderer`) to generate standalone PDF binary files directly.
6. **Cross-Browser Camera Barcode Scanning:**
   - No fallback JS barcode library (e.g., ZXing or quagga2) for iOS Safari or Firefox users.
7. **E-Way Bill & E-Invoicing (GST Portal API Integration):**
   - No IRN generation, JSON e-invoice payload generation, or direct GST portal upload.
8. **IndexedDB Storage Backend:**
   - App relies entirely on `localStorage` (capped at 5–10MB), lacking an IndexedDB storage adapter for high-volume transactions.

---

# Part E: Security and Data-Integrity Risks

| Risk Level | Finding | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| **CRITICAL** | **Unrestricted Local Storage Access** | Any operator with access to the browser, or any malicious browser extension/XSS script, can view, copy, or execute `localStorage.clear()` to wipe all financial records. | Implement app-level PIN/password lock and migrate sensitive records to encrypted storage or secure backend. |
| **CRITICAL** | **Hardcoded Master Admin Credentials in Markup** | `src/master-admin/pages/Login.tsx` (line 45) displays default credentials: `admin@velstech.in / Admin@123` directly in the UI. | Remove hardcoded default credentials from client markup immediately; enforce environment-driven server secrets. |
| **HIGH** | **5MB LocalStorage Quota Ceiling** | Invoices, item rows, and Base64-encoded logos share the browser's 5MB–10MB quota. A busy retail store can exceed quota within 6–12 months, preventing new invoice saves. | Implement an IndexedDB persistence adapter (e.g., via `idb` or `dexie`) with automatic data migration. |
| **MEDIUM** | **Single Point of Failure (No Cloud Backup)** | If the user clears browser cookies/cache, suffers hardware disk failure, or loses the mobile phone, all billing and customer ledger data is permanently lost unless manual JSON backup was downloaded. | Provide automated cloud backup sync (Google Drive, Firebase, or S3) or prominent daily backup prompts. |
| **MEDIUM** | **Unauthenticated Master Admin Route** | Navigating to `/master-admin` exposes the admin dashboard shell. Although API calls fail without token, the UI shell is publicly bundle-accessible. | Implement route guards and code-split the `/master-admin` bundle into a separate lazy-loaded chunk. |

---

# Part F: Recommended Improvements Prioritized

### Critical Priority (Immediate Action)
1. **Remove Hardcoded Admin Credentials:**
   - Delete the plaintext default credentials hint from `src/master-admin/pages/Login.tsx`.
2. **Implement App-Level Security PIN / Passcode:**
   - Add a lightweight 4-digit or 6-digit PIN lock screen on app startup to prevent unauthorized walk-up access on POS terminals.
3. **Migrate Persistence from LocalStorage to IndexedDB:**
   - Replace or wrap `localStorage` with an IndexedDB storage engine (using `idb` or `dexie`). This expands storage limits from 5MB to gigabytes, accommodating years of transaction history and product images.

### High Priority
4. **Bundle True Client-Side PDF Generator:**
   - Integrate `jspdf` or `pdfmake` so that the "A4 Invoice PDF" button generates an actual binary `.pdf` file rather than downloading an HTML document.
5. **Thermal Receipt Template (80mm / 58mm):**
   - Provide a toggle in Settings for "Thermal Receipt Mode" with appropriate `@media print` CSS for standard 2-inch and 3-inch POS receipt printers.
6. **Cross-Browser Barcode Polyfill:**
   - Integrate a lightweight barcode fallback library (such as `@zxing/library` or `jsqr`) inside `BarcodeScannerModal.tsx` so camera scanning functions on iOS Safari and Firefox.
7. **Automated Cloud Backup Sync:**
   - Implement optional 1-click cloud sync (e.g., Supabase or Google Drive) so shop data is automatically preserved against phone loss or browser cache clearing.

### Medium Priority
8. **Cashier / Staff Permissions Mode:**
   - Implement a simple "Staff Mode" that disables access to Settings, Data Reset, and Invoice Cancellation without manager PIN authorization.
9. **Code Splitting & Bundle Optimization:**
   - Use dynamic imports (`React.lazy()`) for `MasterAdminApp`, `ReportsPage`, and `Recharts` to reduce initial bundle size from 898 kB down to under 250 kB.
10. **Batch Barcode Label Printing:**
    - Add a tool in the Products section to generate and print printable barcode/price tag sticker sheets for items.

### Low Priority
11. **Dark Mode UI Theme:**
    - Provide a system-adaptive dark theme for the billing interface.
12. **Multi-Language Support (Tamil / English):**
    - Add regional language localization (e.g., Tamil language invoice printing and interface) for local shops in Tamil Nadu.

---

# Part G: Concise Customer-Facing Feature List for Marketing the App

> ### **VELS TECH Billing Web App (v1.1.0)**
> **The Modern, Ultra-Fast GST Billing & Inventory Solution for Retailers and Wholesalers**

* **⚡ Ultra-Fast POS Billing:** Create GST and non-GST invoices in under 15 seconds. Instant product search, quick-add pills for frequent items, and auto-sequence numbering.
* **📶 100% Offline & Installable (PWA):** Works seamlessly without internet on Mobile, Tablet, and Desktop. Install directly to your home screen or desktop with zero setup.
* **🇮🇳 Automatic GST Engine:** Automatic CGST, SGST, and IGST tax splitting based on customer state. Supports 0%, 5%, 12%, 18%, 28% slabs and GST-inclusive pricing.
* **📱 Instant WhatsApp Invoicing:** Send professional, formatted invoice receipts directly to your customer's WhatsApp in one tap.
* **📷 Instant UPI QR Code on Every Bill:** Offline dynamic QR codes on bills so customers can scan and pay exact invoice totals instantly using GPay, PhonePe, or Paytm.
* **📦 Complete Inventory & Stock Control:** Real-time stock tracking, dual valuation (Cost vs Selling worth), low-stock alerts, and detailed stock movement history.
* **👥 Customer & Supplier Ledgers (Khata):** Complete debit/credit ledger tracking receivables and payables with date-wise balance statements.
* **🚚 Inward Purchase Management:** Record supplier purchase bills with automatic stock inwarding and vendor ledger reconciliation.
* **💰 Operating Expense & Profit Tracking:** Track shop expenses (Rent, Electricity, Salary) and calculate true net profit margins.
* **📊 12 Comprehensive Business Reports:** One-click CSV and print reports for Sales, GST Filing, Stock Valuation, Customer Balances, and Profit & Loss.
* **🔍 Instant Global Search & ⌘K Shortcuts:** Search any invoice, customer, product, or vendor instantly with keyboard shortcuts.
* **🔒 Complete Data Ownership & Backup:** Download 1-click full system backups to your device anytime with complete privacy and zero monthly server fees.

