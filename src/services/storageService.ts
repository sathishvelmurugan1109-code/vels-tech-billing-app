/**
 * storageService.ts — Transactional Storage, Safe Migrations & Complete Backup/Restore (PHASES 22 + 23).
 */

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
} from "../types";

export const STORAGE_KEYS = {
  PRODUCTS: "vels_products",
  CUSTOMERS: "vels_customers",
  INVOICES: "vels_invoices",
  SETTINGS: "vels_settings",
  SUPPLIERS: "vels_suppliers",
  PURCHASES: "vels_purchases",
  PAYMENTS: "vels_payments",
  STOCK_MOVEMENTS: "vels_stock_movements",
  SALES_RETURNS: "vels_sales_returns",
  EXPENSES: "vels_expenses",
  LAST_BACKUP: "vels_last_backup_date",
} as const;

export type FullBackupPayload = {
  version: number;
  timestamp: string;
  appName: string;
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  invoices: Invoice[];
  purchases: Purchase[];
  payments: Payment[];
  stockMovements: StockMovement[];
  salesReturns: SalesReturn[];
  expenses: Expense[];
  settings: CompanySettings;
};

// In-memory fallback for non-browser or test execution
const memoryStorage = new Map<string, string>();

function getStorageBackend() {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  return {
    getItem: (k: string) => memoryStorage.get(k) ?? null,
    setItem: (k: string, v: string) => { memoryStorage.set(k, v); },
    removeItem: (k: string) => { memoryStorage.delete(k); },
  };
}

/**
 * Safe JSON parser with fallback.
 */
export function safeGetStorage<T>(key: string, fallback: T): T {
  try {
    const s = getStorageBackend().getItem(key);
    if (!s) return fallback;
    return JSON.parse(s) as T;
  } catch (err) {
    console.error(`Failed to read from localStorage key "${key}":`, err);
    return fallback;
  }
}

/**
 * Safe single key persistence with error catching.
 */
export function safeSetStorage<T>(key: string, value: T): boolean {
  try {
    getStorageBackend().setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.error(`Failed to write to localStorage key "${key}":`, err);
    return false;
  }
}

/**
 * Transaction-style atomic update across multiple keys.
 * If any write fails (e.g. QuotaExceededError), all keys roll back to their previous states.
 */
export function transactionalStorageUpdate(entries: Array<{ key: string; value: unknown }>): boolean {
  const backend = getStorageBackend();
  const previousSnapshots = entries.map(({ key }) => ({
    key,
    val: backend.getItem(key),
  }));

  try {
    for (const { key, value } of entries) {
      backend.setItem(key, JSON.stringify(value));
    }
    return true;
  } catch (err) {
    console.error("Storage transaction failed, rolling back changes:", err);
    // Rollback
    for (const { key, val } of previousSnapshots) {
      try {
        if (val === null) backend.removeItem(key);
        else backend.setItem(key, val);
      } catch (rollbackErr) {
        console.error(`Critical: rollback failed for key "${key}":`, rollbackErr);
      }
    }
    return false;
  }
}

/**
 * Generates a full system backup object.
 */
export function createFullBackup(data: {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  invoices: Invoice[];
  purchases: Purchase[];
  payments: Payment[];
  stockMovements: StockMovement[];
  salesReturns: SalesReturn[];
  expenses: Expense[];
  settings: CompanySettings;
}): FullBackupPayload {
  const now = new Date().toISOString();
  getStorageBackend().setItem(STORAGE_KEYS.LAST_BACKUP, now);

  return {
    version: 2,
    timestamp: now,
    appName: "VELS TECH Billing",
    products: data.products || [],
    customers: data.customers || [],
    suppliers: data.suppliers || [],
    invoices: data.invoices || [],
    purchases: data.purchases || [],
    payments: data.payments || [],
    stockMovements: data.stockMovements || [],
    salesReturns: data.salesReturns || [],
    expenses: data.expenses || [],
    settings: data.settings,
  };
}

