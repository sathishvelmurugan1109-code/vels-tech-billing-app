// src/services/apiService.ts — HTTP client for the billing backend API.
// Handles auth headers, JSON parsing, error handling, and base URL resolution.

import { authService } from "./authService";

// API base URL — use VITE_API_URL for your environment.
// Development (desktop): VITE_API_URL=http://localhost:5000
// Development (mobile): VITE_API_URL=http://YOUR_LAN_IP:5000
// Production: VITE_API_URL=https://api.your-domain.com
const getViteApiBase = (): string | undefined => {
  try {
    const meta = eval("import.meta") as any;
    return meta?.env?.VITE_API_URL;
  } catch {
    return undefined;
  }
};
const API_BASE = getViteApiBase() || "http://localhost:5000";

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
    throw new Error(msg);
  }

  return data as T;
}

export const api = {
  // Auth
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

  // Business
  getBusiness: () => request("/api/business/current"),
  updateBusiness: (data: any) =>
    request("/api/business/current", { method: "PUT", body: JSON.stringify(data) }),
  getSettings: () => request("/api/business/settings"),
  updateSettings: (data: any) =>
    request("/api/business/settings", { method: "PUT", body: JSON.stringify(data) }),

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
    create: (data: any) => request("/api/invoices", { method: "POST", body: JSON.stringify(data) }),
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