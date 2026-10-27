// src/services/authService.ts — Enterprise Staff Session & Authentication Service
import type { LoginCredentials, LoginResponse, User } from "../types/auth";
import type { StaffMember } from "../types";

declare const __VITE_API_URL__: string | undefined;

const API_BASE =
  typeof __VITE_API_URL__ !== "undefined"
    ? __VITE_API_URL__
    : ((globalThis as any).process?.env?.VITE_API_URL as string) || "";

const TOKEN_KEY = "vels_billing_token";
const LAST_BIZ_KEY = "vels_last_business_id";
const CACHED_STAFF_KEY = "vels_cached_staff";
const CACHED_BIZ_KEY = "vels_cached_business";

// Memory storage fallback for Node.js test environment
const memoryStorage = new Map<string, string>();

function storageGetItem(key: string): string | null {
  if (typeof globalThis.localStorage !== "undefined") {
    return globalThis.localStorage.getItem(key);
  }
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage.getItem(key);
  }
  return memoryStorage.get(key) ?? null;
}

function storageSetItem(key: string, value: string): void {
  if (typeof globalThis.localStorage !== "undefined") {
    globalThis.localStorage.setItem(key, value);
  } else if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.setItem(key, value);
  } else {
    memoryStorage.set(key, value);
  }
}

function storageRemoveItem(key: string): void {
  if (typeof globalThis.localStorage !== "undefined") {
    globalThis.localStorage.removeItem(key);
  } else if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.removeItem(key);
  } else {
    memoryStorage.delete(key);
  }
}

export interface StaffSessionResponse {
  token: string;
  staff: StaffMember;
  business: {
    id: string;
    _id?: string;
    businessId: string;
    businessName: string;
    plan: string;
    status: string;
    settings?: any;
  };
}

class AuthService {
  private token: string | null = null;
  private user: User | null = null;
  private staff: StaffMember | null = null;
  private business: any = null;

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    this.token = storageGetItem(TOKEN_KEY);
    const cachedStaff = storageGetItem(CACHED_STAFF_KEY);
    if (cachedStaff) {
      try {
        this.staff = JSON.parse(cachedStaff);
      } catch {}
    }
    const cachedBiz = storageGetItem(CACHED_BIZ_KEY);
    if (cachedBiz) {
      try {
        this.business = JSON.parse(cachedBiz);
      } catch {}
    }
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string): void {
    this.token = token;
    storageSetItem(TOKEN_KEY, token);
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  getStaff(): StaffMember | null {
    return this.staff;
  }

  getBusiness(): any {
    return this.business;
  }

  getLastBusinessId(): string {
    return storageGetItem(LAST_BIZ_KEY) || "";
  }

  setLastBusinessId(id: string): void {
    if (id) {
      storageSetItem(LAST_BIZ_KEY, id);
    }
  }

  setSession(token: string, staff: StaffMember, business: any): void {
    this.token = token;
    this.staff = staff;
    this.business = business;
    storageSetItem(TOKEN_KEY, token);
    storageSetItem(CACHED_STAFF_KEY, JSON.stringify(staff));
    storageSetItem(CACHED_BIZ_KEY, JSON.stringify(business));
    if (business?.id || business?._id) {
      this.setLastBusinessId(business.id || business._id);
    }
  }

  // Staff Login via PIN Entry (No email/password required)
  async loginWithPin(businessId: string, staffId: string, pin: string): Promise<StaffSessionResponse> {
    if (!businessId || !staffId) {
      throw new Error("Please select both a business and a staff member.");
    }
    const cleanPin = String(pin).trim();
    if (!/^\d{4,6}$/.test(cleanPin)) {
      throw new Error("PIN must be 4 to 6 numeric digits.");
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/staff-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId, staffId, pin: cleanPin }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        throw new Error(data.message || "Account locked due to multiple failed attempts. Please try again later.");
      }

      if (res.status === 401) {
        throw new Error(data.message || "Invalid security PIN.");
      }

      if (!res.ok) {
        throw new Error(data.message || `PIN verification failed (Status ${res.status})`);
      }

      if (!data.token || !data.staff) {
        throw new Error("Server returned an invalid staff session.");
      }

      this.setSession(data.token, data.staff, data.business);
      return data as StaffSessionResponse;
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error("Unable to connect to billing server. Please verify network connection.");
      }
      throw err;
    }
  }

  // Legacy User Login (Email / Password for Master Admin)
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const email = credentials.email.trim().toLowerCase();

    if (!email || !credentials.password) {
      throw new Error("Email and password are required.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Please enter a valid email address.");
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: credentials.password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        throw new Error(data.message || "Invalid email or password.");
      }

      if (res.status === 403) {
        throw new Error(data.message || "Account disabled or unauthorized.");
      }

      if (res.status === 503) {
        throw new Error(
          "The login service cannot reach its database. Please try again later.",
        );
      }

      if (res.status >= 500) {
        throw new Error("The server could not complete sign-in. Please try again.");
      }

      if (!res.ok) {
        throw new Error(data.message || `Login failed (status ${res.status}).`);
      }

      const token = data.token;
      const user = data.user;
      if (
        typeof token !== "string" ||
        !user ||
        typeof user.id !== "string" ||
        typeof user.email !== "string" ||
        typeof user.role !== "string" ||
        typeof user.businessId !== "string"
      ) {
        throw new Error("Authentication failed: the server returned an invalid session.");
      }

      this.token = token;
      this.user = user;
      storageSetItem(TOKEN_KEY, token);

      return { token, user };
    } catch (err: any) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        throw new Error(
          "Unable to connect to the authentication server. Please check your network connection.",
        );
      }
      throw err;
    }
  }

  logout(): void {
    this.token = null;
    this.user = null;
    this.staff = null;
    this.business = null;
    storageRemoveItem(TOKEN_KEY);
    storageRemoveItem(CACHED_STAFF_KEY);
    storageRemoveItem(CACHED_BIZ_KEY);
  }

  async verifySession(): Promise<boolean> {
    if (!this.token) return false;
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify`, {
        headers: { Authorization: `Bearer ${this.token}` },
      });
      if (res.status === 401) {
        this.logout();
        return false;
      }
      if (!res.ok) {
        return false;
      }
      const data = await res.json().catch(() => ({}));
      if (data?.staff) {
        this.staff = data.staff;
        storageSetItem(CACHED_STAFF_KEY, JSON.stringify(data.staff));
      }
      if (data?.user) {
        this.user = data.user;
      }
      if (data?.business) {
        this.business = data.business;
        storageSetItem(CACHED_BIZ_KEY, JSON.stringify(data.business));
      }
      return true;
    } catch {
      return false;
    }
  }
}

export const authService = new AuthService();
