"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  Phone,
  Shield,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import RejectionModal from "@/components/RejectionModal";
import StatusBadge from "@/components/StatusBadge";
import StatusTimeline from "@/components/StatusTimeline";
import {
  getApplication,
  getResumePresignedUrl,
  rejectApplication,
  screenApplication,
  shortlistApplication,
} from "@/lib/api";
import { ApplicationDetail, RejectionReason } from "@/lib/types";

export default function CandidateProfilePage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getApplication(applicationId);
      setApplication(data);
    } catch (err: any) {
      setError(err.message || "Failed to load candidate details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) loadData();
  }, [applicationId]);

  const handleDownloadResume = async () => {
    if (!application?.resume?.id) return;
    try {
      setDownloadLoading(true);
      const result = await getResumePresignedUrl(application.resume.id);
      if (result.download_url) {
        window.open(result.download_url, "_blank");
      }
    } catch (err: any) {
      alert(err.message || "Failed to generate resume download link");
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleShortlist = async () => {
    try {
      setActionLoading(true);
      if (application?.current_status === "APPLIED") {
        await screenApplication(applicationId, "Screened on HR review", application?.status_version);
      }
      await shortlistApplication(applicationId, "Shortlisted from candidate profile view");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to shortlist candidate");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRejection = async (reason: RejectionReason, remarks: string) => {
    setActionLoading(true);
    try {
      await rejectApplication(applicationId, reason, remarks, undefined, application?.status_version);
      await loadData();
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
    try {
      return new Date(isoString).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="p-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
          <span className="text-xs">Loading candidate profile...</span>
        </div>
      </AppShell>
    );
  }

  if (error || !application) {
    return (
      <AppShell>
        <div className="p-8 max-w-xl mx-auto">
          <div className="p-4 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium mb-4">
            {error || "Candidate application not found."}
          </div>
          <Link href="/dashboard" className="text-xs text-blue-600 hover:underline">
            &larr; Back to dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  const isTerminal = application.current_status === "REJECTED" || application.current_status === "OFFER_ACCEPTED";

  return (
    <AppShell>
      <Header
        title={application.candidate.name}
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Jobs", href: "/jobs" },
          { label: application.job_title, href: `/pipeline/${application.job_role_id}` },
          { label: application.reference_number },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {!isTerminal && application.current_status !== "SHORTLISTED" && (
              <button
                type="button"
                onClick={handleShortlist}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm disabled:bg-slate-300"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Shortlist Candidate</span>
              </button>
            )}

            {!isTerminal && (
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition disabled:bg-slate-100"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject</span>
              </button>
            )}
          </div>
        }
      />

      <main className="p-6 space-y-6 max-w-6xl">
        {/* Candidate Profile Top Header Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <StatusBadge status={application.current_status} type="application" />
                <StatusBadge status={application.source} type="source" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {application.candidate.name}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Applied for: <Link href={`/jobs/${application.job_role_id}`} className="font-semibold text-blue-600 hover:underline">{application.job_title}</Link> ({application.department})
              </p>
            </div>

            <div className="text-right text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Reference Number
              </span>
              <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 inline-block">
                {application.reference_number}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-900 select-all">{application.candidate.email}</span>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-medium text-slate-900">{application.candidate.phone || "Not provided"}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Submitted: <strong className="text-slate-900">{formatDate(application.applied_at)}</strong></span>
            </div>
          </div>
        </div>

        {/* 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Resume & Screening Result */}
          <div className="lg:col-span-7 space-y-6">
            {/* Resume Card */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Candidate Resume
                  </h2>
                </div>
                {application.resume && (
                  <span className="text-[11px] font-mono text-slate-400">
                    {application.resume.file_size_bytes
                      ? `${Math.round(application.resume.file_size_bytes / 1024)} KB`
                      : "PDF"}
                  </span>
                )}
              </div>

              {application.resume ? (
                <div className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-3 truncate pr-3">
                    <div className="w-9 h-9 rounded bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-xs shrink-0">
                      PDF
                    </div>
                    <div className="truncate">
                      <span className="text-xs font-semibold text-slate-900 block truncate">
                        {application.resume.file_name || "candidate_resume.pdf"}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Parse Status: {application.resume.parse_status}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadResume}
                    disabled={downloadLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition shadow-sm shrink-0 disabled:bg-slate-400"
                  >
                    {downloadLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>Download PDF</span>
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No resume attached.</p>
              )}
            </div>

            {/* AI Screening Result */}
            {application.screening_result && (
              <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      AI Screening Evaluation
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-700">Score:</span>
                    <span
                      className={`font-mono font-black text-sm px-2 py-0.5 rounded ${
                        (application.screening_result.score || 0) >= 70
                          ? "bg-emerald-100 text-emerald-800"
                          : (application.screening_result.score || 0) >= 40
                          ? "bg-amber-100 text-amber-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {application.screening_result.score ?? "--"}/100
                    </span>
                  </div>
                </div>

                {/* Skills tags */}
                <div className="space-y-3">
                  {application.screening_result.matched_skills && application.screening_result.matched_skills.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                        Matched Skills
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {application.screening_result.matched_skills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium"
                          >
                            ✓ {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {application.screening_result.missing_skills && application.screening_result.missing_skills.length > 0 && (
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 block mb-1">
                        Missing Skills
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {application.screening_result.missing_skills.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium"
                          >
                            ✕ {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {application.screening_result.reasoning && (
                    <div className="pt-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                        Evaluation Rationale
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded border border-slate-200">
                        {application.screening_result.reasoning}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (5 cols): Status History Timeline */}
          <div className="lg:col-span-5 bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Status History Timeline
                </h2>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {application.status_history.length} events
              </span>
            </div>

            <StatusTimeline history={application.status_history} />
          </div>
        </div>
      </main>

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleConfirmRejection}
        candidateName={application.candidate.name}
        isLoading={actionLoading}
      />
    </AppShell>
  );
}
