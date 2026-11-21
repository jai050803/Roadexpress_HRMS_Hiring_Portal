import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Filter,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import AppShell from "../components/layout/AppShell";
import Header from "../components/layout/Header";
import ScoreIndicator from "../components/ui/ScoreIndicator";
import StatusBadge from "../components/ui/StatusBadge";
import CandidateProfileDrawer from "../components/candidates/CandidateProfileDrawer";
import RejectionModal from "../components/common/RejectionModal";
import ResumePreviewModal from "../components/resumes/ResumePreviewModal";
import { useHandoff } from "../../integration/handoffIntegration";
import {
  acceptOffer,
  completeInterview,
  getJob,
  listAllJobs,
  listApplications,
  makeOffer,
  markInterviewNoShow,
  rejectApplication,
  screenApplication,
  shortlistApplication,
} from "../lib/api";
import {
  ApplicationListItem,
  ApplicationStatus,
  JobRole,
  RejectionReason,
} from "../lib/types";

// 8 Standard Pipeline Stages
const PIPELINE_COLUMNS: {
  key: string;
  label: string;
  statuses: ApplicationStatus[];
  badgeColor: string;
}[] = [
  {
    key: "APPLIED",
    label: "Applied",
    statuses: ["APPLIED"],
    badgeColor: "bg-slate-200 text-slate-700",
  },
  {
    key: "SCREENING",
    label: "Screening",
    statuses: ["SCREENING", "SCREENED"],
    badgeColor: "bg-sky-100 text-sky-800",
  },
  {
    key: "SHORTLISTED",
    label: "Shortlisted",
    statuses: ["SHORTLISTED"],
    badgeColor: "bg-brand-100 text-brand-800",
  },
  {
    key: "INTERVIEW_SCHEDULED",
    label: "Interview Scheduled",
    statuses: ["INTERVIEW_SCHEDULED"],
    badgeColor: "bg-indigo-100 text-indigo-800",
  },
  {
    key: "INTERVIEW_COMPLETED",
    label: "Interview Completed",
    statuses: ["INTERVIEW_COMPLETED", "INTERVIEWED"],
    badgeColor: "bg-purple-100 text-purple-800",
  },
  {
    key: "OFFER_EXTENDED",
    label: "Offer Extended",
    statuses: ["OFFER_EXTENDED", "OFFERED"],
    badgeColor: "bg-amber-100 text-amber-800",
  },
  {
    key: "HIRED",
    label: "Hired",
    statuses: ["HIRED", "OFFER_ACCEPTED"],
    badgeColor: "bg-emerald-100 text-emerald-800",
  },
  {
    key: "REJECTED",
    label: "Rejected",
    statuses: ["REJECTED", "OFFER_DECLINED", "OFFER_LAPSED"],
    badgeColor: "bg-stone-200 text-stone-700",
  },
];

