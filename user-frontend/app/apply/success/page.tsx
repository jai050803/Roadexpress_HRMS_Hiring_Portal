"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, CheckCircle2, Copy, ExternalLink, Loader2 } from "lucide-react";

function ApplySuccessContent() {
  const searchParams = useSearchParams();
  const refNumber = searchParams.get("ref");
  const jobTitle = searchParams.get("title") || "Selected Role";
  const email = searchParams.get("email") || "";

  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (refNumber) {
      navigator.clipboard.writeText(refNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-10 shadow-sm">
      {/* Success Icon */}
      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-sm">
        <CheckCircle2 className="w-9 h-9" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
        Application Submitted Successfully
      </h1>
      <p className="text-sm text-slate-600 mb-6">
        Your application for <strong className="text-slate-800">{jobTitle}</strong> has been received by our talent acquisition team.
      </p>

      {/* Reference Number Card */}
      {refNumber ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 text-left">
          <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 block mb-1">
            Your Application Reference Number
          </span>
          <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3">
            <span className="text-lg sm:text-xl font-mono font-bold text-blue-700 tracking-wide select-all">
              {refNumber}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Please save this reference number. You will need it together with your email (<strong>{email || "your email"}</strong>) to track your review progress.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-slate-100 rounded-lg text-xs text-slate-600 mb-6">
          If you have submitted an application, check your inbox for your confirmation email and reference code.
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {refNumber && (
          <Link
            href={`/track?email=${encodeURIComponent(email)}&ref=${encodeURIComponent(refNumber)}`}
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-sm inline-flex items-center justify-center gap-2"
          >
            <span>Track Application Status</span>
            <ExternalLink className="w-4 h-4" />
          </Link>
        )}

        <Link
          href="/jobs"
          className="px-6 py-3 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition"
        >
          Explore Other Roles
        </Link>
      </div>
    </div>
  );
}

export default function ApplySuccessPage() {
  return (
    <main className="max-w-xl mx-auto px-4 py-12 sm:py-16 text-center">
      <Suspense
        fallback={
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading confirmation...</p>
          </div>
        }
      >
        <ApplySuccessContent />
      </Suspense>
    </main>
  );
}
