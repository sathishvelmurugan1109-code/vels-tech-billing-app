export type Business = {
  _id: string;
  businessId: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string;
  plan: "Free" | "Pro" | "Enterprise";
  status: "active" | "inactive";
  registeredAt: string;
  lastActiveAt: string;
  lastLoginAt?: string;
  usage: { invoices: number; products: number; customers: number };
};

export type Stats = {
  totalBusinesses: number;
  activeBusinesses: number;
  inactiveBusinesses: number;
  newThisMonth: number;
  totalInvoices: number;
  totalProducts: number;
  totalCustomers: number;
  activeLast24h: number;
  planBreakup: { plan: string; count: number }[];
  dailyRegistrations: { date: string; count: number }[];
  monthlyGrowth: { month: string; count: number }[];
};

const API = (import.meta as any).env?.VITE_API_URL || "http://localhost:5000";

function headers() {
  const token = localStorage.getItem("vels_admin_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function req(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, { ...init, headers: { ...headers(), ...(init?.headers || {}) } });
  if (res.status === 401) {
    localStorage.removeItem("vels_admin_token");
    if (!location.pathname.startsWith("/master-admin")) location.href = "/master-admin";
    throw new Error("Unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

export const api = {
  login: (email: string, password: string) =>
    req("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  stats: (): Promise<Stats> => req("/api/stats").then((d) => d as Stats),
  businesses: (params: Record<string, string | number>): Promise<{ items: Business[]; total: number; page: number; pages: number }> => {
    const q = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    return req(`/api/businesses?${q}`);
  },
  business: (id: string): Promise<{ business: Business }> => req(`/api/businesses/${id}`),
  setStatus: (id: string, status: string) =>
    req(`/api/businesses/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  exportUrl: (q: string, status: string) =>
    `${API}/api/businesses/export/csv?q=${encodeURIComponent(q)}&status=${encodeURIComponent(status)}`,
};

export function authToken() {
  return localStorage.getItem("vels_admin_token");
}
