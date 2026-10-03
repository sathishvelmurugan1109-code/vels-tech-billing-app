import { useEffect, useRef, useState } from "react";
import { Search, Download, Power, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { api, type Business } from "../api";
import Detail from "./Detail";

const PAGE_SIZE = 20;

export default function Members({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<Business[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<Business | null>(null);
  const firstLoad = useRef(true);

  async function load(p: number, query: string, st: string) {
    try {
      const b = await api.businesses({ q: query, status: st, page: p, limit: PAGE_SIZE });
      setRows(b.items);
      setTotal(b.total);
      setPages(b.pages);
      setPage(b.page);
    } catch { /* 401 handled centrally */ }
  }

  // debounced search / filter -> back to page 1 (skipped on first mount)
  useEffect(() => {
    if (firstLoad.current) return;
    const t = setTimeout(() => {
      if (page === 1) load(1, q, status);
      else setPage(1);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  // page navigation + first mount
  useEffect(() => {
    firstLoad.current = false;
    load(page, q, status);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(b: Business) {
    const next = b.status === "active" ? "inactive" : "active";
    if (!confirm(`${next === "active" ? "Activate" : "Deactivate"} ${b.businessName}?`)) return;
    await api.setStatus(b._id, next);
    load(page, q, status);
    onChanged();
  }

  function exportCsv() {
    const token = localStorage.getItem("vels_admin_token");
    const base = (import.meta as any).env?.VITE_API_URL || "http://localhost:5000";
    fetch(`${base}/api/businesses/export/csv`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (r) => {
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "vels-businesses.csv";
      a.click();
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search business, phone, email, ID..."
            className="h-10 w-full rounded-xl border border-white/10 bg-black/40 pl-9 pr-3 text-sm text-white outline-none focus:border-violet-500" />
        </div>
        <div className="flex gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none">
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button onClick={exportCsv} className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-500">
            <Download className="h-4 w-4" /> CSV
          </button>
        </div>
      </div>
      <div className="mt-2 text-xs text-slate-500">{total} businesses</div>
      <div className="mt-2 max-h-[440px] overflow-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[780px] text-xs">
          <thead className="sticky top-0 bg-[#0b1120] text-slate-400">
            <tr>
              <th className="px-3 py-2 text-left">BUSINESS</th>
              <th className="px-3 py-2 text-left">CONTACT</th>
              <th className="px-3 py-2 text-left">DATES</th>
              <th className="px-3 py-2 text-left">STATUS</th>
              <th className="px-3 py-2 text-right">USAGE</th>
              <th className="px-3 py-2 text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b._id} className="border-t border-white/5 hover:bg-white/[0.03]">
                <td className="px-3 py-2">
                  <div className="font-bold text-white">{b.businessName}</div>
                  <div className="text-slate-500">{b.businessId} • {b.ownerName} • {b.plan}</div>
                </td>
                <td className="px-3 py-2">{b.phone}<br /><span className="text-slate-500">{b.email}</span></td>
                <td className="px-3 py-2">Reg: {new Date(b.registeredAt).toLocaleDateString()}<br />
                  <span className="text-slate-500">Active: {new Date(b.lastActiveAt).toLocaleDateString()}</span></td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 font-bold ${b.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                    {b.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-slate-300">
                  {b.usage.invoices} inv • {b.usage.products} prod • {b.usage.customers} cust
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <button onClick={async () => { const d = await api.business(b._id); setSelected(d.business); }}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 hover:bg-white/10"><Eye className="h-4 w-4" /></button>
                    <button onClick={() => toggle(b)}
                      className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 hover:bg-white/10"><Power className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <div>Page {page} of {pages}</div>
        <div className="flex gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="flex h-9 items-center gap-1 rounded-xl border border-white/10 px-3 disabled:opacity-40 hover:bg-white/5">
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)}
            className="flex h-9 items-center gap-1 rounded-xl border border-white/10 px-3 disabled:opacity-40 hover:bg-white/5">
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      {selected && (
        <Detail b={selected} onClose={() => setSelected(null)} onToggle={() => toggle(selected)} />
      )}
    </div>
  );
}
