import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Briefcase,
  Calendar,
  Check,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  Star,
  User,
  X,
} from "lucide-react";
import ScoreIndicator from "../ui/ScoreIndicator";
import StatusBadge from "../ui/StatusBadge";
import StatusTimeline from "../ui/StatusTimeline";
import RejectionModal from "../common/RejectionModal";
import { useHandoff } from "../../integration/handoffIntegration";
import {
  getApplication,
  getResumePresignedUrl,
  rejectApplication,
  screenApplication,
  shortlistApplication,
} from "../../lib/api";
import { ApplicationDetail, RejectionReason } from "../../lib/types";

export interface CandidateProfileDrawerProps {
  applicationId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export default function CandidateProfileDrawer({
  applicationId,
  isOpen,
  onClose,
  onStatusUpdated,
}: CandidateProfileDrawerProps) {
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const { onCandidateHired } = useHandoff();
  const [transferred, setTransferred] = useState(false);

  const handleTransferToOnboarding = () => {
    if (!application) return;
    onCandidateHired({
      candidateId: application.candidate?.id || application.id,
      applicationId: application.id,
      personalInfo: {
        fullName: application.candidate?.name || application.candidate_name,
        email: application.candidate?.email || application.candidate_email,
        phone: application.candidate?.phone || application.candidate_phone,
        location: application.candidate?.location,
      },
      employmentDetails: {
        jobTitle: application.job_title,
        department: "Logistics Operations",
        hiredDate: new Date().toISOString(),
      },
      documents: {
        resumeOriginalName: application.resume?.original_filename,
        resumeFilePath: application.resume?.file_url,
      },
      screeningScore: application.screening_score ?? undefined,
    });
    setTransferred(true);
  };

  useEffect(() => {
    if (!isOpen || !applicationId) {
      setApplication(null);
      setError(null);
      return;
    }

    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getApplication(applicationId);
        setApplication(data);
      } catch (err: any) {
        setError(err.message || "Failed to load candidate profile");
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, applicationId]);

  if (!isOpen) return null;

  const handleDownloadResume = async () => {
    if (!application?.resume?.id) return;
    try {
      setDownloadLoading(true);
      const result = await getResumePresignedUrl(application.resume.id);
      if (result?.download_url) {
        window.open(result.download_url, "_blank");
      }
    } catch (err: any) {
      alert(err.message || "Failed to download resume file.");
    } finally {
      setDownloadLoading(false);
    }
  };

  const handleShortlist = async () => {
    if (!applicationId) return;
    try {
      setActionLoading(true);
      if (application?.current_status === "APPLIED") {
        await screenApplication(applicationId, "Auto-screened on shortlist", application?.status_version);
      }
      await shortlistApplication(applicationId, "Shortlisted from profile drawer", application?.status_version);
      const updated = await getApplication(applicationId);
      setApplication(updated);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      alert(err.message || "Failed to shortlist candidate");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRejection = async (reason: RejectionReason, remarks: string) => {
    if (!applicationId) return;
    try {
      setActionLoading(true);
      await rejectApplication(applicationId, reason, remarks, undefined, application?.status_version);
      setIsRejectModalOpen(false);
      const updated = await getApplication(applicationId);
      setApplication(updated);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      alert(err.message || "Failed to reject candidate");
    } finally {
      setActionLoading(false);
    }
  };

  const candidate = application?.candidate;
  const screening = application?.screening_result;
  const resume = application?.resume;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          {/* Drawer Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                Candidate Dossier
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="overflow-y-auto flex-1 p-6 space-y-6">
            {loading ? (
              <div className="py-20 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                <span className="text-xs">Loading candidate profile...</span>
              </div>
            ) : error ? (
              <div className="p-4 rounded-md bg-stone-50 border border-stone-200 text-stone-800 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-brand-500 shrink-0" />
                <span>{error}</span>
              </div>
            ) : application ? (
              <>
                {/* Profile Card */}
                <div className="bg-slate-50/60 p-4 rounded-lg border border-slate-200/80 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-950">
                        {candidate?.name || application.candidate_name || "Candidate Name"}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Target Role: <strong className="text-slate-800">{application.job_title}</strong>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ScoreIndicator score={application.screening_score} size="md" />
                      <StatusBadge status={application.current_status} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{candidate?.email || "Email pending"}</span>
                    </div>
                    {candidate?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{candidate.phone}</span>
                      </div>
                    )}
                    {candidate?.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{candidate.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Ref: <strong className="font-mono">{application.reference_number}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Candidate Skills */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-900 tracking-tight">
                    Verified Competencies & Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate?.skills && candidate.skills.length > 0 ? (
                      candidate.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {skill}
                        </span>
                      ))
                    ) : application.matched_skills && application.matched_skills.length > 0 ? (
                      application.matched_skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No skills extracted yet.</span>
                    )}
                  </div>
                </div>

                {/* AI Screening Assessment Breakdown */}
                {screening && (
                  <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200/90 shadow-2xs">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Star className="w-3.5 h-3.5 text-brand-500" />
                        <h4 className="text-xs font-semibold text-slate-900">
                          Automated AI Screening Assessment
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500">
                        Fit Score: {screening.overall_score ?? screening.score ?? 0}/100
                      </span>
                    </div>

                    {screening.summary && (
                      <p className="text-xs text-slate-700 leading-relaxed font-sans">
                        {screening.summary}
                      </p>
                    )}

                    {screening.matched_skills && screening.matched_skills.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-emerald-700 block">
                          Matched Skills:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {screening.matched_skills.map((ms, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-[10px] bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                              {ms}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {screening.missing_skills && screening.missing_skills.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-amber-700 block">
                          Missing Requirements:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {screening.missing_skills.map((ms, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-[10px] bg-amber-50 text-amber-800 rounded border border-amber-200">
                              {ms}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Resume Document Link */}
                {resume && (
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-md">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="truncate">
                        <span className="block text-xs font-medium text-slate-900 truncate">
                          {resume.original_filename || resume.file_name || "Candidate_Resume.pdf"}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Status: {resume.parse_status || "PARSED"}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadResume}
                      disabled={downloadLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 transition cursor-pointer"
                    >
                      {downloadLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      <span>Download</span>
                    </button>
                  </div>
                )}

                {/* Application Stage Progression Timeline */}
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-semibold text-slate-900 tracking-tight">
                    Recruitment Stage History
                  </h4>
                  <StatusTimeline history={application.status_history || []} />
                </div>
              </>
            ) : null}
          </div>

          {/* Drawer Actions Footer */}
          {application && (
            <div className="p-4 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between gap-3">
              <Link
                to={`/pipeline/${application.job_role_id}`}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 underline"
              >
                View in Pipeline
              </Link>

              <div className="flex items-center gap-2">
                {(application.current_status === "HIRED" || application.current_status === "OFFER_ACCEPTED") && (
                  <button
                    type="button"
                    onClick={handleTransferToOnboarding}
                    disabled={transferred}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition cursor-pointer disabled:bg-emerald-100 disabled:text-emerald-800"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{transferred ? "Transferred to Onboarding" : "Transfer to Employee Onboarding"}</span>
                  </button>
                )}

                {application.current_status !== "REJECTED" && (
                  <button
                    type="button"
                    onClick={() => setIsRejectModalOpen(true)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded border border-stone-200 transition cursor-pointer"
                  >
                    Reject
                  </button>
                )}

                {application.current_status !== "SHORTLISTED" && application.current_status !== "REJECTED" && (
                  <button
                    type="button"
                    onClick={handleShortlist}
                    disabled={actionLoading}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium rounded bg-brand-500 hover:bg-brand-600 text-white transition shadow-2xs cursor-pointer"
                  >
                    {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Shortlist for Interview</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <RejectionModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        onConfirm={handleConfirmRejection}
        candidateName={application?.candidate_name}
        isLoading={actionLoading}
      />
    </div>
  );
}
