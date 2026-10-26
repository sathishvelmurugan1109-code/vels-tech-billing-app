// src/pages/LoginPage.tsx — Responsive login page for the billing app.
// Features: email/password validation, show/hide password, loading state,
// duplicate-submission prevention, Enter-to-submit, mobile/tablet/desktop responsive.
import { useState, useCallback, useRef } from "react";
import { Eye, EyeOff, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";
import { authService } from "../services/authService";

export default function LoginPage({
  onLoginSuccess,
}: {
  onLoginSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const submitting = useRef(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submitting.current) return;
      setError("");

      const normalizedEmail = email.trim();
      if (!normalizedEmail || !password) {
        setError("Email and password are required.");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        setError("Please enter a valid email address.");
        return;
      }

      submitting.current = true;
      setLoading(true);

      try {
        await authService.login({ email: normalizedEmail, password });
        onLoginSuccess();
      } catch (err: any) {
        setError(err.message || "Failed to sign in. Please try again.");
      } finally {
        submitting.current = false;
        setLoading(false);
      }
    },
    [email, password, onLoginSuccess],
  );

  return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
        <div className="w-full max-w-xl">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <img
              src="/images/vels-tech-logo.png"
              alt="VELS TECH official logo"
              className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12 md:h-14 md:w-14"
            />
            <div>
              <div className="font-extrabold text-white tracking-tight text-base sm:text-lg">
                VELS TECH
              </div>
              <div className="text-[10px] tracking-widest text-slate-400">
                BILLING • VEPPUR
              </div>
            </div>
          </div>

          {/* Heading + Subtitle */}
          <h1 className="mb-2 text-lg sm:text-xl font-bold text-white">
            Sign in
          </h1>
          <p className="mb-4 sm:mb-6 text-sm sm:text-base text-slate-400">
            Access your business dashboard
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@business.com"
                  className="pl-10 h-12 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-amber-500 placeholder-slate-500 disabled:opacity-70"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-sm font-medium text-slate-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-xs sm:text-sm text-slate-400 hover:text-amber-400 transition-colors disabled:opacity-50 h-9 px-2 rounded-lg flex-shrink-0"
                  disabled={loading}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete={showPassword ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 h-12 w-full rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-amber-500 placeholder-slate-500 disabled:opacity-70"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-amber-500 text-sm font-bold text-white hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="h-8 sm:h-12 lg:h-16"></div>
    </div>
  );
}