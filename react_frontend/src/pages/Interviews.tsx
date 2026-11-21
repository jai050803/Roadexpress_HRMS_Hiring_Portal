import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Star,
  Users,
  Video,
  X,
} from "lucide-react";
import AppShell from "../components/layout/AppShell";
import Header from "../components/layout/Header";
import ScheduleInterviewModal from "../components/interviews/ScheduleInterviewModal";
import RescheduleInterviewModal from "../components/interviews/RescheduleInterviewModal";
import CancelInterviewModal from "../components/interviews/CancelInterviewModal";
import InterviewFeedbackModal from "../components/interviews/InterviewFeedbackModal";
import {
  completeInterview,
  getTodayInterviews,
  listAllJobs,
  listInterviews,
  markInterviewNoShow,
} from "../lib/api";
import { InterviewItem, JobRole } from "../lib/types";

export default function Interviews() {
  const [searchParams] = useSearchParams();
  const preselectedCandidateId = searchParams.get("candidate_id");

  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week">("all");

  // Modals
  const [isScheduleOpen, setIsScheduleOpen] = useState(Boolean(preselectedCandidateId));
  const [feedbackState, setFeedbackState] = useState<{
    isOpen: boolean;
    interviewId: string;
    candidateName: string;
    jobTitle?: string;
  }>({ isOpen: false, interviewId: "", candidateName: "" });

  const [rescheduleState, setRescheduleState] = useState<{
    isOpen: boolean;
    interviewId: string;
    candidateName: string;
    scheduledAt?: string;
    meetingLink?: string;
  }>({ isOpen: false, interviewId: "", candidateName: "" });

  const [cancelState, setCancelState] = useState<{
    isOpen: boolean;
    interviewId: string;
    candidateName: string;
  }>({ isOpen: false, interviewId: "", candidateName: "" });

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, any> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (roleFilter !== "all") params.job_role_id = roleFilter;

      if (dateFilter === "today") {
        const todayIso = new Date().toISOString().split("T")[0];
        params.date_from = `${todayIso}T00:00:00.000Z`;
        params.date_to = `${todayIso}T23:59:59.999Z`;
      } else if (dateFilter === "week") {
        const now = new Date();
        params.date_from = now.toISOString();
        const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        params.date_to = week.toISOString();
      }

      const [interviewsData, jobsData] = await Promise.all([
        listInterviews(params),
        listAllJobs(),
      ]);

      setInterviews(interviewsData || []);
      setJobs(jobsData || []);
    } catch (err: any) {
      setError(err.message || "Failed to load interviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, roleFilter, dateFilter]);

  const handleComplete = async (interviewId: string) => {
    try {
      setActionLoading(interviewId);
      await completeInterview(interviewId);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to mark interview as completed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleNoShow = async (interviewId: string) => {
    if (!window.confirm("Mark candidate as no-show for this interview round?")) return;
    try {
      setActionLoading(interviewId);
      await markInterviewNoShow(interviewId);
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record no-show");
    } finally {
      setActionLoading(null);
    }
  };

  const isWithinNext2Hours = (isoString?: string) => {
    if (!isoString) return false;
    try {
      const t = new Date(isoString).getTime();
      const now = Date.now();
      const diff = t - now;
      return diff > 0 && diff <= 2 * 60 * 60 * 1000;
    } catch {
      return false;
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "--";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const scheduledCount = interviews.filter((i) => i.status === "scheduled").length;
  const completedCount = interviews.filter((i) => i.status === "completed").length;
  const cancelledCount = interviews.filter((i) => i.status === "cancelled").length;

  return (
    <AppShell>
      <Header
        title="Interviews & Candidate Evaluation"
        breadcrumbs={[{ label: "Overview", href: "/dashboard" }, { label: "Interviews" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 cursor-pointer"
              title="Refresh interviews"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsScheduleOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule Interview</span>
            </button>
          </div>
        }
      />

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Metric Summary Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-md border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Total Interviews</span>
            <span className="text-xl font-semibold text-slate-900 font-tabular">{interviews.length}</span>
          </div>
          <div className="bg-white p-3.5 rounded-md border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Scheduled Upcoming</span>
            <span className="text-xl font-semibold text-indigo-600 font-tabular">{scheduledCount}</span>
          </div>
          <div className="bg-white p-3.5 rounded-md border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Completed</span>
            <span className="text-xl font-semibold text-emerald-600 font-tabular">{completedCount}</span>
          </div>
          <div className="bg-white p-3.5 rounded-md border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Cancelled / No-show</span>
            <span className="text-xl font-semibold text-stone-500 font-tabular">{cancelledCount}</span>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-md border border-slate-200/90 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200/60 font-medium">
            {["all", "scheduled", "completed", "cancelled"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded capitalize transition cursor-pointer ${
                  statusFilter === s
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Date & Role Selectors */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-slate-500">Date:</span>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 font-medium"
              >
                <option value="all">All Dates</option>
                <option value="today">Today Only</option>
                <option value="week">Next 7 Days</option>
              </select>
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 font-medium max-w-xs truncate"
            >
              <option value="all">All Job Positions</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs bg-stone-50 border border-stone-200 text-stone-800 rounded-md font-medium">
            {error}
          </div>
        )}

        {/* Interview Cards Grid */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-16 text-center text-slate-400 bg-white rounded-md border border-slate-200">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
              <span className="text-xs">Loading scheduled interviews...</span>
            </div>
          ) : interviews.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-white rounded-md border border-slate-200 text-xs">
              No interview rounds match the selected criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {interviews.map((interview) => {
                const within2Hours = isWithinNext2Hours(interview.scheduled_at);
                const isScheduled = interview.status === "scheduled";
                const isCompleted = interview.status === "completed";

                return (
                  <div
                    key={interview.id}
                    className="bg-white rounded-md border border-slate-200/90 p-4 shadow-2xs hover:shadow-xs transition flex flex-col justify-between gap-3 text-xs"
                  >
                    <div>
                      {/* Card Header: Candidate & Round Badge */}
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <Link
                          to={`/candidates/${interview.application_id || interview.candidate_id}`}
                          className="font-semibold text-slate-900 text-sm hover:text-brand-600 transition truncate"
                        >
                          {interview.candidate_name || "Candidate"}
                        </Link>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 font-tabular shrink-0">
                          Round {interview.round_number || 1}
                        </span>
                      </div>

                      <p className="text-slate-500 truncate mb-2">
                        {interview.job_title || "Target Opening"}
                      </p>

                      {/* Date & Time */}
                      <div className="flex items-center gap-2 text-slate-700 pt-2 border-t border-slate-100">
                        <Clock className={`w-3.5 h-3.5 ${within2Hours ? "text-brand-500 animate-pulse" : "text-slate-400"}`} />
                        <span
                          className={`font-medium font-tabular ${
                            within2Hours ? "text-brand-600 font-bold" : "text-slate-900"
                          }`}
                        >
                          {formatDateTime(interview.scheduled_at)}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500 font-tabular">{interview.duration_minutes || 60}m</span>
                      </div>

                      {/* Meeting Mode & Link */}
                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1.5">
                        <div className="flex items-center gap-1.5">
                          {interview.mode === "video" && <Video className="w-3.5 h-3.5 text-slate-400" />}
                          {interview.mode === "phone" && <Phone className="w-3.5 h-3.5 text-slate-400" />}
                          {interview.mode === "in_person" && <MapPin className="w-3.5 h-3.5 text-slate-400" />}
                          <span className="capitalize">{interview.mode?.replace("_", " ") || "Video"}</span>
                        </div>

                        {interview.meeting_link && (
                          <a
                            href={interview.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-500 hover:text-brand-600 font-medium inline-flex items-center gap-1"
                          >
                            <span>Join Meeting</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                      <div className="flex items-center gap-1">
                        <Link
                          to={`/candidates/${interview.application_id || interview.candidate_id}`}
                          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
                          title="Open candidate dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isScheduled && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                setFeedbackState({
                                  isOpen: true,
                                  interviewId: interview.id,
                                  candidateName: interview.candidate_name || "Candidate",
                                  jobTitle: interview.job_title,
                                })
                              }
                              className="px-2 py-1 rounded bg-slate-900 text-white font-medium hover:bg-slate-800 transition cursor-pointer"
                            >
                              Scorecard
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setRescheduleState({
                                  isOpen: true,
                                  interviewId: interview.id,
                                  candidateName: interview.candidate_name || "Candidate",
                                  scheduledAt: interview.scheduled_at,
                                  meetingLink: interview.meeting_link,
                                })
                              }
                              className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                            >
                              Reschedule
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                setCancelState({
                                  isOpen: true,
                                  interviewId: interview.id,
                                  candidateName: interview.candidate_name || "Candidate",
                                })
                              }
                              className="p-1 text-slate-400 hover:text-stone-700 rounded transition cursor-pointer"
                              title="Cancel interview"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}

                        {isCompleted && (
                          <button
                            type="button"
                            onClick={() =>
                              setFeedbackState({
                                isOpen: true,
                                interviewId: interview.id,
                                candidateName: interview.candidate_name || "Candidate",
                                jobTitle: interview.job_title,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium hover:bg-emerald-100 transition cursor-pointer"
                          >
                            <Star className="w-3 h-3 text-emerald-600" />
                            <span>Scorecard</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <ScheduleInterviewModal
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        applicationId={preselectedCandidateId || undefined}
        onSuccess={() => loadData()}
      />

      <RescheduleInterviewModal
        isOpen={rescheduleState.isOpen}
        onClose={() => setRescheduleState({ isOpen: false, interviewId: "", candidateName: "" })}
        interviewId={rescheduleState.interviewId}
        candidateName={rescheduleState.candidateName}
        initialScheduledAt={rescheduleState.scheduledAt}
        initialMeetingLink={rescheduleState.meetingLink}
        onSuccess={() => loadData()}
      />

      <CancelInterviewModal
        isOpen={cancelState.isOpen}
        onClose={() => setCancelState({ isOpen: false, interviewId: "", candidateName: "" })}
        interviewId={cancelState.interviewId}
        candidateName={cancelState.candidateName}
        onSuccess={() => loadData()}
      />

      <InterviewFeedbackModal
        isOpen={feedbackState.isOpen}
        onClose={() => setFeedbackState({ isOpen: false, interviewId: "", candidateName: "" })}
        interviewId={feedbackState.interviewId}
        candidateName={feedbackState.candidateName}
        jobTitle={feedbackState.jobTitle}
        onSuccess={() => loadData()}
      />
    </AppShell>
  );
}
