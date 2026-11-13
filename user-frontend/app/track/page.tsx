"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Calendar, FileText, Loader2, Search } from "lucide-react";
import StatusTracker from "@/components/StatusTracker";
import { ApplicationTrackResponse, trackApplication } from "@/lib/api";

function TrackContent() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const initialRef = searchParams.get("ref") || "";

  const [email, setEmail] = useState(initialEmail);
  const [referenceNumber, setReferenceNumber] = useState(initialRef);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApplicationTrackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTrack = async (targetEmail: string, targetRef: string) => {
    if (!targetEmail.trim() || !targetRef.trim()) {
      setError("Please provide both your email address and reference number.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await trackApplication(targetEmail, targetRef);
      setResult(data);
    } catch (err: any) {
      setResult(null);
      if (err.status === 404) {
        setError(
          "No application found with these details. Please double-check your email and reference number."
        );
      } else {
        setError(err.message || "Unable to retrieve status. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialEmail && initialRef) {
      handleTrack(initialEmail, initialRef);
    }
  }, [initialEmail, initialRef]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleTrack(email, referenceNumber);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      {/* Back button */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to open roles
      </Link>

      {/* Query Card */}
      <div className="bg-white rounded-md border border-slate-200/90 p-6 sm:p-8 shadow-2xs">
        <h1 className="text-xl font-semibold text-slate-950 tracking-tight mb-1.5">
          Track application status
        </h1>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Enter your candidate email address and the application reference number provided during submission (e.g. <span className="font-tabular font-medium text-slate-800">APP-20261105-0042</span>).
        </p>

        {error && (
          <div className="mb-6 p-3 rounded-md bg-stone-50 border border-stone-200 flex items-start gap-2.5 text-stone-800 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-brand-500 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Email address <span className="text-brand-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="candidate@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Reference number <span className="text-brand-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="APP-YYYYMMDD-NNNN"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-tabular uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Checking status...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Check application status</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Result Display */}
      {result && (
        <div className="space-y-6">
          <div className="bg-white rounded-md border border-slate-200/90 p-6 shadow-2xs">
            <span className="text-xs text-slate-500 block mb-1">
              Application details
            </span>
            <h2 className="text-base font-semibold text-slate-950 mb-3">
              {result.job_title}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-600">
                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Reference: </span>
                <strong className="font-tabular font-medium text-slate-900">{result.reference_number}</strong>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Submitted: </span>
                <strong className="text-slate-900 font-tabular font-medium">{formatDate(result.applied_at)}</strong>
              </div>
            </div>
          </div>

          {/* Visual Status Tracker */}
          <StatusTracker
            statusStage={result.status_stage}
            statusLabel={result.status_label}
          />
        </div>
      )}
    </main>
  );
}

export default function TrackApplicationPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading tracking page...</p>
        </main>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
