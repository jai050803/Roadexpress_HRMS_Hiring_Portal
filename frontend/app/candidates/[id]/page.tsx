"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  FileText,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  User,
  X,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import RejectionModal from "@/components/RejectionModal";
import ScoreIndicator from "@/components/ScoreIndicator";
import StatusBadge from "@/components/StatusBadge";
import StatusTimeline from "@/components/StatusTimeline";
import {
  getApplication,
  getJob,
  getResumePresignedUrl,
  rejectApplication,
  screenApplication,
  shortlistApplication,
} from "@/lib/api";
import { ApplicationDetail, JobRole, RejectionReason } from "@/lib/types";

export default function CandidateProfilePage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [job, setJob] = useState<JobRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const appData = await getApplication(applicationId);
      setApplication(appData);

      if (appData.job_role_id) {
        getJob(appData.job_role_id)
          .then(setJob)
          .catch(() => {});
      }
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
      return new Date(isoString).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="p-16 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
          <span className="text-xs">Loading candidate profile...</span>
        </div>
      </AppShell>
    );
  }

  if (error || !application) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto px-6 py-16 text-center">
          <div className="p-4 rounded-md bg-stone-50 border border-stone-200 text-stone-800 text-xs font-medium mb-4">
            {error || "Candidate record not found."}
          </div>
          <Link href="/dashboard" className="text-xs text-slate-700 hover:text-slate-950 underline font-medium">
            Return to dashboard
          </Link>
        </div>
      </AppShell>
    );
  }

  const isTerminal = application.current_status === "REJECTED" || application.current_status === "OFFER_ACCEPTED";
  const parsed = application.resume?.parsed_json || {};
  const screening = application.screening_result;
  const isHardFail = screening?.hard_filter_passed === false;

  return (
    <AppShell>
      <Header
        title={application.candidate.name}
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: application.job_title, href: `/pipeline/${application.job_role_id}` },
          { label: "Candidate dossier" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {application.resume && (
              <button
                type="button"
                onClick={handleDownloadResume}
                disabled={downloadLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-xs transition"
              >
                {downloadLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>View resume PDF</span>
              </button>
            )}

            {!isTerminal && (
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(true)}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-medium text-xs transition disabled:opacity-50"
              >
                <span>Reject</span>
              </button>
            )}

            {!isTerminal && application.current_status !== "SHORTLISTED" && (
              <button
                type="button"
                onClick={handleShortlist}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs disabled:opacity-50"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Shortlist candidate</span>
              </button>
            )}
          </div>
        }
      />

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Executive Header Strip */}
        <div className="bg-white rounded-md border border-slate-200/90 p-5 shadow-2xs">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <StatusBadge status={application.current_status} type="application" />
                <span className="text-slate-300">/</span>
                <span className="text-xs text-slate-500">
                  Target: <strong className="text-slate-800 font-medium">{application.job_title}</strong> ({application.department})
                </span>
              </div>
              <h1 className="text-xl font-semibold text-slate-950 tracking-tight">
                {application.candidate.name}
              </h1>
            </div>

            <div className="text-right text-xs">
              <span className="text-slate-400 block mb-0.5">Reference ID</span>
              <span className="font-tabular font-medium text-xs text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 inline-block">
                {application.reference_number}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <a href={`mailto:${application.candidate.email}`} className="text-slate-900 hover:underline">
                {application.candidate.email}
              </a>
            </div>

            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-900">{application.candidate.phone || "Phone not provided"}</span>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Applied on <strong className="text-slate-900 font-tabular font-medium">{formatDate(application.applied_at)}</strong></span>
            </div>
          </div>
        </div>

        {/* 2-Column Balanced Dossier Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (8 cols): Match Assessment + Experience History */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Screening Evaluation Dossier */}
            <div className="bg-white rounded-md border border-slate-200/90 p-5 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-xs font-semibold text-slate-900 tracking-tight">
                  Screening assessment
                </h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">Overall match:</span>
                  <ScoreIndicator score={screening?.score} size="md" />
                </div>
              </div>

              {/* Hard filter / Qualification callout */}
              {isHardFail ? (
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-md text-xs text-stone-800 flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-brand-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-medium block">Experience requirement not met</strong>
                    <span className="text-slate-600 leading-relaxed">
                      Candidate detected experience ({screening?.experience_years_detected ?? "unspecified"} years) does not satisfy the role&apos;s baseline minimum requirement.
                    </span>
                  </div>
                </div>
              ) : screening?.hard_filter_passed === true ? (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Check className="w-4 h-4 text-signal-published" />
                  <span>Mandatory qualifications and experience verified.</span>
                </div>
              ) : null}

              {/* Editorial Rationale Text (Clean editorial style, not a blockquote) */}
              {screening?.reasoning && (
                <div>
                  <h3 className="text-xs font-medium text-slate-700 mb-2">
                    Evaluation notes
                  </h3>
                  <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50/50 p-4 rounded-md border border-slate-200/70">
                    {screening.reasoning}
                  </div>
                </div>
              )}

              {/* Competencies: Plain, clean text columns (NO colored pill boxes) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <h3 className="font-medium text-slate-900 mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-signal-published"></span>
                    <span>Verified competencies ({screening?.matched_skills?.length || 0})</span>
                  </h3>
                  {screening?.matched_skills && screening.matched_skills.length > 0 ? (
                    <p className="text-slate-600 leading-relaxed font-sans">
                      {screening.matched_skills.join(", ")}
                    </p>
                  ) : (
                    <span className="text-slate-400">None detected</span>
                  )}
                </div>

                <div>
                  <h3 className="font-medium text-slate-900 mb-2 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    <span>Unverified / interview focus ({screening?.missing_skills?.length || 0})</span>
                  </h3>
                  {screening?.missing_skills && screening.missing_skills.length > 0 ? (
                    <p className="text-slate-500 leading-relaxed font-sans">
                      {screening.missing_skills.join(", ")}
                    </p>
                  ) : (
                    <span className="text-slate-400">All required skills matched</span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. Structured Profile from Resume Parse */}
            <div className="bg-white rounded-md border border-slate-200/90 p-5 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-xs font-semibold text-slate-900 tracking-tight">
                  Parsed candidate history
                </h2>
                {parsed.total_experience_years !== undefined && parsed.total_experience_years !== null && (
                  <span className="text-xs text-slate-500 font-tabular">
                    Total experience: <strong className="text-slate-800">{parsed.total_experience_years} years</strong>
                  </span>
                )}
              </div>

              {/* Summary if present */}
              {parsed.summary && (
                <div>
                  <h3 className="text-xs font-medium text-slate-700 mb-1.5">Executive summary</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    {parsed.summary}
                  </p>
                </div>
              )}

              {/* Work Experience */}
              {parsed.experience && Array.isArray(parsed.experience) && parsed.experience.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-slate-700">Career history</h3>
                  <div className="divide-y divide-slate-100 border-t border-slate-100">
                    {parsed.experience.map((exp: any, i: number) => (
                      <div key={i} className="py-3 first:pt-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium text-slate-900 text-xs">
                            {typeof exp === "string" ? exp : exp.title || exp.role || "Role"}
                          </span>
                          {exp.duration && (
                            <span className="text-[11px] text-slate-400 font-tabular">
                              {exp.duration}
                            </span>
                          )}
                        </div>
                        {exp.company && (
                          <span className="text-xs text-slate-500 block mt-0.5">
                            {exp.company}
                          </span>
                        )}
                        {exp.description && (
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {exp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {parsed.education && Array.isArray(parsed.education) && parsed.education.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <h3 className="text-xs font-medium text-slate-700">Education & credentials</h3>
                  <div className="space-y-2">
                    {parsed.education.map((edu: any, i: number) => (
                      <div key={i} className="text-xs text-slate-700">
                        {typeof edu === "string" ? (
                          <span>{edu}</span>
                        ) : (
                          <div>
                            <span className="font-medium text-slate-900">{edu.degree || edu.qualification}</span>
                            {edu.institution && (
                              <span className="text-slate-500"> · {edu.institution}</span>
                            )}
                            {edu.year && (
                              <span className="text-slate-400 font-tabular"> ({edu.year})</span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Certifications */}
              {parsed.certifications && Array.isArray(parsed.certifications) && parsed.certifications.length > 0 && (
                <div className="pt-3 border-t border-slate-100 text-xs">
                  <h3 className="font-medium text-slate-700 mb-1">Certifications</h3>
                  <p className="text-slate-600">
                    {parsed.certifications.join(", ")}
                  </p>
                </div>
              )}

              {/* Fallback if parse is still running */}
              {!parsed.experience && !parsed.education && !parsed.summary && (
                <p className="text-xs text-slate-500 italic py-2">
                  Detailed background extraction will appear here once automated parsing finishes. Click &ldquo;View resume PDF&rdquo; above to read the original document.
                </p>
              )}
            </div>
          </div>

          {/* Right Column (4 cols): Role Benchmarks + Activity Trail */}
          <div className="lg:col-span-4 space-y-6">
            {/* Job Role Benchmark Card */}
            {job && (
              <div className="bg-white rounded-md border border-slate-200/90 p-5 shadow-2xs space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-900">Job benchmark</h3>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-slate-400 hover:text-slate-700"
                    title="View role details"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Role</span>
                  <span className="font-medium text-slate-900">{job.title}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[11px] block">Minimum experience required</span>
                  <span className="font-medium text-slate-900 font-tabular">
                    {job.min_experience_years ? `${job.min_experience_years} years` : "None specified"}
                  </span>
                </div>

                {job.required_skills && job.required_skills.length > 0 && (
                  <div>
                    <span className="text-slate-400 text-[11px] block mb-1">Target skills in JD</span>
                    <p className="text-slate-600 leading-relaxed font-sans">
                      {job.required_skills.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Application Metadata & Status History */}
            <div className="bg-white rounded-md border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-xs font-semibold text-slate-900">
                  Activity & audit log
                </h3>
                <span className="text-[11px] text-slate-400 font-tabular">
                  {application.status_history.length} update{application.status_history.length === 1 ? "" : "s"}
                </span>
              </div>

              <StatusTimeline history={application.status_history} />
            </div>
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
