// src/services/apiService.ts — Enterprise HTTP Client for Multi-Tenant Billing API
import { authService } from "./authService";

declare const __VITE_API_URL__: string | undefined;

// API base URL resolution
const API_BASE =
  typeof __VITE_API_URL__ !== "undefined"
    ? __VITE_API_URL__
    : ((globalThis as any).process?.env?.VITE_API_URL as string) || "";

function getHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  const token = authService.getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function request<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: getHeaders((options.headers as Record<string, string>) || {}),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = data?.message || `Request failed (${res.status})`;
    const error: any = new Error(msg);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

export const api = {
  // Staff & Business Authentication (Login-free PIN Entry Flow)
  getBusinesses: () =>
    request<Array<{
      id: string;
      _id: string;
      businessId: string;
      businessName: string;
      location: string;
      logoText: string;
      invoicePrefix: string;
    }>>("/api/auth/businesses"),

  getBusinessStaff: (businessId: string) =>
    request<any[]>(`/api/auth/businesses/${businessId}/staff`),

  createStaffSession: (payload: { businessId: string; staffId: string; pin: string }) =>
    request<{ token: string; staff: any; business: any }>("/api/auth/staff-session", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Legacy / Master Admin Auth
  login: (email: string, password: string) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (payload: any) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  verify: () => request("/api/auth/verify"),

  logout: () => request("/api/auth/logout", { method: "POST" }),

  // Business Management
  getBusiness: () => request("/api/business/current"),
  updateBusiness: (data: any) =>
    request("/api/business/current", { method: "PUT", body: JSON.stringify(data) }),
  getSettings: () => request("/api/business/settings"),
  updateSettings: (data: any) =>
    request("/api/business/settings", { method: "PUT", body: JSON.stringify(data) }),
  listAllBusinesses: () => request<any[]>("/api/business/all"),
  createBusiness: (data: any) =>
    request("/api/business", { method: "POST", body: JSON.stringify(data) }),
  updateBusinessStatus: (id: string, status: string) =>
    request(`/api/business/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),

  // Staff Management
  staff: {
    list: () => request<any[]>("/api/staff"),
    get: (id: string) => request<any>(`/api/staff/${id}`),
    create: (data: any) => request("/api/staff", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/api/staff/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request(`/api/staff/${id}`, { method: "DELETE" }),
    resetPin: (id: string, newPin: string) =>
      request(`/api/staff/${id}/reset-pin`, { method: "POST", body: JSON.stringify({ newPin }) }),
    verifyPin: (pin: string, staffId?: string) =>
      request<{ valid: boolean; staff?: any }>("/api/staff/verify-pin", {
        method: "POST",
        body: JSON.stringify({ pin, staffId }),
      }),
  },

  // Generic CRUD helpers
  list: (resource: string) => request(`/${resource}`),
  get: (resource: string, id: string) => request(`/${resource}/${id}`),
  create: (resource: string, data: any) =>
    request(`/${resource}`, { method: "POST", body: JSON.stringify(data) }),
  update: (resource: string, id: string, data: any) =>
    request(`/${resource}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (resource: string, id: string) =>
    request(`/${resource}/${id}`, { method: "DELETE" }),

  // Resource-specific shortcuts
  products: {
    list: () => request("/api/products"),
    get: (id: string) => request(`/api/products/${id}`),
    create: (data: any) => request("/api/products", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request(`/api/products/${id}`, { method: "DELETE" }),
  },
  customers: {
    list: () => request("/api/customers"),
    get: (id: string) => request(`/api/customers/${id}`),
    create: (data: any) => request("/api/customers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/api/customers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request(`/api/customers/${id}`, { method: "DELETE" }),
  },
  suppliers: {
    list: () => request("/api/suppliers"),
    get: (id: string) => request(`/api/suppliers/${id}`),
    create: (data: any) => request("/api/suppliers", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/api/suppliers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request(`/api/suppliers/${id}`, { method: "DELETE" }),
  },
  invoices: {
    list: () => request("/api/invoices"),
    get: (id: string) => request(`/api/invoices/${id}`),
    nextNumber: () => request<{ invoiceNo: string; sequence: number }>("/api/invoices/next-number", { method: "POST" }),
    create: (data: any) => request("/api/invoices", { method: "POST", body: JSON.stringify(data) }),
    createDraft: (data: any) =>
      request("/api/invoices/drafts", { method: "POST", body: JSON.stringify(data) }),
    confirmManualPayment: (id: string) =>
      request(`/api/invoices/${id}/manual-payment`, { method: "POST", body: "{}" }),
    cancel: (id: string) =>
      request(`/api/invoices/${id}/cancel`, { method: "POST" }),
    update: (id: string, data: any) => request(`/api/invoices/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request(`/api/invoices/${id}`, { method: "DELETE" }),
  },
  purchases: {
    list: () => request("/api/purchases"),
    get: (id: string) => request(`/api/purchases/${id}`),
    create: (data: any) => request("/api/purchases", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/api/purchases/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request(`/api/purchases/${id}`, { method: "DELETE" }),
  },
  payments: {
    list: () => request("/api/payments"),
    get: (id: string) => request(`/api/payments/${id}`),
    create: (data: any) => request("/api/payments", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/api/payments/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request(`/api/payments/${id}`, { method: "DELETE" }),
  },
  expenses: {
    list: () => request("/api/expenses"),
    get: (id: string) => request(`/api/expenses/${id}`),
    create: (data: any) => request("/api/expenses", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/api/expenses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request(`/api/expenses/${id}`, { method: "DELETE" }),
  },
  stockMovements: {
    list: () => request("/api/stock-movements"),
    get: (id: string) => request(`/api/stock-movements/${id}`),
    create: (data: any) => request("/api/stock-movements", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => request(`/api/stock-movements/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    remove: (id: string) => request(`/api/stock-movements/${id}`, { method: "DELETE" }),
  },
};

export default api;
