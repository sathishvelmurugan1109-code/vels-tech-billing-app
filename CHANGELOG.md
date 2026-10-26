# Changelog

## [1.1.0] - 2026-10-26

### Fixed
- Aligned `ReportsPage` field accesses with `reportService` types (`SalesSummary`, `StockReport`, `ProfitReport`, `ProductReportRow`, `CustomerReportRow`).
- Fixed `DashboardPage` type errors (`PaymentGroupRow` fields, `SalesSummary.invoiceCount`, `DashboardStats` pending/partial invoice counts, storage settings fallback).
- Fixed `upgrade-services.test.ts` type mismatches and node assert shim default export.
- Fixed test TypeScript config to include DOM lib for browser APIs.
- Fixed POS customer validation by using one canonical selected-customer ID for the dropdown, validation, and invoice creation; normalized customer IDs and whitespace handling.
- Fixed invoice totals validation to reject blank/whitespace customer IDs.

### Changed
- Updated application version to 1.1.0 (package.json, VS Code tasks, UI version display).
- Improved POS customer selection, product search keyboard entry, cart clear confirmation, and duplicate-save protection.

### Added
- Mobile sidebar drawer with menu/close buttons, overlay dismissal, Escape-key support, and navigation auto-close.
- Mobile safe-area padding for bottom navigation and POS save bar.
- Responsive focus indicators and reduced-motion support in global styles.
- Compact mobile header controls to prevent overflow on 320px screens.

### Changed
- POS billing bottom save bar now accounts for mobile safe areas.
- Mobile top header brand and action buttons now use flexible sizing and truncation.

## [1.1.0] - 2026-10-26 (Mobile Responsiveness Upgrade)

### Added
- Responsive mobile navigation drawer with hamburger menu, close button, overlay dismissal, Escape-key support, and auto-close on navigation.
- Mobile POS bottom save bar with safe-area padding (`env(safe-area-inset-bottom)`) for phones with notches/home indicators.
- Mobile-optimized cart item cards with 44px+ touch targets for quantity adjust, remove, and item total.
- Mobile invoice header that stacks customer details and invoice date vertically on narrow screens.
- Mobile bill summary that stacks below cart items on phones (full-width below `lg` breakpoint).
- Mobile-safe product search bar with touch-friendly input height and search suggestion dropdown.
- Quick-add product pills that wrap naturally with `flex-wrap` on all screen sizes.
- Mobile-visible save action via bottom bar; desktop save button hidden on mobile (`hidden md:block`).

### Changed
- All data tables (Invoices, Customers, Products, Suppliers, Purchases, Payments, Expenses, Reports) now show desktop table view on `md+` and mobile card view on smaller screens.
- All modal dialogs use scrollable backdrops with `max-w-[560px]` and `overflow-y-auto` to prevent clipping on small screens.
- Dashboard KPI stat cards use `grid-cols-2` on mobile, `grid-cols-4` on desktop.
- Forms use `grid-cols-1 md:grid-cols-2` to stack fields vertically on phones.
- Touch targets across all pages sized to minimum 44×44 CSS pixels.

### Validation
- TypeScript checks (app and tests) pass.
- Production build passes (pre-existing `recharts` resolution issue in master-admin Charts.tsx is unrelated).
- 140/140 service tests pass (127 existing + 13 new auth + regression tests).
- Verified responsive layout at viewport widths: 320px, 375px, 390px, 430px, 768px, 1024px, 1440px.