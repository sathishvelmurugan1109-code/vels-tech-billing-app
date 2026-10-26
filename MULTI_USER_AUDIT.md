# VELS TECH Billing Web App — Multi-User Architecture Audit

**Audit date:** 2026-10-26  
**Repository:** `vels-tech-webapp-pwa`  
**Application version:** `1.1.0`  
**Primary audit output:** `MULTI_USER_AUDIT.md`

---

## 1. Executive summary

The billing application is currently a **single-tenant, browser-local PWA**. It has no login, no user identity, no tenant/business scoping, and no cloud database in this repository. All business data is stored in browser `localStorage` under fixed keys such as `vels_products`, `vels_invoices`, etc.

A separate **Master Admin** surface exists at `/master-admin`, but it is only a frontend client for an external REST API. The backend implementation is **not present in this repository**.

**Bottom line:** Multi-user support is **not implemented**. It must be added as a new architecture layer, not a small settings change. The recommended approach is to introduce a tenant-aware data/API layer, authentication, authorization, and a migration path that preserves existing local invoices and customers.

This document separates **verified findings** (observed directly in repository files) from **assumptions** (inferred or not verifiable from the repository).

---

## 2. Evidence legend

| Label | Meaning |
|---|---|
| **Verified** | Directly observed in repository files during this audit. |
| **Assumed** | Inferred from naming, documentation, external API shape, or general architecture; not proven by repository contents. |
| **Not present** | Expected for multi-user support but absent from repository. |

---

## 3. Verified repository facts

### 3.1 Application shape

- **Verified:** `package.json` defines a React 18 + TypeScript 5 + Vite 5 SPA/PWA with no backend runtime dependencies.
- **Verified:** Dependencies are frontend-only: `react`, `react-dom`, `lucide-react`, `recharts`, `lodash`.
- **Verified:** Dev dependencies include `vite`, `@vitejs/plugin-react`, `tailwindcss`, `vite-plugin-pwa`, TypeScript.
- **Verified:** `npm run dev` starts Vite; `npm run build` builds to `dist`.
- **Verified:** `netlify.toml` only configures SPA fallback: `/* -> /index.html`.
- **Verified:** `public/sw.js` caches only the app shell (`/`, `/manifest.json`, icons). It explicitly bypasses `/api/`.
- **Verified:** `public/manifest.json` is a standalone PWA manifest with no tenant/user metadata.

### 3.2 Routing

- **Verified:** `src/main.tsx` selects between two apps by URL path:
  - `/master-admin*` renders `MasterAdminApp`.
  - everything else renders the billing `App`.
- **Verified:** There is no router library and no route guard in `src/main.tsx`.

### 3.3 Billing app data layer

- **Verified:** `src/App.tsx` initializes all domain state from `localStorage` through `safeGetStorage`.
- **Verified:** `src/App.tsx` persists each state slice independently with `useEffect` + `safeSetStorage`.
- **Verified:** `src/services/storageService.ts` defines fixed `STORAGE_KEYS`.
- **Verified:** Storage is browser `localStorage` with an in-memory fallback for non-browser/test execution.
- **Verified:** `transactionalStorageUpdate` provides rollback-style writes across multiple keys.
- **Verified:** Backup/restore exists as local JSON download/upload through `createFullBackup`, `downloadBackupFile`, and `validateAndRestoreBackup`.
- **Verified:** There are no `businessId`, `tenantId`, `userId`, or `organizationId` fields in `src/types/index.ts`.
### 3.4 Master admin data layer

- **Verified:** `src/master-admin/api.ts` calls an external API base URL:
  - `VITE_MASTER_ADMIN_API_URL || VITE_API_URL || "http://localhost:5000"`
- **Verified:** Endpoints used:
  - `POST /api/auth/login`
  - `GET /api/stats`
  - `GET /api/businesses`
  - `GET /api/businesses/:id`
  - `PATCH /api/businesses/:id/status`
  - `GET /api/businesses/export/csv`
- **Verified:** Master admin auth token is stored in browser `localStorage` under `vels_admin_token`.
- **Verified:** `src/master-admin/pages/Login.tsx` renders hardcoded default credential hints.
- **Verified:** Backend server code and database schema are **not in this repository**.

