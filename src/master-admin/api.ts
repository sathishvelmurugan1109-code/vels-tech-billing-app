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

const env = (import.meta as any).env || {};
const API = env.VITE_MASTER_ADMIN_API_URL || env.VITE_API_URL || "http://localhost:5000";

function headers() {
  const token = localStorage.getItem("vels_admin_token");
  return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function req(path: string, init?: RequestInit) {
  const method = init?.method || "GET";
  if (env.DEV) {
    console.log(`[MASTER ADMIN] API: ${API} | Endpoint: ${path} | Method: ${method}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: { ...headers(), ...(init?.headers || {}) },
    });
  } catch (err: any) {
    console.error(`[MASTER ADMIN Network Error] Endpoint: ${path}`, err);
    throw new Error("Unable to connect to Master Admin server.");
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    if (!path.includes("/auth/login")) {
      localStorage.removeItem("vels_admin_token");
      if (!location.pathname.startsWith("/master-admin")) location.href = "/master-admin";
    }
    throw new Error(data.message || "Invalid email or password.");
  }

  if (res.status === 403) {
    throw new Error(data.message || "Admin access denied.");
  }

  if (res.status === 503 || (typeof data.message === "string" && data.message.toLowerCase().includes("database"))) {
    throw new Error("Master Admin database is unavailable.");
  }

  if (res.status >= 500) {
    throw new Error("Master Admin server error.");
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed with status ${res.status}`);
  }

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
