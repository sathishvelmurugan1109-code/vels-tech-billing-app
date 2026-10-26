// src/services/authService.ts — Authentication service for the billing app.
// Uses the existing backend authentication API (POST /api/auth/login).
// Session token is stored in localStorage following the existing architecture.
// Passwords are never stored in localStorage or sessionStorage.

import type { LoginCredentials, LoginResponse, User } from "../types/auth";

// API base URL — use VITE_API_URL for your environment.
// Development (desktop): VITE_API_URL=http://localhost:5000
// Development (mobile): VITE_API_URL=http://YOUR_LAN_IP:5000
// Production: VITE_API_URL=https://api.your-domain.com
const API_BASE =
  (import.meta as any)?.env?.VITE_API_URL || "http://localhost:5000";

const TOKEN_KEY = "vels_billing_token";

// In-memory fallback for non-browser environments (tests, SSR, etc.)
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

class AuthService {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    this.restoreSession();
  }

  private restoreSession(): void {
    this.token = storageGetItem(TOKEN_KEY);
  }

  getToken(): string | null {
    return this.token;
  }

  isAuthenticated(): boolean {
    return !!this.token;
  }

  getUser(): User | null {
    return this.user;
  }

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const email = credentials.email.trim().toLowerCase();

    // Client-side validation: never send empty credentials
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

      // Store session token (never the password)
      storageSetItem(TOKEN_KEY, token);

      return { token, user };
    } catch (err: any) {
      // Network errors (fetch throws TypeError)
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
    storageRemoveItem(TOKEN_KEY);
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
      if (data?.user) {
        this.user = data.user;
      }
      return true;
    } catch {
      // Network error — do NOT treat as successful authentication
      return false;
    }
  }
}

export const authService = new AuthService();