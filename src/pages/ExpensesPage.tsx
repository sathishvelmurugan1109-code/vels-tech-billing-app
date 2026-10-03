import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  DollarSign,
  Edit3,
  Trash2,
  Calendar,
  Filter,
  TrendingDown,
  PieChart as PieIcon,
} from "lucide-react";
import { formatCurrency, addMoney } from "../services/money";
import { summarizeExpensesByCategory, EXPENSE_CATEGORIES } from "../services/expenseService";
import type { Expense } from "../types";

export interface ExpensesPageProps {
  expenses: Expense[];
  onAddExpense: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
}

export function ExpensesPage({
  expenses,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}: ExpensesPageProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  const filteredExpenses = useMemo(() => {
    return (expenses || [])
      .filter((e) => {
        if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
        if (dateFilter && e.date !== dateFilter) return false;
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          e.description.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          (e.reference && e.reference.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, search, categoryFilter, dateFilter]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((s, e) => addMoney(s, e.amount), 0);
  }, [filteredExpenses]);

  const categoryBreakdown = useMemo(() => {
    return summarizeExpensesByCategory(expenses);
  }, [expenses]);

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-zinc-200 rounded-[22px] p-4 md:p-5 shadow-sm">
        <div>
          <div className="text-[12px] font-bold text-zinc-400 uppercase tracking-wider">
            Total Operating Expenses
          </div>
          <div className="text-[22px] md:text-[26px] font-extrabold text-orange-600 mono mt-0.5">
            {formatCurrency(totalAmount)}
          </div>
          <div className="text-[11px] text-zinc-500">
            {filteredExpenses.length} expense items recorded
          </div>
        </div>

        <button
          onClick={onAddExpense}
          className="h-11 px-5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-[13px] flex items-center justify-center gap-2 shadow-sm transition"
        >
          <Plus className="h-4 w-4" /> Record Expense
        </button>
      </div>

      {/* Category Pills Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categoryBreakdown.slice(0, 6).map((c) => (
            <div
              key={c.category}
              className="px-3.5 py-2 rounded-xl bg-white border border-zinc-200 shrink-0 text-[12px]"
            >
              <div className="text-zinc-500 font-medium">{c.category}</div>
              <div className="font-bold mono text-zinc-900 mt-0.5">{formatCurrency(c.amount)}</div>
              <div className="text-[10px] text-zinc-400">{c.percentage}% of total</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-2 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by description, reference, or category..."
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-zinc-200 bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-11 px-3 rounded-xl border border-zinc-200 bg-white text-[13px] font-medium"
          >
            <option value="all">All Categories</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-11 px-3 rounded-xl border border-zinc-200 bg-white text-[13px]"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter("")}
              className="h-11 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-[12px] font-semibold"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-[22px] bg-white border border-zinc-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-zinc-50 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 text-left">Category</th>
                <th className="px-4 py-3.5 text-left">Description</th>
                <th className="px-4 py-3.5 text-left">Date</th>
                <th className="px-4 py-3.5 text-left">Payment Mode</th>
                <th className="px-4 py-3.5 text-left">Reference / Notes</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-zinc-50/50 transition">
                  <td className="px-5 py-3.5">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 font-semibold text-zinc-900">{exp.description}</td>
                  <td className="px-4 py-3.5 text-zinc-600 mono">{exp.date}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 border text-zinc-700">
                      {exp.paymentMethod}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-zinc-500 text-[12px]">
                    {exp.reference && <span className="mono">{exp.reference} </span>}
                    {exp.notes && <span>{exp.notes}</span>}
                    {!exp.reference && !exp.notes && "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right font-extrabold mono text-[15px] text-zinc-900">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        title="Edit Expense"
                        onClick={() => onEditExpense(exp)}
                        className="h-8 w-8 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 grid place-items-center transition"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Delete Expense"
                        onClick={() => onDeleteExpense(exp)}
                        className="h-8 w-8 rounded-lg border border-zinc-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-zinc-400 grid place-items-center transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden divide-y divide-zinc-100">
          {filteredExpenses.map((exp) => (
            <div key={exp.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700">
                    {exp.category}
                  </span>
                  <div className="font-bold text-[14px] text-zinc-900 mt-1">{exp.description}</div>
                  <div className="text-[11px] text-zinc-500">
                    {exp.date} • {exp.paymentMethod}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-extrabold mono text-[16px] text-zinc-900">
                    {formatCurrency(exp.amount)}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => onEditExpense(exp)}
                  className="h-9 px-3 rounded-lg border border-zinc-200 text-zinc-700 text-[12px] font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDeleteExpense(exp)}
                  className="h-9 px-3 rounded-lg border border-zinc-200 text-red-600 text-[12px] font-medium"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredExpenses.length === 0 && (
          <div className="py-16 text-center text-zinc-400 text-[13px]">
            No expenses recorded. Click "Record Expense" to add operating costs.
          </div>
        )}
      </div>
    </div>
  );
}
