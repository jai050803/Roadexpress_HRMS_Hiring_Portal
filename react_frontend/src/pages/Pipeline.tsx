import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CalendarClock,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Filter,
  LayoutGrid,
  List,
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
import { useHandoff } from "../integration/handoffIntegration";
import {
  acceptOffer,
  bulkReject,
  bulkShortlist,
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
  const [viewMode, setViewMode] = useState<"table" | "kanban">("table");
  const [stageTab, setStageTab] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const handleBulkShortlist = async () => {
    if (selectedIds.size === 0) return;
    try {
      setActionLoading(true);
      await bulkShortlist(Array.from(selectedIds));
      setSelectedIds(new Set());
      await loadPipelineData();
    } catch (err: any) {
      alert(err.message || "Failed to bulk shortlist candidates");
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkReject = () => {
    if (selectedIds.size === 0) return;
    setRejectModalState({
      isOpen: true,
      candidateId: Array.from(selectedIds)[0],
      candidateName: `${selectedIds.size} selected candidates`,
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

  const stageCounts = {
    ALL: filteredCandidates.length,
    NEEDS_REVIEW: filteredCandidates.filter(
      (c) => c.current_status === "APPLIED" || c.current_status === "SCREENING" || c.current_status === "SCREENED"
    ).length,
    SHORTLISTED: filteredCandidates.filter((c) => c.current_status === "SHORTLISTED").length,
    INTERVIEWING: filteredCandidates.filter(
      (c) =>
        c.current_status === "INTERVIEW_SCHEDULED" ||
        c.current_status === "INTERVIEW_COMPLETED" ||
        c.current_status === "INTERVIEWED"
    ).length,
    OFFER_HIRED: filteredCandidates.filter(
      (c) =>
        c.current_status === "OFFER_EXTENDED" ||
        c.current_status === "HIRED" ||
        c.current_status === "OFFER_ACCEPTED"
    ).length,
    REJECTED: filteredCandidates.filter(
      (c) =>
        c.current_status === "REJECTED" ||
        c.current_status === "OFFER_DECLINED" ||
        c.current_status === "OFFER_LAPSED"
    ).length,
  };

  const tableCandidates = filteredCandidates.filter((c) => {
    if (stageTab === "NEEDS_REVIEW") {
      return c.current_status === "APPLIED" || c.current_status === "SCREENING" || c.current_status === "SCREENED";
    }
    if (stageTab === "SHORTLISTED") {
      return c.current_status === "SHORTLISTED";
    }
    if (stageTab === "INTERVIEWING") {
      return (
        c.current_status === "INTERVIEW_SCHEDULED" ||
        c.current_status === "INTERVIEW_COMPLETED" ||
        c.current_status === "INTERVIEWED"
      );
    }
    if (stageTab === "OFFER_HIRED") {
      return (
        c.current_status === "OFFER_EXTENDED" ||
        c.current_status === "HIRED" ||
        c.current_status === "OFFER_ACCEPTED"
      );
    }
    if (stageTab === "REJECTED") {
      return (
        c.current_status === "REJECTED" ||
        c.current_status === "OFFER_DECLINED" ||
        c.current_status === "OFFER_LAPSED"
      );
    }
    return true;
  });

  const stageTabs = [
    { id: "ALL", label: "All candidates", count: stageCounts.ALL },
    { id: "NEEDS_REVIEW", label: "Needs review", count: stageCounts.NEEDS_REVIEW },
    { id: "SHORTLISTED", label: "Shortlisted", count: stageCounts.SHORTLISTED },
    { id: "INTERVIEWING", label: "Interviewing", count: stageCounts.INTERVIEWING },
    { id: "OFFER_HIRED", label: "Offer / Hired", count: stageCounts.OFFER_HIRED },
    { id: "REJECTED", label: "Rejected", count: stageCounts.REJECTED },
  ];

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
            {/* View Mode Switcher */}
            <div className="flex items-center border border-slate-200 rounded-md overflow-hidden bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition cursor-pointer ${
                  viewMode === "table"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Table list view"
              >
                <List className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition cursor-pointer ${
                  viewMode === "kanban"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Kanban board view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Kanban</span>
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search candidates..."
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

        {/* View Mode: Table List (Next.js style) vs Kanban Board */}
        {viewMode === "table" ? (
          <div className="space-y-4">
            {/* Stage Filter Tabs */}
            <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
              {stageTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStageTab(tab.id)}
                  className={`px-3.5 py-2 text-xs font-medium border-b-2 transition flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    stageTab === tab.id
                      ? "border-brand-500 text-brand-600 font-semibold"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-600 font-bold font-tabular">
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Candidate Table */}
            <div className="overflow-x-auto bg-white rounded-md border border-slate-200/90 shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-600 font-medium text-xs">
                    <th className="py-3 px-3.5 w-9">
                      <input
                        type="checkbox"
                        checked={tableCandidates.length > 0 && selectedIds.size === tableCandidates.length}
                        onChange={() => {
                          if (selectedIds.size === tableCandidates.length) {
                            setSelectedIds(new Set());
                          } else {
                            setSelectedIds(new Set(tableCandidates.map((c) => c.id)));
                          }
                        }}
                        aria-label="Select all"
                        className="w-3.5 h-3.5 rounded border-slate-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3.5 font-medium">Candidate</th>
                    <th className="py-3 px-3.5 font-medium w-36">Match evaluation</th>
                    <th className="py-3 px-3.5 font-medium">Verified competencies</th>
                    <th className="py-3 px-3.5 font-medium w-28">Stage</th>
                    <th className="py-3 px-3.5 font-medium w-24">Applied</th>
                    <th className="py-3 px-3.5 text-right font-medium w-52">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tableCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-14 text-center text-slate-400">
                        {loading ? "Loading candidate pipeline..." : "No candidates found matching the selected filter."}
                      </td>
                    </tr>
                  ) : (
                    tableCandidates.map((c) => {
                      const isSelected = selectedIds.has(c.id);
                      const isHardFail = c.hard_filter_passed === false;
                      const isTerminal = c.current_status === "REJECTED" || c.current_status === "OFFER_ACCEPTED";

                      return (
                        <tr
                          key={c.id}
                          className={`transition-colors ${
                            isSelected
                              ? "bg-brand-50/40"
                              : isHardFail
                              ? "bg-stone-50/50 hover:bg-stone-100/50"
                              : "hover:bg-slate-50/70"
                          }`}
                        >
                          <td className="py-3 px-3.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                const next = new Set(selectedIds);
                                if (next.has(c.id)) next.delete(c.id);
                                else next.add(c.id);
                                setSelectedIds(next);
                              }}
                              aria-label={`Select ${c.candidate_name}`}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3.5">
                            <button
                              type="button"
                              onClick={() => setSelectedAppId(c.id)}
                              className="font-medium text-slate-900 hover:text-brand-600 block transition text-xs leading-snug text-left cursor-pointer"
                            >
                              {c.candidate_name}
                            </button>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                              <span>{c.candidate_email}</span>
                              {c.candidate_phone && (
                                <>
                                  <span className="text-slate-300">/</span>
                                  <span>{c.candidate_phone}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3.5">
                            <div className="space-y-1">
                              <ScoreIndicator score={c.screening_score} size="sm" />
                              <div className="text-[11px] leading-tight">
                                {isHardFail ? (
                                  <span className="text-stone-600 font-medium">Experience gap</span>
                                ) : c.hard_filter_passed === true ? (
                                  <span className="text-slate-500">Criteria met</span>
                                ) : (
                                  <span className="text-slate-400">Pending review</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3.5 max-w-md">
                            {c.matched_skills && c.matched_skills.length > 0 ? (
                              <div className="text-xs text-slate-700 leading-relaxed font-sans">
                                <span>{c.matched_skills.slice(0, 5).join(", ")}</span>
                                {c.matched_skills.length > 5 && (
                                  <span className="text-slate-400 font-tabular ml-1">
                                    +{c.matched_skills.length - 5} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Awaiting parse</span>
                            )}
                          </td>
                          <td className="py-3 px-3.5 whitespace-nowrap">
                            <StatusBadge status={c.current_status} type="application" />
                          </td>
                          <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap font-tabular text-xs">
                            {c.applied_at ? new Date(c.applied_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "-"}
                          </td>
                          <td className="py-3 px-3.5 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              {c.resume_id && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewResumeState({ isOpen: true, resumeId: c.resume_id, candidateName: c.candidate_name })}
                                  className="px-2 py-1 text-[11px] font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:text-brand-600 transition cursor-pointer"
                                  title="Preview PDF Resume inline"
                                >
                                  PDF
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => setSelectedAppId(c.id)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition cursor-pointer"
                                title="View candidate dossier"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {(c.current_status === "APPLIED" || c.current_status === "SCREENING") && (
                                <button
                                  type="button"
                                  onClick={() => handleShortlist(c)}
                                  disabled={actionLoading}
                                  className="px-2 py-1 text-[11px] font-medium rounded-md bg-brand-500 text-white hover:bg-brand-600 transition cursor-pointer shadow-2xs"
                                >
                                  Shortlist
                                </button>
                              )}
                              {c.current_status === "SHORTLISTED" && (
                                <Link
                                  to={`/interviews?candidate_id=${c.id}`}
                                  className="px-2 py-1 text-[11px] font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition"
                                >
                                  Schedule
                                </Link>
                              )}
                              {c.current_status === "INTERVIEW_COMPLETED" && (
                                <button
                                  type="button"
                                  onClick={() => handleMakeOffer(c)}
                                  disabled={actionLoading}
                                  className="px-2 py-1 text-[11px] font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 transition cursor-pointer"
                                >
                                  Make Offer
                                </button>
                              )}
                              {c.current_status === "OFFER_EXTENDED" && (
                                <button
                                  type="button"
                                  onClick={() => handleAcceptOffer(c)}
                                  disabled={actionLoading}
                                  className="px-2 py-1 text-[11px] font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer"
                                >
                                  Hire
                                </button>
                              )}
                              {c.current_status === "HIRED" && (
                                <button
                                  type="button"
                                  onClick={() => handleHandoffClick(c)}
                                  className="px-2 py-1 text-[10px] font-semibold rounded-md bg-emerald-700 text-white hover:bg-emerald-800 transition cursor-pointer"
                                  title="Transfer to Onboarding"
                                >
                                  Handoff
                                </button>
                              )}
                              {!isTerminal && c.current_status !== "HIRED" && (
                                <button
                                  type="button"
                                  onClick={() => setRejectModalState({ isOpen: true, candidateId: c.id, candidateName: c.candidate_name })}
                                  disabled={actionLoading}
                                  className="px-2 py-1 text-[11px] font-medium rounded-md text-slate-500 hover:text-stone-800 hover:bg-slate-100 transition cursor-pointer"
                                >
                                  Reject
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Floating Bulk Action Bar */}
            {selectedIds.size > 0 && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-2.5 rounded-lg shadow-xl flex items-center gap-4 z-40 text-xs animate-in fade-in">
                <span className="font-medium">{selectedIds.size} candidate(s) selected</span>
                <button
                  type="button"
                  onClick={handleBulkShortlist}
                  disabled={actionLoading}
                  className="px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded transition cursor-pointer"
                >
                  Bulk Shortlist
                </button>
                <button
                  type="button"
                  onClick={handleBulkReject}
                  disabled={actionLoading}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded transition border border-slate-700 cursor-pointer"
                >
                  Bulk Reject
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-slate-400 hover:text-white cursor-pointer ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ) : (
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
      )}
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
