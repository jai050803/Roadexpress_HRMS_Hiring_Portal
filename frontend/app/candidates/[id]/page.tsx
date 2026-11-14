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
  CalendarPlus,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
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
  Star,
  User,
  Video,
  X,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import CancelInterviewModal from "@/components/CancelInterviewModal";
import Header from "@/components/Header";
import RejectionModal from "@/components/RejectionModal";
import RescheduleInterviewModal from "@/components/RescheduleInterviewModal";
import ScheduleInterviewModal from "@/components/ScheduleInterviewModal";
import ScoreIndicator from "@/components/ScoreIndicator";
import StatusBadge from "@/components/StatusBadge";
import StatusTimeline from "@/components/StatusTimeline";
import {
  acceptOffer,
  declineOffer,
  getApplication,
  getApplicationInterviews,
  getJob,
  getResumePresignedUrl,
  lapseOffer,
  rejectApplication,
  screenApplication,
  shortlistApplication,
} from "@/lib/api";
import { ApplicationDetail, InterviewItem, JobRole, RejectionReason } from "@/lib/types";

export default function CandidateProfilePage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;

  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [job, setJob] = useState<JobRole | null>(null);
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [expandedFeedbackIds, setExpandedFeedbackIds] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [offerModal, setOfferModal] = useState<{
    isOpen: boolean;
    type: "accept" | "decline" | "lapse" | null;
    remarks: string;
  }>({
    isOpen: false,
    type: null,
    remarks: "",
  });

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const toggleFeedbackExpanded = (id: string) => {
    setExpandedFeedbackIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [appData, interviewsData] = await Promise.all([
        getApplication(applicationId),
        getApplicationInterviews(applicationId).catch(() => []),
      ]);
      setApplication(appData);
      setInterviews(interviewsData || []);

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

  const handleConfirmOfferAction = async () => {
    if (!offerModal.type) return;
    try {
      setActionLoading(true);
      if (offerModal.type === "accept") {
        await acceptOffer(applicationId, offerModal.remarks || undefined, application?.status_version);
      } else if (offerModal.type === "decline") {
        await declineOffer(applicationId, offerModal.remarks || undefined, application?.status_version);
      } else if (offerModal.type === "lapse") {
        await lapseOffer(applicationId, offerModal.remarks || undefined, application?.status_version);
      }
      setOfferModal({ isOpen: false, type: null, remarks: "" });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update offer status");
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

  const formatInterviewDateTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const dayName = d.toLocaleDateString("en-IN", { weekday: "long" });
      const day = d.getDate();
      const month = d.toLocaleDateString("en-IN", { month: "short" });
      const year = d.getFullYear();
      const time = d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
      return `${dayName}, ${day} ${month} ${year} · ${time}`;
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

  const isTerminal = [
    "REJECTED",
    "CLOSED",
    "OFFER_ACCEPTED",
    "OFFER_DECLINED",
    "OFFER_LAPSED",
  ].includes(application.current_status);
  const isOffered = application.current_status === "OFFERED";
  const parsed = application.resume?.parsed_json || {};
  const screening = application.screening_result;
  const isHardFail = screening?.hard_filter_passed === false;

  const scheduledInterview =
    interviews.find((i) => i.status === "scheduled") ||
    (application.upcoming_interview
      ? {
          id: application.upcoming_interview.id,
          scheduled_at: application.upcoming_interview.scheduled_at,
          meeting_link: application.upcoming_interview.meeting_link,
          mode: application.upcoming_interview.mode,
        }
      : null);

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

            {isOffered ? (
              <>
                <button
                  type="button"
                  onClick={() => setOfferModal({ isOpen: true, type: "accept", remarks: "" })}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition shadow-2xs disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Offer Accepted</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOfferModal({ isOpen: true, type: "decline", remarks: "" })}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-xs transition disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5 text-slate-500" />
                  <span>Candidate Declined</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOfferModal({ isOpen: true, type: "lapse", remarks: "" })}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-medium text-xs transition disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Mark as Lapsed</span>
                </button>
              </>
            ) : (
              <>
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

                {/* Conditional Schedule Interview button when SHORTLISTED */}
                {application.current_status === "SHORTLISTED" && (
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(true)}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs disabled:opacity-50 cursor-pointer"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    <span>Schedule Interview</span>
                  </button>
                )}

                {/* Conditional Reschedule & Cancel buttons when INTERVIEW_SCHEDULED */}
                {application.current_status === "INTERVIEW_SCHEDULED" && scheduledInterview && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsRescheduleModalOpen(true)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Reschedule</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCancelModalOpen(true)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-medium text-xs transition disabled:opacity-50 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 text-slate-400" />
                      <span>Cancel Interview</span>
                    </button>
                  </>
                )}

                {!isTerminal &&
                  application.current_status !== "SHORTLISTED" &&
                  application.current_status !== "INTERVIEW_SCHEDULED" && (
                    <button
                      type="button"
                      onClick={handleShortlist}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs disabled:opacity-50 cursor-pointer"
                    >
                      {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>Shortlist candidate</span>
                    </button>
                  )}
              </>
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

            {/* Interview History */}
            {interviews.length > 0 && (
              <div className="bg-white rounded-md border border-slate-200/90 p-5 shadow-2xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <h3 className="text-xs font-semibold text-slate-900">
                      Interview History
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-tabular">
                    {interviews.length} {interviews.length === 1 ? "round" : "rounds"}
                  </span>
                </div>

                <div className="space-y-4">
                  {interviews.map((interview) => {
                    const isExpanded = expandedFeedbackIds.has(interview.id);
                    const latestFeedback =
                      interview.feedback && interview.feedback.length > 0
                        ? interview.feedback[0]
                        : null;

                    return (
                      <div
                        key={interview.id}
                        className="p-4 rounded-md border border-slate-100 bg-slate-50/50 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-slate-900">
                              {formatInterviewDateTime(interview.scheduled_at)}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                              {interview.mode === "phone" && (
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              {interview.mode === "video" && (
                                <Video className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              {interview.mode === "in_person" && (
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              <span className="capitalize">{interview.mode.replace("_", " ")}</span>
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="text-xs text-slate-500 font-tabular">
                              {interview.duration_minutes} min
                            </span>
                          </div>

                          {/* Status badge */}
                          <div>
                            {interview.status === "scheduled" && (
                              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                Scheduled
                              </span>
                            )}
                            {interview.status === "completed" && (
                              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Completed
                              </span>
                            )}
                            {interview.status === "cancelled" && (
                              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                Cancelled
                              </span>
                            )}
                            {interview.status === "no_show" && (
                              <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                No Show
                              </span>
                            )}
                          </div>
                        </div>

                        {interview.location && (
                          <p className="text-xs text-slate-600">
                            <span className="text-slate-400">Location: </span>
                            {interview.location}
                          </p>
                        )}
                        {interview.meeting_link && (
                          <p className="text-xs text-slate-600 truncate">
                            <span className="text-slate-400">Link: </span>
                            <a
                              href={interview.meeting_link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-600 hover:underline"
                            >
                              {interview.meeting_link}
                            </a>
                          </p>
                        )}
                        {interview.cancellation_reason && (
                          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded p-2">
                            <span className="font-medium">Cancellation reason: </span>
                            {interview.cancellation_reason}
                          </p>
                        )}
                        {interview.hr_notes && (
                          <p className="text-xs text-slate-500 italic bg-white border border-slate-100 rounded p-2">
                            <span className="font-medium not-italic text-slate-600">Panel notes: </span>
                            {interview.hr_notes}
                          </p>
                        )}

                        {/* Collapsed feedback summary for completed interviews */}
                        {interview.status === "completed" && latestFeedback && (
                          <div className="pt-2 border-t border-slate-200/60">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {latestFeedback.overall_rating && (
                                  <div className="flex items-center gap-1">
                                    <div className="flex items-center">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`w-3.5 h-3.5 ${
                                            star <= (latestFeedback.overall_rating || 0)
                                              ? "fill-amber-400 text-amber-400"
                                              : "text-slate-200"
                                          }`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-xs font-semibold text-slate-700 ml-1 font-tabular">
                                      {latestFeedback.overall_rating}/5
                                    </span>
                                  </div>
                                )}

                                {latestFeedback.decision && (
                                  <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 text-slate-700 uppercase tracking-wide border border-slate-200">
                                    {latestFeedback.decision}
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleFeedbackExpanded(interview.id)}
                                className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-900 transition cursor-pointer"
                              >
                                <span>{isExpanded ? "Hide feedback" : "View feedback"}</span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 transition-transform ${
                                    isExpanded ? "rotate-180" : ""
                                  }`}
                                />
                              </button>
                            </div>

                            {/* Expanded feedback details */}
                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-xs bg-white rounded p-3 border">
                                {/* Individual ratings */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-2 border-b border-slate-100 text-[11px]">
                                  <div>
                                    <span className="text-slate-400 block">Technical</span>
                                    <span className="font-semibold text-slate-800 font-tabular">
                                      {latestFeedback.technical_rating
                                        ? `${latestFeedback.technical_rating}/5`
                                        : "—"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">Communication</span>
                                    <span className="font-semibold text-slate-800 font-tabular">
                                      {latestFeedback.communication_rating
                                        ? `${latestFeedback.communication_rating}/5`
                                        : "—"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">Culture</span>
                                    <span className="font-semibold text-slate-800 font-tabular">
                                      {latestFeedback.culture_rating
                                        ? `${latestFeedback.culture_rating}/5`
                                        : "—"}
                                    </span>
                                  </div>
                                </div>

                                {latestFeedback.strengths && (
                                  <div>
                                    <span className="font-medium text-slate-700 block text-[11px]">
                                      Strengths
                                    </span>
                                    <p className="text-slate-600 leading-relaxed">
                                      {latestFeedback.strengths}
                                    </p>
                                  </div>
                                )}

                                {latestFeedback.concerns && (
                                  <div>
                                    <span className="font-medium text-slate-700 block text-[11px]">
                                      Concerns
                                    </span>
                                    <p className="text-slate-600 leading-relaxed">
                                      {latestFeedback.concerns}
                                    </p>
                                  </div>
                                )}

                                {latestFeedback.additional_notes && (
                                  <div>
                                    <span className="font-medium text-slate-700 block text-[11px]">
                                      Additional notes
                                    </span>
                                    <p className="text-slate-600 leading-relaxed">
                                      {latestFeedback.additional_notes}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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

      {/* Offer Outcome Confirmation Modal */}
      {offerModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-lg border border-slate-200 max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-950">
                {offerModal.type === "accept" && "Confirm Offer Acceptance"}
                {offerModal.type === "decline" && "Record Candidate Declined"}
                {offerModal.type === "lapse" && "Mark Offer as Lapsed"}
              </h3>
              <button
                type="button"
                onClick={() => setOfferModal({ isOpen: false, type: null, remarks: "" })}
                className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {offerModal.type === "accept" &&
                `Are you sure you want to mark ${application.candidate.name}'s offer as Accepted? This will update the status to OFFER_ACCEPTED and notify the internal HR team.`}
              {offerModal.type === "decline" &&
                `Are you sure you want to record that ${application.candidate.name} has declined the job offer? This will update the status to OFFER_DECLINED.`}
              {offerModal.type === "lapse" &&
                `Are you sure you want to mark the offer for ${application.candidate.name} as lapsed? This will update the status to OFFER_LAPSED.`}
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Optional remarks / notes
              </label>
              <textarea
                rows={3}
                value={offerModal.remarks}
                onChange={(e) => setOfferModal({ ...offerModal, remarks: e.target.value })}
                placeholder={
                  offerModal.type === "accept"
                    ? "e.g. Candidate accepted offer; joining date scheduled"
                    : offerModal.type === "decline"
                    ? "e.g. Candidate accepted another opportunity"
                    : "e.g. No response after follow-ups past deadline"
                }
                className="w-full text-xs p-2.5 rounded-md border border-slate-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-slate-900 placeholder:text-slate-400 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOfferModal({ isOpen: false, type: null, remarks: "" })}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-md border border-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOfferAction}
                disabled={actionLoading}
                className={`px-4 py-1.5 text-xs font-medium text-white rounded-md transition shadow-2xs flex items-center gap-1.5 disabled:opacity-50 ${
                  offerModal.type === "accept"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : offerModal.type === "decline"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-slate-800 hover:bg-slate-900"
                }`}
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {offerModal.type === "accept" && "Confirm Accepted"}
                  {offerModal.type === "decline" && "Record Declined"}
                  {offerModal.type === "lapse" && "Mark as Lapsed"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Interview Modal */}
      <ScheduleInterviewModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        applicationId={application.id}
        candidateName={application.candidate.name}
        candidatePhone={application.candidate.phone}
        onSuccess={(candName) => {
          loadData();
          setToastMessage(`Interview scheduled. Confirmation email sent to ${candName}.`);
        }}
      />

      {/* Reschedule Interview Modal */}
      {scheduledInterview && (
        <RescheduleInterviewModal
          isOpen={isRescheduleModalOpen}
          onClose={() => setIsRescheduleModalOpen(false)}
          interviewId={scheduledInterview.id}
          candidateName={application.candidate.name}
          initialScheduledAt={scheduledInterview.scheduled_at}
          initialMeetingLink={scheduledInterview.meeting_link}
          onSuccess={() => {
            loadData();
            setToastMessage("Interview rescheduled successfully.");
          }}
        />
      )}

      {/* Cancel Interview Modal */}
      {scheduledInterview && (
        <CancelInterviewModal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          interviewId={scheduledInterview.id}
          candidateName={application.candidate.name}
          onSuccess={() => {
            loadData();
            setToastMessage("Interview cancelled.");
          }}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-lg shadow-lg border border-slate-800 text-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </AppShell>
  );
}
