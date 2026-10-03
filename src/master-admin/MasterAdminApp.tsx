import { useEffect, useState } from "react";
import { Building2, Users, UserCheck, UserX, Store } from "lucide-react";
import { api, authToken, type Business, type Stats } from "./api";
import Login from "./pages/Login";
import Charts from "./pages/Charts";
import Members from "./pages/Members";

export const PURPLE = "#8b5cf6";
export const EMERALD = "#10b981";

function StatCard({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${accent}22`, color: accent }}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-extrabold text-white">{value}</div>
          <div className="text-xs text-slate-400">{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function MasterAdminApp() {
  const [authed, setAuthed] = useState(!!authToken());
  const [stats, setStats] = useState<Stats | null>(null);

  async function loadStats() {
    try { setStats(await api.stats()); } catch { /* 401 -> login view */ setStats(null); }
  }
  useEffect(() => { if (authed) loadStats(); }, [authed]);

  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-[#070b16] text-slate-200">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#070b16]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 font-extrabold text-white">V</div>
            <div className="leading-tight">
              <div className="font-extrabold text-white">VELS TECH</div>
              <div className="text-[10px] tracking-widest text-slate-400">MASTER ADMIN • VEPPUR</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="flex h-9 items-center gap-2 rounded-xl border border-white/10 px-3 text-xs text-slate-300 hover:bg-white/5">
              <Store className="h-4 w-4" /> Billing
            </a>
            <button onClick={() => { localStorage.removeItem("vels_admin_token"); setAuthed(false); }}
              className="h-9 rounded-xl border border-white/10 px-3 text-xs text-slate-300 hover:bg-white/5">Sign out</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={Building2} label="Total Business Members" value={stats?.totalBusinesses ?? "—"} accent={PURPLE} />
          <StatCard icon={UserCheck} label="Active Members" value={stats?.activeBusinesses ?? "—"} accent={EMERALD} />
          <StatCard icon={UserX} label="Inactive Members" value={stats?.inactiveBusinesses ?? "—"} accent="#f59e0b" />
          <StatCard icon={Users} label="New Registrations (month)" value={stats?.newThisMonth ?? "—"} accent="#38bdf8" />
        </div>
        <Charts stats={stats} />
        <Members onChanged={loadStats} />
      </main>
    </div>
  );
}
