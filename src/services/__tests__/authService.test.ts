// @ts-nocheck
// src/services/__tests__/authService.test.ts — Authentication service tests.
// Uses Node's built-in test runner (node:test), matching the existing test suite.
import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { authService } from "../authService";

// Mock localStorage for Node.js test environment
const memoryStore = new Map();
globalThis.localStorage = {
  getItem: (k) => memoryStore.get(k) ?? null,
  setItem: (k, v) => memoryStore.set(k, v),
  removeItem: (k) => memoryStore.delete(k),
};

// Mock fetch globally
const originalFetch = globalThis.fetch;
let fetchMock = null;

function setFetchMock(mock) {
  fetchMock = mock;
  globalThis.fetch = mock;
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
  fetchMock = null;
}

function cleanup() {
  restoreFetch();
  authService.logout();
  try { localStorage.removeItem("vels_billing_token"); } catch {}
}

function mockJsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("authService — validation", () => {
  it("rejects empty email", async () => {
    await assert.rejects(
      authService.login({ email: "", password: "Secret123" }),
      /Email and password are required/,
    );
    cleanup();
  });

  it("rejects empty password", async () => {
    await assert.rejects(
      authService.login({ email: "user@example.com", password: "" }),
      /Email and password are required/,
    );
    cleanup();
  });

  it("rejects invalid email format", async () => {
    await assert.rejects(
      authService.login({ email: "not-an-email", password: "Secret123" }),
      /valid email address/,
    );
    cleanup();
  });
});

describe("authService — login success", () => {
  it("authenticates valid credentials and stores token", async () => {
    setFetchMock(async () => mockJsonResponse(200, { token: "abc123", user: { id: "u1", email: "user@example.com", name: "User", role: "owner", businessId: "b1", businessName: "Vels Tech" } }));

    const res = await authService.login({ email: "user@example.com", password: "Secret123" });

    assert.equal(res.token, "abc123");
    assert.equal(authService.getToken(), "abc123");
    assert.ok(authService.isAuthenticated());
    assert.equal(localStorage.getItem("vels_billing_token"), "abc123");
    cleanup();
  });

  it("sends email and password to the login endpoint", async () => {
    let capturedBody = null;
    setFetchMock(async (url, init) => {
      capturedBody = JSON.parse(init.body);
      return mockJsonResponse(200, { token: "tok", user: { id: "u1", email: "user@example.com", name: "User", role: "owner", businessId: "b1", businessName: "Vels Tech" } });
    });

    await authService.login({ email: "user@example.com", password: "Secret123" });

    assert.equal(capturedBody.email, "user@example.com");
    assert.equal(capturedBody.password, "Secret123");
    cleanup();
  });

  it("trims and normalizes email before sending it", async () => {
    let capturedBody = null;
    setFetchMock(async (_url, init) => {
      capturedBody = JSON.parse(init.body);
      return mockJsonResponse(200, { token: "tok", user: { id: "u1", email: "user@example.com", name: "User", role: "owner", businessId: "b1", businessName: "Vels Tech" } });
    });

    await authService.login({ email: "  USER@EXAMPLE.COM  ", password: "Secret123" });

    assert.equal(capturedBody.email, "user@example.com");
    cleanup();
  });
});

describe("authService — login failure", () => {
  it("rejects invalid credentials (401)", async () => {
    setFetchMock(async () => mockJsonResponse(401, { message: "Invalid email or password." }));

    await assert.rejects(authService.login({ email: "user@example.com", password: "wrong" }), /Invalid email or password/);
    assert.ok(!authService.isAuthenticated());
    cleanup();
  });

  it("rejects disabled account (403)", async () => {
    setFetchMock(async () => mockJsonResponse(403, { message: "Account disabled or unauthorized." }));

    await assert.rejects(authService.login({ email: "user@example.com", password: "Secret123" }), /Account disabled/);
    assert.ok(!authService.isAuthenticated());
    cleanup();
  });

  it("handles server errors (500)", async () => {
    setFetchMock(async () => mockJsonResponse(500, { message: "Internal server error" }));

    await assert.rejects(authService.login({ email: "user@example.com", password: "Secret123" }), /server could not complete sign-in/);
    cleanup();
  });

  it("explains database unavailability (503)", async () => {
    setFetchMock(async () => mockJsonResponse(503, { message: "Authentication service is temporarily unavailable" }));

    await assert.rejects(
      authService.login({ email: "user@example.com", password: "Secret123" }),
      /cannot reach its database/,
    );
    cleanup();
  });

  it("handles network errors", async () => {
    setFetchMock(async () => {
      throw new TypeError("Failed to fetch");
    });

    await assert.rejects(authService.login({ email: "user@example.com", password: "Secret123" }), /Unable to connect/);
    cleanup();
  });
});

describe("authService — session management", () => {
  it("logout clears token and authentication state", async () => {
    setFetchMock(async () => mockJsonResponse(200, { token: "tok123", user: { id: "u1", email: "user@example.com", name: "User", role: "owner", businessId: "b1", businessName: "Vels Tech" } }));

    await authService.login({ email: "user@example.com", password: "Secret123" });
    assert.ok(authService.isAuthenticated());
    assert.equal(localStorage.getItem("vels_billing_token"), "tok123");

    authService.logout();
    assert.ok(!authService.isAuthenticated());
    assert.equal(authService.getToken(), null);
    assert.equal(localStorage.getItem("vels_billing_token"), null);
    cleanup();
  });

  it("restores session from localStorage on construction", () => {
    localStorage.setItem("vels_billing_token", "stored-token");
    const service2 = new (authService.constructor)();
    assert.ok(service2.isAuthenticated());
    assert.equal(service2.getToken(), "stored-token");
    service2.logout();
    cleanup();
  });
});

describe("authService — verifySession", () => {
  it("returns true when session verify succeeds", async () => {
    setFetchMock(async () => mockJsonResponse(200, { valid: true }));
    authService.token = "valid-token";
    const ok = await authService.verifySession();
    assert.ok(ok);
    cleanup();
  });

  it("logs out on 401 from verify endpoint", async () => {
    setFetchMock(async () => mockJsonResponse(401, { message: "Session expired" }));
    authService.token = "expired-token";
    const ok = await authService.verifySession();
    assert.ok(!ok);
    assert.ok(!authService.isAuthenticated());
    cleanup();
  });
});