"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Check, CheckCircle, Copy, ExternalLink, Loader2 } from "lucide-react";

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
    <div className="bg-white rounded-md border border-slate-200/90 p-8 shadow-2xs">
      {/* Success Icon */}
      <div className="w-12 h-12 rounded-full bg-slate-100 text-signal-published flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-6 h-6" />
      </div>

      <h1 className="text-xl font-semibold text-slate-950 tracking-tight mb-1.5">
        Application submitted
      </h1>
      <p className="text-xs text-slate-600 mb-6">
        Your application for <strong className="text-slate-900">{jobTitle}</strong> has been received by our talent acquisition team.
      </p>

      {/* Reference Number Card */}
      {refNumber ? (
        <div className="bg-slate-50/70 border border-slate-200/80 rounded-md p-4 mb-6 text-left">
          <span className="text-xs text-slate-500 block mb-1">
            Application reference number
          </span>
          <div className="flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-md px-3.5 py-2">
            <span className="text-base font-tabular font-medium text-slate-950 select-all">
              {refNumber}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-signal-published" />
                  <span>Copied</span>
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
            Retain this reference code. Together with your email (<strong>{email || "your email"}</strong>), you can track review updates in real time.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-slate-50 rounded-md text-xs text-slate-600 mb-6">
          Your application has been logged. Please check your email for confirmation and reference code.
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
        {refNumber && (
          <Link
            href={`/track?email=${encodeURIComponent(email)}&ref=${encodeURIComponent(refNumber)}`}
            className="px-5 py-2.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs inline-flex items-center justify-center gap-1.5"
          >
            <span>Track application status</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}

        <Link
          href="/jobs"
          className="px-5 py-2.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium text-xs transition"
        >
          Explore other roles
        </Link>
      </div>
    </div>
  );
}

export default function ApplySuccessPage() {
  return (
    <main className="max-w-lg mx-auto px-4 py-12 sm:py-16 text-center">
      <Suspense
        fallback={
          <div className="py-16 text-center">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading confirmation...</p>
          </div>
        }
      >
        <ApplySuccessContent />
      </Suspense>
    </main>
  );
}
