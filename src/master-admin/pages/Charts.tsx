import { FileText, Package, Users, TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import type { Stats } from "../api";
import { EMERALD, PURPLE } from "../MasterAdminApp";

function Mini({ icon: Icon, label, value, accent }: any) {
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

export default function Charts({ stats }: { stats: Stats | null }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Mini icon={FileText} label="Total Invoices Generated" value={stats?.totalInvoices ?? "—"} accent={PURPLE} />
        <Mini icon={Package} label="Products Added" value={stats?.totalProducts ?? "—"} accent={EMERALD} />
        <Mini icon={Users} label="Customers Managed" value={stats?.totalCustomers ?? "—"} accent="#38bdf8" />
        <Mini icon={TrendingUp} label="Active Last 24h" value={stats?.activeLast24h ?? "—"} accent="#f472b6" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 text-sm font-bold text-white">Daily new registrations (14 days)</div>
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={stats?.dailyRegistrations || []}>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0b1120", border: "1px solid #ffffff22", borderRadius: 12 }} />
                <Area dataKey="count" stroke={PURPLE} fill={`${PURPLE}44`} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-2 text-sm font-bold text-white">Monthly member growth</div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={stats?.monthlyGrowth || []}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0b1120", border: "1px solid #ffffff22", borderRadius: 12 }} />
                <Bar dataKey="count" fill={EMERALD} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-2 text-sm font-bold text-white">Active vs inactive businesses</div>
        <div className="h-56">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={[
                { name: "Active", value: stats?.activeBusinesses || 0 },
                { name: "Inactive", value: stats?.inactiveBusinesses || 0 },
              ]} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={4}>
                <Cell fill={EMERALD} /><Cell fill="#f59e0b" />
              </Pie>
              <Tooltip contentStyle={{ background: "#0b1120", border: "1px solid #ffffff22", borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}
