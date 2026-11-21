import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Briefcase,
  CalendarCheck,
  CalendarDays,
  Eye,
  FileUp,
  Loader2,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Users,
  Video,
} from "lucide-react";
import AppShell from "../components/layout/AppShell";
import Header from "../components/layout/Header";
import ScoreIndicator from "../components/ui/ScoreIndicator";
import RejectionModal from "../components/common/RejectionModal";
import {
  getTodayInterviews,
  listAllJobs,
  listApplications,
  listInterviews,
  rejectApplication,
  screenApplication,
  shortlistApplication,
} from "../lib/api";
import { ApplicationListItem, InterviewItem, JobRole, RejectionReason } from "../lib/types";

export default function Dashboard() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [todayInterviews, setTodayInterviews] = useState<InterviewItem[] | null>(null);
  const [upcomingWeekCount, setUpcomingWeekCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [triageTab, setTriageTab] = useState<"needs_review" | "all" | "shortlisted">("needs_review");

  const [rejectModalState, setRejectModalState] = useState<{
    isOpen: boolean;
    candidateId?: string;
    candidateName?: string;
  }>({ isOpen: false });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const now = new Date();
      const todayIso = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0)
      ).toISOString();
      const weekFromNow = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7, 23, 59, 59)
      ).toISOString();

      const [jobsData, appsData, todayInterviewsData, weekInterviewsData] = await Promise.all([
        listAllJobs(),
        listApplications({ limit: 100 }),
        getTodayInterviews().catch(() => []),
        listInterviews({ date_from: todayIso, date_to: weekFromNow, status: "scheduled" }).catch(() => []),
      ]);

      setJobs(jobsData || []);
      setApplications(appsData.items || []);
      setTodayInterviews(todayInterviewsData || []);
      setUpcomingWeekCount(Array.isArray(weekInterviewsData) ? weekInterviewsData.length : 0);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const openRoles = jobs.filter((j) => j.status === "published");
  const draftRoles = jobs.filter((j) => j.status === "draft");
  const closedRoles = jobs.filter((j) => j.status === "closed");

  const needsReviewApps = applications.filter(
    (a) => a.current_status === "SCREENED" || a.current_status === "APPLIED"
  );
  const topMatchPending = needsReviewApps.filter(
    (a) => (a.screening_score ?? 0) >= 70
  );
  const shortlistedApps = applications.filter(
    (a) => a.current_status === "SHORTLISTED"
  );

  const todayStr = new Date().toISOString().split("T")[0];
  const todayApps = applications.filter(
    (a) => a.applied_at && a.applied_at.startsWith(todayStr)
  );

  const handleQuickShortlist = async (id: string, currentStatus: string) => {
    try {
      setActionLoading(true);
      if (currentStatus === "APPLIED") {
        await screenApplication(id, "Auto-screened on dashboard shortlist");
      }
      await shortlistApplication(id, "Shortlisted directly from dashboard triage");
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to shortlist candidate");
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (id: string, name: string) => {
    setRejectModalState({
      isOpen: true,
      candidateId: id,
      candidateName: name,
    });
  };

  const handleConfirmRejection = async (reason: RejectionReason, remarks: string) => {
    if (!rejectModalState.candidateId) return;
    try {
      setActionLoading(true);
      await rejectApplication(rejectModalState.candidateId, reason, remarks);
      setRejectModalState({ isOpen: false });
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || "Failed to record rejection");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return isoString;
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const isWithinNext2Hours = (isoString?: string) => {
    if (!isoString) return false;
    try {
      const interviewTime = new Date(isoString).getTime();
      const now = Date.now();
      const diffMs = interviewTime - now;
      return diffMs > 0 && diffMs <= 2 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  };

  const getDisplayedCandidates = () => {
    if (triageTab === "needs_review") {
      return [...needsReviewApps].sort(
        (a, b) => (b.screening_score ?? -1) - (a.screening_score ?? -1)
      );
    }
    if (triageTab === "shortlisted") {
      return [...shortlistedApps].sort(
        (a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()
      );
    }
    return [...applications].sort(
      (a, b) => new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime()
    );
  };

  const displayedCandidates = getDisplayedCandidates();

  return (
    <AppShell>
      <Header
        title="Recruitment mission control"
        breadcrumbs={[{ label: "Overview" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadDashboardData}
              disabled={loading}
              className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 cursor-pointer"
              title="Refresh dashboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              to="/upload-cv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-200 transition"
            >
              <FileUp className="w-3.5 h-3.5 text-slate-500" />
              <span>Upload emailed CV</span>
            </Link>
            <Link
              to="/jobs/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create role</span>
            </Link>
          </div>
        }
      />

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {error && (
          <div className="p-3 text-xs bg-stone-50 border border-stone-200 text-stone-800 rounded-md font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-brand-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Operational Triage Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white p-4 rounded-md border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-medium text-slate-700">
                Awaiting HR decision
              </span>
              <span className="w-2 h-2 rounded-full bg-signal-screened" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-950 font-tabular">
                {loading ? "--" : needsReviewApps.length}
              </span>
              <span className="text-xs text-slate-500 font-tabular">
                in queue
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="font-tabular">
                <strong className="text-brand-600 font-semibold">{topMatchPending.length}</strong> top matches (≥70%)
              </span>
              <button
                type="button"
                onClick={() => setTriageTab("needs_review")}
                className="text-slate-700 hover:text-slate-950 font-medium underline text-xs cursor-pointer"
              >
                Review queue
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-md border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-medium text-slate-700">
                Upcoming this week
              </span>
              <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-950 font-tabular">
                {loading ? "--" : upcomingWeekCount}
              </span>
              <span className="text-xs text-slate-500 font-tabular">
                scheduled
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-tabular">
              <span>Next 7 days</span>
              <button
                type="button"
                onClick={() => setTriageTab("shortlisted")}
                className="text-slate-700 hover:text-slate-950 font-medium text-xs underline cursor-pointer"
              >
                View list
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-md border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-medium text-slate-700">
                Shortlisted candidates
              </span>
              <span className="w-2 h-2 rounded-full bg-brand-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-950 font-tabular">
                {loading ? "--" : shortlistedApps.length}
              </span>
              <span className="text-xs text-slate-500 font-tabular">
                for interview
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Ready for scheduling</span>
              <button
                type="button"
                onClick={() => setTriageTab("shortlisted")}
                className="text-slate-700 hover:text-slate-950 font-medium underline text-xs cursor-pointer"
              >
                View list
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-md border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-medium text-slate-700">
                Published job roles
              </span>
              <span className="w-2 h-2 rounded-full bg-signal-published" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-950 font-tabular">
                {loading ? "--" : openRoles.length}
              </span>
              <span className="text-xs text-slate-500 font-tabular">
                open
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-tabular">
              <span>{draftRoles.length} draft · {closedRoles.length} closed</span>
              <Link to="/jobs" className="text-slate-700 hover:text-slate-950 font-medium">
                Manage all
              </Link>
            </div>
          </div>

          <div className="bg-white p-4 rounded-md border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1.5">
              <span className="text-xs font-medium text-slate-700">
                Daily candidate intake
              </span>
              <span className="w-2 h-2 rounded-full bg-slate-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-950 font-tabular">
                {loading ? "--" : todayApps.length}
              </span>
              <span className="text-xs text-slate-500 font-tabular">
                received today
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-tabular">
              <span>{applications.length} total in talent bank</span>
              <Link to="/cv-bank" className="text-slate-700 hover:text-slate-950 font-medium">
                CV bank
              </Link>
            </div>
          </div>
        </div>

        {/* Today's Interviews Strip */}
        {todayInterviews !== null && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold text-slate-900 tracking-tight">
                  Today's Interviews
                </h2>
                {todayInterviews.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 font-tabular">
                    {todayInterviews.length}
                  </span>
                )}
              </div>
            </div>

            {todayInterviews.length === 0 ? (
              <div className="bg-white rounded-lg border border-slate-200 p-4 flex items-center gap-2 text-xs text-slate-500">
                <CalendarCheck className="w-4 h-4 text-slate-400 shrink-0" />
                <span>No interviews scheduled for today</span>
              </div>
            ) : (
              <div className="flex md:grid md:grid-cols-4 gap-4 overflow-x-auto md:overflow-hidden pb-2 md:pb-0">
                {todayInterviews.slice(0, 4).map((interview) => {
                  const within2Hours = isWithinNext2Hours(interview.scheduled_at);
                  return (
                    <div
                      key={interview.id}
                      className="min-w-[240px] md:min-w-0 bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3
                            className="font-medium text-slate-900 text-sm truncate flex-1"
                            title={interview.candidate_name || "Candidate"}
                          >
                            {interview.candidate_name || "Candidate"}
                          </h3>
                          <span
                            className={`font-mono text-sm font-bold shrink-0 ${
                              within2Hours ? "text-[#F4511E]" : "text-slate-900"
                            }`}
                          >
                            {formatTime(interview.scheduled_at)}
                          </span>
                        </div>
                        <p
                          className="text-sm text-slate-500 truncate"
                          title={interview.job_title || "Role"}
                        >
                          {interview.job_title || "Role"}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2">
                          {interview.mode === "video" && (
                            <span className="inline-flex items-center gap-1 text-slate-600">
                              <Video className="w-3.5 h-3.5 text-slate-400" />
                              <span>Video</span>
                            </span>
                          )}
                          {interview.mode === "phone" && (
                            <span className="inline-flex items-center gap-1 text-slate-600">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>Phone</span>
                            </span>
                          )}
                          {interview.mode === "in_person" && (
                            <span className="inline-flex items-center gap-1 text-slate-600">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>In Person</span>
                            </span>
                          )}
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-400 font-tabular">
                            {interview.duration_minutes || 60} min
                          </span>
                        </div>

                        <Link
                          to={`/candidates/${interview.candidate_id || interview.application_id}`}
                          className="inline-flex items-center text-xs font-medium text-slate-700 hover:text-slate-950 transition"
                        >
                          → View
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 2. Main Workload Section (7 : 5 Balanced Layout) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (7 cols): Direct Action Stream / Triage Inbox */}
          <div className="lg:col-span-7 bg-white rounded-md border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-semibold text-slate-900 tracking-tight">
                  Triage queue
                </h2>
              </div>

              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setTriageTab("needs_review")}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    triageTab === "needs_review"
                      ? "bg-slate-900 text-white font-medium"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Needs review ({needsReviewApps.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTriageTab("shortlisted")}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    triageTab === "shortlisted"
                      ? "bg-slate-900 text-white font-medium"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Shortlisted ({shortlistedApps.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTriageTab("all")}
                  className={`px-2.5 py-1 rounded transition cursor-pointer ${
                    triageTab === "all"
                      ? "bg-slate-900 text-white font-medium"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Recent all
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-12 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                  <span className="text-xs">Loading candidate queue...</span>
                </div>
              ) : displayedCandidates.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  {triageTab === "needs_review"
                    ? "All caught up! No candidate applications currently awaiting review."
                    : "No candidates found in this queue."}
                </div>
              ) : (
                displayedCandidates.slice(0, 8).map((app) => {
                  const isHardFail = app.hard_filter_passed === false;
                  const isShortlisted = app.current_status === "SHORTLISTED";
                  const isTerminal = app.current_status === "REJECTED" || app.current_status === "OFFER_ACCEPTED";

                  return (
                    <div
                      key={app.id}
                      className="p-4 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/candidates/${app.id}`}
                            className="font-medium text-xs text-slate-900 hover:text-brand-600 transition truncate"
                          >
                            {app.candidate_name}
                          </Link>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500 truncate">
                            {app.job_title}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 truncate font-sans">
                          {app.matched_skills && app.matched_skills.length > 0 ? (
                            <span>{app.matched_skills.slice(0, 3).join(", ")}</span>
                          ) : (
                            <span className="text-slate-400">Skills pending parse</span>
                          )}
                          <span className="text-slate-300 mx-1.5">/</span>
                          <span className="text-slate-400 font-tabular">{formatDate(app.applied_at)}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <ScoreIndicator score={app.screening_score} size="sm" />
                          <div className="text-[10px] text-slate-400">
                            {isHardFail ? "Exp gap" : app.screening_score !== null ? "Fit score" : "Queued"}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200/80">
                          {!isShortlisted && !isTerminal && (
                            <button
                              type="button"
                              onClick={() => handleQuickShortlist(app.id, app.current_status)}
                              disabled={actionLoading}
                              className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-brand-600 hover:border-brand-300 text-[11px] font-medium transition disabled:opacity-50 cursor-pointer"
                              title="Shortlist for interview"
                            >
                              Shortlist
                            </button>
                          )}

                          {!isTerminal && (
                            <button
                              type="button"
                              onClick={() => handleOpenReject(app.id, app.candidate_name)}
                              disabled={actionLoading}
                              className="px-2 py-1 rounded text-slate-400 hover:text-stone-800 hover:bg-slate-100 text-[11px] font-medium transition disabled:opacity-50 cursor-pointer"
                              title="Reject candidate"
                            >
                              Reject
                            </button>
                          )}

                          <Link
                            to={`/candidates/${app.id}`}
                            className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                            title="Open candidate dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {displayedCandidates.length > 8 && (
              <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
                <Link
                  to="/cv-bank"
                  className="text-xs font-medium text-slate-700 hover:text-slate-950 underline"
                >
                  View all {displayedCandidates.length} candidates in talent bank
                </Link>
              </div>
            )}
          </div>

          {/* Right Column (5 cols): Active Hiring Pipelines & Launchpad */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-md border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-slate-500" />
                  <h2 className="text-xs font-semibold text-slate-900 tracking-tight">
                    Active hiring pipelines
                  </h2>
                </div>
                <Link
                  to="/jobs"
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 transition"
                >
                  Manage all
                </Link>
              </div>

              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="p-8 text-center text-slate-400 text-xs">Loading roles...</div>
                ) : openRoles.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No active job roles published.
                  </div>
                ) : (
                  openRoles.slice(0, 5).map((role) => {
                    const roleApps = applications.filter((a) => a.job_role_id === role.id);
                    const roleShortlisted = roleApps.filter((a) => a.current_status === "SHORTLISTED").length;
                    const roleInReview = roleApps.filter(
                      (a) => a.current_status === "SCREENED" || a.current_status === "APPLIED"
                    ).length;

                    return (
                      <div key={role.id} className="p-4 hover:bg-slate-50/70 transition space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Link
                              to={`/pipeline/${role.id}`}
                              className="font-medium text-xs text-slate-900 hover:text-brand-600 block transition"
                            >
                              {role.title}
                            </Link>
                            <span className="text-[11px] text-slate-400">
                              {role.department} · {role.location || "Corporate HQ"}
                            </span>
                          </div>

                          <Link
                            to={`/pipeline/${role.id}`}
                            className="px-2 py-1 text-[11px] font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition shrink-0"
                          >
                            Pipeline
                          </Link>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-tabular">
                          <span>
                            <strong>{role.applications_count}</strong> applied
                          </span>
                          <span>·</span>
                          <span className="text-amber-700 font-medium">
                            {roleInReview} in review
                          </span>
                          <span>·</span>
                          <span className="text-brand-600 font-semibold">
                            {roleShortlisted} shortlisted
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-white rounded-md border border-slate-200/90 p-4 shadow-2xs space-y-2.5">
              <span className="text-xs font-semibold text-slate-900 block">
                Quick actions
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  to="/jobs/new"
                  className="p-2.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-medium flex items-center gap-2 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-brand-500" />
                  <span>Create role</span>
                </Link>

                <Link
                  to="/upload-cv"
                  className="p-2.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-medium flex items-center gap-2 transition"
                >
                  <FileUp className="w-3.5 h-3.5 text-slate-500" />
                  <span>Upload CV</span>
                </Link>

                <Link
                  to="/cv-bank"
                  className="p-2.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-medium flex items-center gap-2 transition"
                >
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  <span>CV bank query</span>
                </Link>

                <Link
                  to="/jobs"
                  className="p-2.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-medium flex items-center gap-2 transition"
                >
                  <Briefcase className="w-3.5 h-3.5 text-slate-500" />
                  <span>All positions</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

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