### 3.5 Auth reality

- **Verified:** Billing app has no authentication, PIN, session, or role checks.
- **Verified:** All billing operators have full read/write/delete/export rights.
- **Verified:** Master admin has a login form and bearer-token API client, but the actual authentication authority is external and not present locally.
- **Verified:** Master admin token is stored in `localStorage`, which is vulnerable to XSS and not an httpOnly cookie.

### 3.6 Test baseline

- **Verified:** Service tests are located under `src/services/__tests__`.
- **Verified:** Existing service test files include money, GST, payments, stock, invoice, customer, date, profit, purchase, report, expense, supplier, and storage tests.
- **Verified:** The audit context reports `127/127` service tests passing before this audit. This audit did not modify code or rerun tests.

---

## 4. Current architecture

### 4.1 Frontend architecture

```text
Browser
├── / (billing SPA)
│   ├── src/main.tsx -> src/App.tsx
│   ├── React state initialized from localStorage
│   ├── localStorage persistence effects
│   ├── Pages receive state + handlers as props
│   └── Local JSON backup/restore
└── /master-admin (admin SPA)
    ├── src/main.tsx -> src/master-admin/MasterAdminApp.tsx
    ├── Login form
    ├── localStorage bearer token
    └── fetch() to external API
```

### 4.2 Backend architecture

- **Verified:** No backend server code exists in this repository.
- **Verified:** No database client, ORM, migration files, or API route handlers exist in this repository.
- **Verified:** `.env` only contains frontend Vite variables pointing to `http://localhost:5000`.
- **Assumed:** An external backend for Master Admin exists separately and owns business-directory data.
- **Not present:** Any billing backend, user database, tenant database, or sync API.

### 4.3 Data flow

1. `App.tsx` reads localStorage into React state on startup.
2. User actions mutate React state.
3. Effects persist each state slice back to localStorage.
4. Reports and calculations are derived in-memory from React state.
5. Backup export serializes all slices into one JSON file.
6. Restore validates JSON and writes all slices back transactionally.

There is no server reconciliation, conflict resolution, or multi-device sync.

---

## 5. Data storage inventory

| Storage key | Domain data | Source of truth today | Risk |
|---|---|---|---|
| `vels_products` | Product catalog, stock, prices, HSN, barcodes | `src/App.tsx`, `src/services/storageService.ts` | Quota; no tenant isolation |
| `vels_customers` | Customers, GSTIN, address, state, opening balance | `src/App.tsx` | Quota; no tenant isolation |
| `vels_suppliers` | Suppliers | `src/App.tsx` | Quota |
| `vels_invoices` | Invoices, items, totals, payment status | `src/App.tsx` | Critical financial data; quota |
| `vels_purchases` | Purchase bills | `src/App.tsx` | Quota |
| `vels_payments` | Payment receipts | `src/App.tsx` | Quota |
| `vels_stock_movements` | Stock ledger | `src/App.tsx` | Quota |
| `vels_sales_returns` | Sales returns | `src/App.tsx` | Quota |
| `vels_expenses` | Operating expenses | `src/App.tsx` | Quota |
| `vels_settings` | Company profile, invoice config, logo Base64 | `src/App.tsx`, `src/pages/SettingsPage.tsx` | Logo can consume quota |
| `vels_last_backup_date` | Last backup timestamp | `src/App.tsx` | Low |
| `vels_admin_token` | Master admin bearer token | `src/master-admin/*` | XSS-sensitive |

**Verified:** All billing data is device-local and browser-profile-local.  
**Verified:** The service worker does not cache business data.  
**Assumed:** Users expect offline-first behavior to remain after multi-user migration.

---

## 6. Auth reality

### 6.1 Billing app

- **Verified:** No authentication exists.
- **Verified:** No user, role, permission, or session model exists in types.
- **Verified:** No PIN/passcode lock exists.
- **Verified:** Data reset is available through UI and `localStorage.clear()`.

### 6.2 Master admin

- **Verified:** Login UI exists and calls external API.
- **Verified:** Token is stored in `localStorage`.
- **Verified:** Hardcoded default credentials are visible in markup.
- **Verified:** No client-side route guard prevents rendering the admin shell.
- **Assumed:** The external backend validates credentials and issues a JWT or similar token.
- **Not present:** MFA, password reset, session expiry handling, role-based admin permissions, audit logs.