/**
 * Safely downloads a backup payload as an actual .json file.
 * Uses application/json;charset=utf-8 MIME type and browser Blob download pattern.
 * Prevents navigation, inline rendering, or opening in a new tab.
 */
export function downloadBackupFile(backupData: FullBackupPayload): { ok: boolean; error?: string } {
  try {
    const json = JSON.stringify(backupData, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });

    if (typeof window === "undefined" || !document || !document.createElement) {
      return { ok: true };
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.style.display = "none";
    anchor.style.position = "fixed";
    anchor.style.left = "-9999px";
    anchor.href = url;

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `vels-tech-backup-${dateStr}.json`;
    anchor.href = url;
    anchor.setAttribute("download", filename);
    anchor.download = filename;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // cleanup safe
      }
    }, 1000);

    return { ok: true };
  } catch (err: any) {
    console.error("Backup download error:", err);
    return { ok: false, error: err?.message || "Failed to download backup" };
  }
}

/**
 * Validates and imports a full backup file.
 */
export function validateAndRestoreBackup(
  jsonText: string,
  onSuccess: (data: FullBackupPayload) => void,
): { ok: boolean; error?: string } {
  try {
    const parsed: unknown = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, error: "Invalid backup file: not a JSON object." };
    }

    const payload = parsed as Record<string, unknown>;

    // Core validation: products, customers, invoices must exist as arrays
    if (!Array.isArray(payload.products)) {
      return { ok: false, error: "Backup is missing a valid products list." };
    }
    if (!Array.isArray(payload.customers)) {
      return { ok: false, error: "Backup is missing a valid customers list." };
    }
    if (!Array.isArray(payload.invoices)) {
      return { ok: false, error: "Backup is missing a valid invoices list." };
    }

    const fullPayload: FullBackupPayload = {
      version: Number(payload.version) || 2,
      timestamp: String(payload.timestamp || new Date().toISOString()),
      appName: String(payload.appName || "VELS TECH Billing"),
      products: payload.products as Product[],
      customers: payload.customers as Customer[],
      suppliers: Array.isArray(payload.suppliers) ? (payload.suppliers as Supplier[]) : [],
      invoices: payload.invoices as Invoice[],
      purchases: Array.isArray(payload.purchases) ? (payload.purchases as Purchase[]) : [],
      payments: Array.isArray(payload.payments) ? (payload.payments as Payment[]) : [],
      stockMovements: Array.isArray(payload.stockMovements)
        ? (payload.stockMovements as StockMovement[])
        : [],
      salesReturns: Array.isArray(payload.salesReturns) ? (payload.salesReturns as SalesReturn[]) : [],
      expenses: Array.isArray(payload.expenses) ? (payload.expenses as Expense[]) : [],
      settings: (payload.settings as CompanySettings) || {},
    };

    // Attempt transactional persistence
    const success = transactionalStorageUpdate([
      { key: STORAGE_KEYS.PRODUCTS, value: fullPayload.products },
      { key: STORAGE_KEYS.CUSTOMERS, value: fullPayload.customers },
      { key: STORAGE_KEYS.INVOICES, value: fullPayload.invoices },
      { key: STORAGE_KEYS.SETTINGS, value: fullPayload.settings },
      { key: STORAGE_KEYS.SUPPLIERS, value: fullPayload.suppliers },
      { key: STORAGE_KEYS.PURCHASES, value: fullPayload.purchases },
      { key: STORAGE_KEYS.PAYMENTS, value: fullPayload.payments },
      { key: STORAGE_KEYS.STOCK_MOVEMENTS, value: fullPayload.stockMovements },
      { key: STORAGE_KEYS.SALES_RETURNS, value: fullPayload.salesReturns },
      { key: STORAGE_KEYS.EXPENSES, value: fullPayload.expenses },
    ]);

    if (!success) {
      return { ok: false, error: "Failed to persist restored data to storage." };
    }

    onSuccess(fullPayload);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to parse backup JSON.",
    };
  }
}
