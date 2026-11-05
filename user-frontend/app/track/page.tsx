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
    <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      {/* Back button */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to open roles
      </Link>

      {/* Query Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
          Track Your Application
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
          Enter the email address used during submission and your unique application reference number (e.g. <span className="font-mono text-slate-800 font-semibold">APP-20261105-0042</span>).
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Candidate Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.g. priya.sharma@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Reference Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="APP-YYYYMMDD-NNNN"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:bg-blue-400"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Checking Status...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Check Application Status</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Result Display */}
      {result && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block mb-1">
              Application Details
            </span>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              {result.job_title}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-600">
                <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Reference: </span>
                <strong className="font-mono text-slate-900">{result.reference_number}</strong>
              </div>

              <div className="flex items-center gap-2 text-slate-600">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <span>Submitted On: </span>
                <strong className="text-slate-900">{formatDate(result.applied_at)}</strong>
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
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading tracking page...</p>
        </main>
      }
    >
      <TrackContent />
    </Suspense>
  );
}
