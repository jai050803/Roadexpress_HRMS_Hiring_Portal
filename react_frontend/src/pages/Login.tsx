import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AlertCircle, ArrowRight, Loader2, Lock, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "../integration/authIntegration";
import { loginHR } from "../lib/api";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const fromUrl = (location.state as any)?.from || "/dashboard";

  const [email, setEmail] = useState("admin@roadexpress.com");
  const [password, setPassword] = useState("Admin@123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await loginHR(email.trim(), password);
      if (res && (res as any).token && (res as any).user) {
        login((res as any).token, (res as any).user);
      }
      navigate(fromUrl, { replace: true });
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    setEmail("admin@roadexpress.com");
    setPassword("Admin@123456");
    setTimeout(() => {
      handleSubmit();
    }, 50);
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        {/* Card Header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-md bg-brand-500 text-white font-semibold text-sm flex items-center justify-center mx-auto mb-3 shadow-2xs">
            RF
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-950">
            Road Express Freight
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Talent acquisition & recruitment operations
          </p>
        </div>

        {/* Form Box */}
        <div className="bg-white rounded-md border border-slate-200/90 p-6 shadow-2xs space-y-4">
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-start gap-2.5 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-brand-500 mt-0.5" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Work email address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="admin@roadexpress.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-sans"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2 px-4 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in to HR portal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* 1-Click Demo Shortcut */}
          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              disabled={loading}
              className="w-full py-2 px-3 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>1-Click Demo Login (HR Admin)</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          Road Express Logistics &middot; Internal Talent Operations Platform
        </p>
      </div>
    </main>
  );
}
