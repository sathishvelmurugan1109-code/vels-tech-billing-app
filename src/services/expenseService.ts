/**
 * expenseService.ts — Expense Management & Net Profit Engine (PHASE 19).
 *
 * Responsibilities:
 *  - Expense categorisation & filtering
 *  - Aggregation by date range & category
 *  - Net profit calculation: Sales (net of GST) - Cost of Goods Sold - Expenses
 */

import { addMoney, roundMoney, subtractMoney, sumMoney, toNumber } from "./money";
import { DateRange, inRange } from "./dateService";
import type { Expense, ExpenseCategory } from "../types";

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  "Rent",
  "Electricity",
  "Salary",
  "Transport",
  "Maintenance",
  "Marketing",
  "Office Supplies",
  "Internet & Phone",
  "Tea & Snacks",
  "Other",
];

export type ExpenseFilter = {
  category?: string;
  search?: string;
  range?: DateRange | null;
  paymentMethod?: string;
};

/**
 * Filter expenses by category, search text, payment method, and date range.
 */
export function filterExpenses(expenses: Expense[], filter: ExpenseFilter = {}): Expense[] {
  return (expenses || []).filter((exp) => {
    if (filter.category && exp.category !== filter.category) return false;
    if (filter.paymentMethod && exp.paymentMethod !== filter.paymentMethod) return false;
    if (filter.range && !inRange(exp.date, filter.range)) return false;
    if (filter.search) {
      const q = filter.search.toLowerCase();
      const match =
        exp.description.toLowerCase().includes(q) ||
        exp.category.toLowerCase().includes(q) ||
        (exp.reference && exp.reference.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });
}

/**
 * Total expense amount for an array of expenses.
 */
export function sumExpenses(expenses: Expense[]): number {
  return sumMoney((expenses || []).map((e) => e.amount));
}

export type CategoryExpenseSummary = {
  category: ExpenseCategory;
  amount: number;
  count: number;
  percentage: number;
};

/**
 * Group expenses by category with totals and percentage of total expenses.
 */
export function summarizeExpensesByCategory(expenses: Expense[]): CategoryExpenseSummary[] {
  const total = sumExpenses(expenses);
  const byCat = new Map<ExpenseCategory, { amount: number; count: number }>();

  (expenses || []).forEach((e) => {
    const existing = byCat.get(e.category) || { amount: 0, count: 0 };
    byCat.set(e.category, {
      amount: addMoney(existing.amount, e.amount),
      count: existing.count + 1,
    });
  });

  return Array.from(byCat.entries())
    .map(([category, { amount, count }]) => ({
      category,
      amount,
      count,
      percentage: total > 0 ? roundMoney((amount / total) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export type NetProfitSummary = {
  revenue: number; // Taxable sales (net of GST)
  costOfGoodsSold: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  grossMarginPct: number;
  netMarginPct: number;
  hasSufficientCostData: boolean;
};

/**
 * Calculates Net Profit = Gross Profit - Operating Expenses.
 * Gross Profit = Taxable Revenue - Cost of Goods Sold.
 * Returns honest metrics only when cost and/or expense data exists.
 */
export function calculateNetProfitSummary(
  revenue: number,
  costOfGoodsSold: number,
  expenses: number,
  hasCostData = true,
): NetProfitSummary {
  const safeRev = Math.max(0, roundMoney(revenue));
  const safeCost = Math.max(0, roundMoney(costOfGoodsSold));
  const safeExp = Math.max(0, roundMoney(expenses));

  const grossProfit = hasCostData ? subtractMoney(safeRev, safeCost) : 0;
  const netProfit = hasCostData
    ? subtractMoney(grossProfit, safeExp)
    : subtractMoney(safeRev, safeExp);

  const grossMarginPct = safeRev > 0 && hasCostData ? roundMoney((grossProfit / safeRev) * 100) : 0;
  const netMarginPct = safeRev > 0 ? roundMoney((netProfit / safeRev) * 100) : 0;

  return {
    revenue: safeRev,
    costOfGoodsSold: safeCost,
    grossProfit,
    expenses: safeExp,
    netProfit,
    grossMarginPct,
    netMarginPct,
    hasSufficientCostData: hasCostData,
  };
}
