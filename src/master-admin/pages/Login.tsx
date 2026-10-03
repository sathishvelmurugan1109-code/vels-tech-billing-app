import { useState } from "react";
import { api } from "../api";

export default function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("admin@velstech.in");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    try {
      const d = await api.login(email, password);
      localStorage.setItem("vels_admin_token", d.token);
      onDone();
    } catch (e: any) {
      setErr(e.message);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#070b16] p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.05] p-8">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-600 font-extrabold text-white">V</div>
          <div>
            <div className="font-extrabold text-white">VELS TECH</div>
            <div className="text-[11px] tracking-widest text-slate-400">MASTER ADMIN • VEPPUR</div>
          </div>
        </div>
        <h1 className="mt-6 text-xl font-bold text-white">Owner sign in</h1>
        <p className="text-sm text-slate-400">Monitor every business using Vels Billing.</p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin email"
          className="mt-5 h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-violet-500" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password"
          className="mt-3 h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-violet-500" />
        {err && <div className="mt-3 text-xs text-red-400">{err}</div>}
        <button className="mt-5 h-11 w-full rounded-xl bg-violet-600 text-sm font-bold text-white hover:bg-violet-500">Sign in</button>
        <div className="mt-3 text-center text-[11px] text-slate-500">Default: admin@velstech.in / Admin@123</div>
      </form>
    </div>
  );
}