### 6.3 Security findings relevant to multi-user work

- **Verified:** Any browser user can inspect or clear billing data.
- **Verified:** Master admin token is XSS-exposed because it is in `localStorage`.
- **Verified:** There is no tenant isolation at all.
- **Assumed:** Production deployment will use HTTPS; this is not enforced by repository config beyond PWA expectations.

---

## 7. Multi-user requirements

To support multiple users safely, the system needs:

1. **Identity:** User accounts with secure authentication.
2. **Tenant/business scoping:** Every business record belongs to a business/tenant.
3. **Authorization:** Role and permission checks for owner, manager, cashier, accountant, viewer.
4. **Data API:** Server-side persistence and query layer.
5. **Offline continuity:** Existing PWA/offline behavior should not be destroyed.
6. **Migration:** Existing local data must be importable without losing invoices/customers.
7. **Conflict handling:** Multi-device edits need deterministic conflict resolution.
8. **Auditability:** Important mutations should be traceable.
9. **Backup compatibility:** Existing backup JSON should remain importable.

---

## 8. Files and services requiring modification

### 8.1 Core type and domain model

- `src/types/index.ts`
  - Add `User`, `Business`, `Membership`, `Role`, `Permission`, `AuditEvent`, `AuthSession`.
  - Add optional `businessId`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`, `schemaVersion` to domain records.
  - Keep backward compatibility for legacy records during migration.

### 8.2 Storage layer

- `src/services/storageService.ts`
  - Replace direct `localStorage` assumptions with a storage adapter interface.
  - Add `LocalStorageAdapter` for legacy/offline cache.
  - Add remote API adapter or Supabase/Firebase adapter.
  - Add schema versioning and migration functions.
  - Preserve `validateAndRestoreBackup` and transactional update behavior.
- `src/services/index.ts`
  - Export new auth/data/storage modules.

### 8.3 Application state

- `src/App.tsx`
  - Replace direct localStorage initialization with a bootstrap flow:
    1. Check auth session.
    2. Load tenant data from server/cache.
    3. Run legacy migration if needed.
  - Remove or gate the global `localStorage.clear()` reset behavior.
  - Add session, tenant, role, and sync state.
  - Keep calculation services unchanged where possible.

### 8.4 Pages and components

All pages that consume or mutate business data will need prop or hook changes if data access moves from `App.tsx` state to a service/repository:

- `src/pages/DashboardPage.tsx`
- `src/pages/BillingPage.tsx`
- `src/pages/InvoicesPage.tsx`
- `src/pages/ProductsPage.tsx`
- `src/pages/CustomersPage.tsx`
- `src/pages/SuppliersPage.tsx`
- `src/pages/PurchasesPage.tsx`
- `src/pages/PaymentsPage.tsx`
- `src/pages/ExpensesPage.tsx`
- `src/pages/ReportsPage.tsx`
- `src/pages/SettingsPage.tsx`

Modals that create or edit records will also need tenant/user context and async save handling:

- `src/components/ProductModal.tsx`
- `src/components/CustomerModal.tsx`
- `src/components/SupplierModal.tsx`
- `src/components/PurchaseModal.tsx`
- `src/components/ReceivePaymentModal.tsx`
- `src/components/StockAdjustmentModal.tsx`
- `src/components/SalesReturnModal.tsx`
- `src/components/ExpenseModal.tsx`
- `src/components/CustomerLedgerModal.tsx`
- `src/components/GlobalSearchModal.tsx`
- `src/components/NotificationsPopover.tsx`

### 8.5 Auth and admin

- `src/main.tsx`
  - Add route handling/guards.
  - Lazy-load `MasterAdminApp` to reduce bundle size and hide admin shell.
- `src/master-admin/api.ts`
  - Replace or supplement localStorage token with secure session handling.
  - Add billing API client or shared API layer.
- `src/master-admin/pages/Login.tsx`
  - Remove hardcoded credential hints.
  - Add password reset / MFA hooks if backend supports them.
- `src/master-admin/MasterAdminApp.tsx`
  - Add real route guard.
  - Add platform admin role checks.
- `src/master-admin/pages/Members.tsx`, `Detail.tsx`, `Charts.tsx`
  - Align with tenant/user model and aggregate usage.

### 8.6 Configuration and deployment

- `.env`
  - Add frontend-safe variables only (no secrets).
- `netlify.toml`
  - Keep SPA fallback.
  - Add API proxy/redirect rules if backend is same-origin.
- `vite.config.ts`
  - Add dev proxy for `/api` if needed.
- `public/sw.js`
  - Decide cache strategy for API/auth endpoints; do not cache private business data blindly.
  - Add cache version bump on auth/data model changes.

### 8.7 Tests

Existing service tests must remain green. New tests needed:

- `src/services/__tests__/storageService.test.ts` or extended `upgrade-services.test.ts`
- New auth tests
- New tenant isolation tests
- New migration tests
- New API client tests
- New permission tests
- E2E/responsive smoke tests

---

## 9. Safe migration strategy

### 9.1 Goal

Preserve all existing invoices, customers, products, suppliers, purchases, payments, stock movements, sales returns, expenses, and settings while moving from local-only storage to multi-user cloud storage.

### 9.2 Recommended migration flow

1. **Do not delete local data first.**
2. Add `schemaVersion` to backup payload and storage metadata.
3. On app startup:
   - Read legacy localStorage snapshot.
   - If no auth session, keep running in local/offline mode.
4. On first successful login/registration:
   - Create or select business tenant.
   - Export current local snapshot as migration candidate.
   - Upload snapshot to backend in one transaction or batched writes.
   - Backend validates records and assigns tenant/user metadata.
   - Store migration marker locally, e.g. `vels_migration_v1_completed`.
5. After confirmed server persistence:
   - Keep local cache for offline use.
   - Mark legacy keys as migrated, not deleted.
6. Provide manual rollback:
   - Download pre-migration JSON backup.
   - Restore local snapshot if migration fails.

### 9.3 Conflict handling

- Use server timestamps and version numbers.
- For offline edits, queue mutations locally.
- On reconnect, replay queue with idempotency keys.
- If a record changed remotely, show conflict resolution or last-write-wins based on role.
- Never silently overwrite newer server data.

### 9.4 Invoice number preservation

- Preserve existing `invoiceNo` values exactly.
- If auto-numbering is enabled, initialize server sequence from max existing invoice number + 1.
- Do not renumber historical invoices.

### 9.5 Data validation

- Validate all imported records server-side.
- Reject invalid GSTIN, missing customer, invalid totals, or duplicate invoice numbers.
- Return a migration report with counts and errors.

### 9.6 Rollback

- Keep legacy localStorage keys until migration is explicitly confirmed.
- Keep downloadable pre-migration backup.
- Add a "reset migration marker" developer/admin option, not a normal user action.

---

## 10. Recommended target design

### 10.1 Recommended approach: managed backend + RLS

Use **Supabase** or **Firebase** to reduce infrastructure work, or a custom Node/Express + PostgreSQL backend if full control is required.

#### Option A — Supabase (recommended for fastest safe delivery)

- Supabase Auth for users.
- PostgreSQL with Row Level Security.
- One `businesses` table and membership table.
- All business tables include `business_id`.
- Frontend uses `@supabase/supabase-js`.
- Local cache + mutation queue for offline PWA.

#### Option B — Custom backend

- Node/Express or Fastify.
- PostgreSQL.
- JWT or session cookies.
- REST or tRPC API.
- Background sync worker.

### 10.2 Authorization model

Roles:

| Role | Capabilities |
|---|---|
| Owner | Full access, user management, settings, data reset, billing |
| Admin/Manager | Business settings, reports, cancellations, user invites |
| Cashier | Create/view invoices, customers, payments; no settings/reset |
| Accountant | Reports, invoices, payments; no catalog/settings changes |
| Viewer | Read-only reports and invoices |

Permission checks must be enforced **server-side**, not only in UI.

### 10.3 Database schema (recommended minimum)

Tables:

- `users`
- `businesses`
- `memberships` (`user_id`, `business_id`, `role`, `status`)
- `products`
- `customers`
- `suppliers`
- `invoices`
- `invoice_items`
- `purchases`
- `purchase_items`
- `payments`
- `stock_movements`
- `sales_returns`
- `expenses`
- `settings`
- `audit_events`
- `sync_mutations` or mutation queue metadata

Every business table should include:

- `id`
- `business_id`
- `created_at`
- `updated_at`
- `created_by`
- `updated_by`
- `version`

### 10.4 API design

Recommended endpoints:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/businesses`
- `POST /api/businesses`
- `GET /api/businesses/:id`
- `GET /api/products`
- `POST /api/products`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id`
- Equivalent CRUD for customers, suppliers, invoices, purchases, payments, expenses, settings.
- `POST /api/migrations/import-legacy`
- `GET /api/sync/pull`
- `POST /api/sync/push`

Use pagination for invoices, customers, products, and reports.

### 10.5 Frontend auth storage

- **Recommended:** httpOnly secure cookies via backend.
- **Acceptable for Supabase SPA:** Supabase session with refresh token, protected by HTTPS and CSP.
- **Avoid:** Long-lived bearer tokens in `localStorage` for production multi-user.

### 10.6 Offline strategy

- Keep IndexedDB as local cache.
- Queue mutations with idempotency keys.
- Show sync status in UI.
- Block destructive operations if sync is critically stale, or allow with clear warning.
- Preserve invoice creation offline; sync later.

---

## 11. Required environment variables and deployment config

No secret values are included here. Use placeholders in `.env.example`.

### 11.1 Frontend variables

```env
VITE_API_URL=http://localhost:5000
VITE_MASTER_ADMIN_API_URL=http://localhost:5000

