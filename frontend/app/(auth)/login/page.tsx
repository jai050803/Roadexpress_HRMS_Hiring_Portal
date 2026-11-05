"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Loader2, Lock, Mail, Shield } from "lucide-react";
import { loginHR } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get("from") || "/dashboard";
  const sessionExpired = searchParams.get("session_expired");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    sessionExpired ? "Your session has expired. Please log in again." : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await loginHR(email.trim(), password);
      // Hard navigate to dashboard so cookie is immediately picked up by server
      window.location.href = fromUrl;
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm">
        {/* Card Header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white font-extrabold text-base flex items-center justify-center mx-auto mb-2 shadow-sm">
            RE
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Road Express HRMS
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Internal Talent Acquisition & Pipeline Portal
          </p>
        </div>

        {/* Form Box */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          {error && (
            <div className="mb-4 p-3 rounded bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="admin@roadexpress.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-sans"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
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
                  className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:bg-slate-400 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security badge note */}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          <span>Restricted to authorized HR & Hiring Managers</span>
        </div>
      </div>
    </main>
  );
}