export default function Pipeline() {
  const params = useParams<{ jobId?: string }>();
  const navigate = useNavigate();
  const selectedJobParam = params.jobId;

  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>(selectedJobParam || "all");
  const [activeJob, setActiveJob] = useState<JobRole | null>(null);

  const [allCandidates, setAllCandidates] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { onCandidateHired } = useHandoff();

  const handleHandoffClick = (candidate: ApplicationListItem) => {
    onCandidateHired({
      candidateId: candidate.id,
      applicationId: candidate.id,
      personalInfo: {
        fullName: candidate.candidate_name,
        email: candidate.candidate_email,
        phone: candidate.candidate_phone,
      },
      employmentDetails: {
        jobTitle: candidate.job_title,
        department: "Logistics Operations",
        hiredDate: new Date().toISOString(),
      },
      screeningScore: candidate.screening_score ?? undefined,
    });
  };

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState<"all" | "top" | "pass">("all");

  // Drawer & Modals
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [previewResumeState, setPreviewResumeState] = useState<{
    isOpen: boolean;
    resumeId?: string;
    candidateName?: string;
  }>({ isOpen: false });

  const [rejectModalState, setRejectModalState] = useState<{
    isOpen: boolean;
    candidateId?: string;
    candidateName?: string;
  }>({ isOpen: false });

  // Initial Load of jobs
  useEffect(() => {
    async function initJobs() {
      try {
        const jobsData = await listAllJobs();
        setJobs(jobsData || []);
        if (selectedJobParam) {
          setSelectedJobId(selectedJobParam);
        } else if (jobsData && jobsData.length > 0 && selectedJobId === "all") {
          setSelectedJobId(jobsData[0].id);
        }
      } catch {
        setError("Failed to load jobs");
      }
    }
    initJobs();
  }, [selectedJobParam]);

  const loadPipelineData = async () => {
    try {
      setLoading(true);
      setError(null);

      const targetJobId = selectedJobId === "all" ? undefined : selectedJobId;
      const [jobData, appsData] = await Promise.all([
        targetJobId ? getJob(targetJobId).catch(() => null) : Promise.resolve(null),
        listApplications({
          job_role_id: targetJobId,
          limit: 150,
        }),
      ]);

      setActiveJob(jobData);
      setAllCandidates(appsData.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load candidate pipeline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedJobId) {
      loadPipelineData();
    }
  }, [selectedJobId]);

  // Optimistic Transition Helper
  const handleOptimisticTransition = async (
    candidateId: string,
    targetStatus: ApplicationStatus,
    apiAction: () => Promise<any>
  ) => {
    const previousState = [...allCandidates];

    // Optimistically update card status in UI
    setAllCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, current_status: targetStatus } : c))
    );

    try {
      setActionLoading(true);
      await apiAction();
      await loadPipelineData();
    } catch (err: any) {
      // Rollback to previous state on failure
      setAllCandidates(previousState);
      alert(err.message || "Action failed. Reverting changes.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleShortlist = (candidate: ApplicationListItem) => {
    handleOptimisticTransition(candidate.id, "SHORTLISTED", async () => {
      if (candidate.current_status === "APPLIED") {
        await screenApplication(candidate.id, "Auto-screened on shortlist");
      }
      await shortlistApplication(candidate.id);
    });
  };

  const handleMakeOffer = (candidate: ApplicationListItem) => {
    handleOptimisticTransition(candidate.id, "OFFER_EXTENDED", async () => {
      await makeOffer(candidate.id);
    });
  };

  const handleAcceptOffer = (candidate: ApplicationListItem) => {
    handleOptimisticTransition(candidate.id, "HIRED", async () => {
      await acceptOffer(candidate.id);
    });
  };

  const handleConfirmRejection = async (reason: RejectionReason, remarks: string) => {
    if (!rejectModalState.candidateId) return;
    const cid = rejectModalState.candidateId;
    setRejectModalState({ isOpen: false });

    handleOptimisticTransition(cid, "REJECTED", async () => {
      await rejectApplication(cid, reason, remarks);
    });
  };

  // Filtered Candidates
  const filteredCandidates = allCandidates.filter((c) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = c.candidate_name?.toLowerCase().includes(q);
      const emailMatch = c.candidate_email?.toLowerCase().includes(q);
      if (!nameMatch && !emailMatch) return false;
    }

    if (scoreFilter === "top") {
      return (c.screening_score ?? 0) >= 70;
    }
    if (scoreFilter === "pass") {
      return c.hard_filter_passed !== false;
    }
    return true;
  });

  return (
    <AppShell>
      <Header
        title={activeJob ? `${activeJob.title} · Pipeline` : "Recruitment Pipeline"}
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Job roles", href: "/jobs" },
          { label: activeJob ? activeJob.title : "All roles", href: activeJob ? `/jobs/${activeJob.id}` : "/jobs" },
          { label: "Kanban Pipeline" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadPipelineData}
              disabled={loading}
              className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 cursor-pointer"
              title="Refresh pipeline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              to="/upload-cv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload CV</span>
            </Link>
          </div>
        }
      />

      <main className="w-full max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
        {/* Role & Filter Control Strip */}
        <div className="bg-white rounded-md border border-slate-200/90 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-slate-500">Opening:</span>
            <select
              value={selectedJobId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedJobId(newId);
                navigate(newId === "all" ? "/pipeline" : `/pipeline/${newId}`);
              }}
              className="px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 bg-white font-semibold focus:outline-none focus:border-brand-500 max-w-sm truncate"
            >
              <option value="all">All Active Positions</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.department})
                </option>
              ))}
            </select>

            {activeJob && (
              <span className="text-xs text-slate-500 hidden md:inline">
                {activeJob.department} · {activeJob.location || "Corporate HQ"} ({activeJob.work_mode || "Hybrid"})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Filter cards..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500"
              />
            </div>

            {/* Score Filter */}
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value as any)}
              className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 font-medium focus:outline-none"
            >
              <option value="all">All Scores</option>
              <option value="top">Top Fit (≥70%)</option>
              <option value="pass">Experience Met</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs bg-stone-50 border border-stone-200 text-stone-800 rounded-md font-medium">
            {error}
          </div>
        )}

        {/* 8-Stage Kanban Board */}
        <div className="flex gap-3 overflow-x-auto pb-4 pt-1 items-start min-h-[68vh]">
          {PIPELINE_COLUMNS.map((column) => {
            const columnCandidates = filteredCandidates.filter((c) =>
              column.statuses.includes(c.current_status as ApplicationStatus)
            );

            return (
              <div
                key={column.key}
                className="w-72 shrink-0 bg-slate-50/80 rounded-lg border border-slate-200 flex flex-col max-h-[75vh]"
              >
                {/* Column Header */}
                <div className="px-3.5 py-3 border-b border-slate-200/80 bg-white rounded-t-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900">
                      {column.label}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-tabular ${column.badgeColor}`}
                    >
                      {columnCandidates.length}
                    </span>
                  </div>
                </div>

                {/* Column Cards Container */}
                <div className="p-2 space-y-2.5 overflow-y-auto flex-1">
                  {columnCandidates.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-slate-400 italic">
                      No candidates in this stage
                    </div>
                  ) : (
                    columnCandidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className="bg-white rounded-md border border-slate-200/90 p-3 shadow-2xs hover:shadow-xs transition space-y-2 text-xs"
                      >
                        {/* Card Top: Candidate name & Match score */}
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedAppId(candidate.id)}
                            className="font-medium text-slate-900 hover:text-brand-600 text-left line-clamp-1 transition cursor-pointer"
                          >
                            {candidate.candidate_name}
                          </button>
                          <ScoreIndicator score={candidate.screening_score} size="sm" />
                        </div>

                        {/* Role Title & Ref */}
                        <div className="text-[11px] text-slate-500">
                          <span className="line-clamp-1">{candidate.job_title}</span>
                          <span className="font-mono text-[10px] text-slate-400">
                            {candidate.reference_number || "Ref pending"}
                          </span>
                        </div>

                        {/* Missing Skills Warning Pill */}
                        {candidate.missing_skills && candidate.missing_skills.length > 0 && (
                          <div className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 line-clamp-1">
                            Missing: {candidate.missing_skills.slice(0, 2).join(", ")}
                          </div>
                        )}

                        {/* Card Footer Actions */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                          <div className="flex items-center gap-1">
                            {candidate.resume_id && (
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewResumeState({
                                    isOpen: true,
                                    resumeId: candidate.resume_id,
                                    candidateName: candidate.candidate_name,
                                  })
                                }
                                className="px-1.5 py-0.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                                title="Preview PDF resume inline"
                              >
                                PDF
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelectedAppId(candidate.id)}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer"
                              title="Open dossier"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Progression Actions by Column */}
                          <div className="flex items-center gap-1">
                            {column.key === "APPLIED" && (
                              <button
                                type="button"
                                onClick={() => handleShortlist(candidate)}
                                disabled={actionLoading}
                                className="px-2 py-0.5 bg-brand-500 text-white rounded text-[11px] font-medium hover:bg-brand-600 transition cursor-pointer"
                              >
                                Shortlist
                              </button>
                            )}

                            {column.key === "SCREENING" && (
                              <button
                                type="button"
                                onClick={() => handleShortlist(candidate)}
                                disabled={actionLoading}
                                className="px-2 py-0.5 bg-brand-500 text-white rounded text-[11px] font-medium hover:bg-brand-600 transition cursor-pointer"
                              >
                                Shortlist
                              </button>
                            )}

                            {column.key === "SHORTLISTED" && (
                              <Link
                                to={`/interviews?candidate_id=${candidate.id}`}
                                className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[11px] font-medium hover:bg-indigo-700 transition"
                              >
                                Schedule
                              </Link>
                            )}

                            {column.key === "INTERVIEW_COMPLETED" && (
                              <button
                                type="button"
                                onClick={() => handleMakeOffer(candidate)}
                                disabled={actionLoading}
                                className="px-2 py-0.5 bg-amber-600 text-white rounded text-[11px] font-medium hover:bg-amber-700 transition cursor-pointer"
                              >
                                Make Offer
                              </button>
                            )}

                            {column.key === "OFFER_EXTENDED" && (
                              <button
                                type="button"
                                onClick={() => handleAcceptOffer(candidate)}
                                disabled={actionLoading}
                                className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-medium hover:bg-emerald-700 transition cursor-pointer"
                              >
                                Accept & Hire
                              </button>
                            )}

                            {column.key === "HIRED" && (
                              <button
                                type="button"
                                onClick={() => handleHandoffClick(candidate)}
                                className="px-2 py-0.5 bg-emerald-700 text-white rounded text-[10px] font-semibold hover:bg-emerald-800 transition cursor-pointer"
                                title="Transfer to Employee Onboarding"
                              >
                                Handoff to HRMS
                              </button>
                            )}

                            {column.key !== "REJECTED" && column.key !== "HIRED" && (
                              <button
                                type="button"
                                onClick={() =>
                                  setRejectModalState({
                                    isOpen: true,
                                    candidateId: candidate.id,
                                    candidateName: candidate.candidate_name,
                                  })
                                }
                                disabled={actionLoading}
                                className="p-1 text-slate-400 hover:text-stone-700 rounded transition cursor-pointer"
                                title="Reject"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Candidate Profile Slide-over Drawer */}
      <CandidateProfileDrawer
        applicationId={selectedAppId}
        isOpen={Boolean(selectedAppId)}
        onClose={() => setSelectedAppId(null)}
        onStatusUpdated={loadPipelineData}
      />

      {/* Inline Resume PDF Streaming Viewer */}
      <ResumePreviewModal
        resumeId={previewResumeState.resumeId}
        candidateName={previewResumeState.candidateName}
        isOpen={previewResumeState.isOpen}
        onClose={() => setPreviewResumeState({ isOpen: false })}
      />

      {/* Rejection Audit Modal */}
      <RejectionModal
        isOpen={rejectModalState.isOpen}
        onClose={() => setRejectModalState({ isOpen: false })}
        onConfirm={handleConfirmRejection}
        candidateName={rejectModalState.candidateName}
        isLoading={actionLoading}
      />
    </AppShell>
  );
}
