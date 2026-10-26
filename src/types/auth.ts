// src/types/auth.ts — Authentication types for the billing app.

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "owner" | "manager" | "cashier" | "accountant" | "viewer";
  businessId: string;
  businessName: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}