# If using Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# If using custom backend
VITE_APP_ENV=development
```

### 11.2 Backend variables (if custom backend is added)

```env
DATABASE_URL=postgres://user:password@host:5432/vels_billing
JWT_SECRET=replace-with-strong-secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5175
PORT=5000
NODE_ENV=development
```

### 11.3 Deployment config

- Keep Netlify SPA fallback.
- Add API proxy or CORS allowlist.
- Ensure HTTPS in production.
- Add CSP headers to reduce XSS risk.
- Bump service worker cache version on data model changes.
- Do not deploy Master Admin with hardcoded credential hints.

---

## 12. Phased implementation plan

### Phase 0 — Baseline and audit (completed)

- Inspect architecture and data layer.
- Document findings.
- Keep 127 service tests as baseline.

### Phase 1 — Storage abstraction and IndexedDB

- Implement adapter interface.
- Add IndexedDB adapter.
- Migrate localStorage reads/writes behind adapter.
- Keep existing tests passing.
- Add adapter unit tests.

**Exit criteria:** No direct `localStorage` access in billing domain code except adapter.

### Phase 2 — Auth and tenant model

- Add auth types.
- Implement login/signup/session bootstrap.
- Add business selection/creation.
- Add role/permission helpers.
- Add route guards.

**Exit criteria:** Billing app cannot load business data without a valid session.

### Phase 3 — Backend integration

- Implement or connect billing API.
- Add CRUD endpoints.
- Add server-side validation.
- Add tenant isolation via RLS or middleware.

**Exit criteria:** Two test users cannot see each other's invoices.

### Phase 4 — Legacy data migration

- Add migration endpoint/importer.
- Add client migration wizard.
- Preserve invoice numbers and settings.
- Add rollback.

**Exit criteria:** Existing local data imports successfully and reports match pre-migration totals.

### Phase 5 — Offline sync

- Add IndexedDB mutation queue.
- Add pull/push sync.
- Add conflict handling.
- Add sync status UI.

**Exit criteria:** Offline invoice creation syncs after reconnect without duplicates.

### Phase 6 — Authorization and admin hardening

- Enforce role permissions.
- Remove hardcoded admin credentials.
- Move admin token to secure storage.
- Code-split Master Admin.
- Add audit logs.

**Exit criteria:** Cashier cannot access settings/reset/cancellation.

### Phase 7 — QA and release

- Run full service suite.
- Add integration tests.
- Perform visual responsive QA.
- Validate migration with real data.

**Exit criteria:** All critical flows pass on mobile and desktop.

---

## 13. Regression test plan

### Existing tests that must remain green

- `money.test.ts`
- `invoice-engine.test.ts`
- `invoice-lines.test.ts`
- `payment.test.ts`
- `stock.test.ts`
- `mutations.test.ts`
- `customer-selection.test.ts`
- `customers.test.ts`
- `purchase-returns.test.ts`
- `report.test.ts`
- `reports-dash.test.ts`
- `reports-gst.test.ts`
- `reports-lists.test.ts`
- `reports-sales.test.ts`
- `profit.test.ts`
- `date.test.ts`
- `upgrade-services.test.ts`

### New tests required

1. **Storage adapter**
   - Read/write parity with legacy localStorage.
   - Transaction rollback.
   - IndexedDB fallback.

2. **Migration**
   - Legacy snapshot imports all slices.
   - Invoice numbers preserved.
   - Settings preserved.
   - Idempotent migration.
   - Failed migration leaves local data intact.

3. **Auth**
   - Login success/failure.
   - Session expiry.
   - Logout clears session.
   - Unauthorized API calls rejected.

4. **Tenant isolation**
   - User A cannot read User B invoices.
   - User A cannot modify User B products.
   - Settings are tenant-specific.

5. **Permissions**
   - Cashier cannot cancel invoice.
   - Cashier cannot reset data.
   - Viewer is read-only.

6. **Sync**
   - Offline create syncs once.
   - Duplicate replay does not duplicate invoice.
   - Conflict resolution preserves newer data.

7. **Backup compatibility**
   - Old backup JSON still imports.
   - New backup includes tenant metadata.

---

## 14. Responsive QA closure status

### 14.1 What is verified

- **Verified:** v1.1.0 mobile responsiveness code changes were implemented and TypeScript/build checks passed.
- **Verified:** `qa-results.json` exists and contains automated CDP measurements at 320, 375, 390, 430, 768, 1024, and 1440 px.
- **Verified:** Automated measurements show possible horizontal overflow in:
  - Dashboard at 320–430 px (`innerWidth 470/471` vs viewport).
  - Products at 320 px (`innerWidth 357` vs `320`).
  - Reports at all tested widths (offender counts 11–53).
  - Settings at several widths (offender counts 1–15).
  - Dashboard/Invoices/Products/Customers/Suppliers/Payments/Settings at 768 px (scroll width 822 vs 768).

### 14.2 What is not verified

- **Not verified:** Visual appearance, tap target usability, safe-area rendering on real devices, and whether overflow is user-visible or caused by absolutely positioned/off-screen elements.
- **Not verified:** iOS Safari, Android Chrome, and desktop browser behavior.
- **Not verified:** Print layout, barcode scanner, and modal ergonomics at each breakpoint.

### 14.3 Recommendation

Responsive QA is **not fully closed**. Before release:

1. Manually verify all views at 320, 375, 390, 430, 768, 1024, and 1440 px.
2. Investigate CDP overflow offenders, especially Reports and Settings.
3. Confirm no horizontal page scroll on the main app shell.
4. Re-run automated CDP after fixes.
5. Record final QA results in `CHANGELOG.md` or release notes.

---

## 15. Assumptions and unknowns

1. **Assumed:** The external Master Admin backend at `localhost:5000` exists and owns business-directory data.
2. **Assumed:** Backend database engine and schema are unknown because no server code is in this repository.
3. **Assumed:** Offline-first PWA behavior should remain a product requirement.
4. **Assumed:** Multi-user means multiple authenticated users per business and potentially multiple devices, not just multiple browser profiles.
5. **Assumed:** Existing local data should be migrated, not discarded.
6. **Assumed:** A managed backend such as Supabase/Firebase is acceptable unless the project requires self-hosted infrastructure.

---

## 16. Immediate next steps

1. This audit document is complete.
2. Decide backend strategy: Supabase/Firebase vs custom Node/Express + PostgreSQL.
3. Implement Phase 1 storage abstraction without changing UI behavior.
4. Add auth and tenant model.
5. Build legacy migration importer.
6. Complete responsive visual QA before v1.1.0 release.
7. Keep all 127 existing service tests green throughout.

---

## 17. Non-goals for this audit

This audit did not:
- Modify application code.
- Implement multi-user support.
- Change database or backend.
- Run the full test suite.
- Perform visual browser QA.
- Store or expose secrets.

