"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  CalendarPlus,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  List,
  Loader2,
  MapPin,
  Phone,
  Star,
  User,
  Video,
  X,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import CancelInterviewModal from "@/components/CancelInterviewModal";
import RescheduleInterviewModal from "@/components/RescheduleInterviewModal";
import ScheduleInterviewModal from "@/components/ScheduleInterviewModal";
import {
  completeInterview,
  listAllJobs,
  listInterviews,
  submitInterviewFeedback,
} from "@/lib/api";
import {
  InterviewFeedbackCreatePayload,
  InterviewItem,
  JobRole,
} from "@/lib/types";

type DateRangeFilter = "today" | "this_week" | "this_month" | "custom";
type StatusFilter = "all" | "scheduled" | "completed" | "cancelled" | "no_show";

export default function InterviewsPage() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [interviews, setInterviews] = useState<InterviewItem[]>([]);
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state (Default: This Week + Scheduled)
  const [dateRange, setDateRange] = useState<DateRangeFilter>("this_week");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("scheduled");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<InterviewItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<InterviewItem | null>(null);

  // Inline feedback expansion & form state
  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [feedbackForm, setFeedbackForm] = useState<InterviewFeedbackCreatePayload>({
    overall_rating: 4,
    technical_rating: 4,
    communication_rating: 4,
    culture_rating: 4,
    decision: "proceed",
    strengths: "",
    concerns: "",
    additional_notes: "",
  });
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // View existing feedback state
  const [viewFeedbackId, setViewFeedbackId] = useState<string | null>(null);

  // Calendar side panel candidate drawer
  const [drawerInterview, setDrawerInterview] = useState<InterviewItem | null>(null);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load jobs list for role filter
  useEffect(() => {
    listAllJobs()
      .then(setJobs)
      .catch(() => {});
  }, []);

  // Compute ISO date parameters based on date range filter
  const { dateFromIso, dateToIso } = useMemo(() => {
    const now = new Date();
    if (dateRange === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return { dateFromIso: start.toISOString(), dateToIso: end.toISOString() };
    }
    if (dateRange === "this_week") {
      const d = new Date(now);
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { dateFromIso: monday.toISOString(), dateToIso: sunday.toISOString() };
    }
    if (dateRange === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      return { dateFromIso: start.toISOString(), dateToIso: end.toISOString() };
    }
    if (dateRange === "custom") {
      const start = customFrom ? new Date(customFrom + "T00:00:00").toISOString() : undefined;
      const end = customTo ? new Date(customTo + "T23:59:59").toISOString() : undefined;
      return { dateFromIso: start, dateToIso: end };
    }
    return { dateFromIso: undefined, dateToIso: undefined };
  }, [dateRange, customFrom, customTo]);

  const loadInterviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listInterviews({
        status: statusFilter === "all" ? undefined : statusFilter,
        job_role_id: roleFilter === "all" ? undefined : roleFilter,
        date_from: dateFromIso,
        date_to: dateToIso,
      });
      setInterviews(data);
    } catch (err: any) {
      setError(err.message || "Failed to load interviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInterviews();
  }, [statusFilter, roleFilter, dateFromIso, dateToIso]);

  // Actions
  const handleMarkDone = async (interviewId: string) => {
    try {
      const updated = await completeInterview(interviewId);
      setInterviews((prev) =>
        prev.map((i) => (i.id === interviewId ? { ...i, status: "completed" } : i))
      );
      setToastMessage("Interview marked as completed.");
    } catch (err: any) {
      alert(err.message || "Failed to mark interview as completed.");
    }
  };

  const handleOpenFeedbackForm = (interview: InterviewItem) => {
    setActiveFeedbackId(interview.id);
    setViewFeedbackId(null);
    setFeedbackForm({
      overall_rating: 4,
      technical_rating: 4,
      communication_rating: 4,
      culture_rating: 4,
      decision: "proceed",
      strengths: "",
      concerns: "",
      additional_notes: "",
    });
  };

  const handleSubmitFeedback = async (interviewId: string) => {
    try {
      setSubmittingFeedback(true);
      const feedback = await submitInterviewFeedback(interviewId, feedbackForm);
      setInterviews((prev) =>
        prev.map((i) =>
          i.id === interviewId
            ? { ...i, feedback: [feedback, ...(i.feedback || [])] }
            : i
        )
      );
      setActiveFeedbackId(null);
      setToastMessage("Interview feedback submitted successfully.");
    } catch (err: any) {
      alert(err.message || "Failed to submit feedback: " + err.message);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      const dayName = d.toLocaleDateString("en-IN", { weekday: "short" });
      const day = d.getDate();
      const month = d.toLocaleDateString("en-IN", { month: "short" });
      const time = d.toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      return `${dayName} ${day} ${month} · ${time}`;
    } catch {
      return isoString;
    }
  };

  // Calendar week helper
  const weekDays = useMemo(() => {
    const now = new Date();
    const d = new Date(now);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);
      days.push(cur);
    }
    return days;
  }, []);

  const calendarHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

  return (
    <AppShell>
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Interviews</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Central schedule, feedback collection, and weekly calendar workspace
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* View Mode Switcher */}
            <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                  viewMode === "list"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
                  viewMode === "calendar"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendar View</span>
              </button>
            </div>

            {/* Schedule Interview Primary Button */}
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs cursor-pointer"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Schedule Interview</span>
            </button>
          </div>
        </div>

        {/* Horizontal Filters Bar */}
        <div className="bg-white rounded-md border border-slate-200/90 p-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date Range Selector */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md p-1">
              <button
                type="button"
                onClick={() => setDateRange("today")}
                className={`px-2.5 py-1 rounded transition text-xs font-medium ${
                  dateRange === "today"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDateRange("this_week")}
                className={`px-2.5 py-1 rounded transition text-xs font-medium ${
                  dateRange === "this_week"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => setDateRange("this_month")}
                className={`px-2.5 py-1 rounded transition text-xs font-medium ${
                  dateRange === "this_month"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setDateRange("custom")}
                className={`px-2.5 py-1 rounded transition text-xs font-medium ${
                  dateRange === "custom"
                    ? "bg-white text-slate-900 shadow-2xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Custom
              </button>
            </div>

            {/* Custom Date Pickers */}
            {dateRange === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-200 text-xs text-slate-800 bg-white"
                  placeholder="From"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="px-2 py-1 rounded border border-slate-200 text-xs text-slate-800 bg-white"
                  placeholder="To"
                />
              </div>
            )}

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-brand-500 font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>

            {/* Role Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-md border border-slate-200 bg-white text-xs text-slate-800 focus:outline-none focus:border-brand-500 font-medium max-w-xs truncate"
              >
                <option value="all">All Roles</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.title} ({job.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-tabular">
            {interviews.length} {interviews.length === 1 ? "interview" : "interviews"} found
          </div>
        </div>

        {/* Content Section: List View or Calendar View */}
        {loading ? (
          <div className="bg-white rounded-md border border-slate-200 p-16 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
            <span className="text-xs">Loading interviews...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700">
            {error}
          </div>
        ) : viewMode === "list" ? (
          /* ── List View Table ──────────────────────────────────────────────── */
          <div className="bg-white rounded-md border border-slate-200/90 shadow-2xs overflow-hidden">
            {interviews.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                <p className="text-xs font-medium text-slate-600">No interviews match these filters</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Try adjusting the date range, status, or job role filters above.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[11px] font-semibold">
                    <tr>
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Scheduled</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Mode</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {interviews.map((interview) => {
                      const isFeedbackFormOpen = activeFeedbackId === interview.id;
                      const isFeedbackViewOpen = viewFeedbackId === interview.id;
                      const hasFeedback = interview.feedback && interview.feedback.length > 0;
                      const latestFeedback = hasFeedback ? interview.feedback![0] : null;

                      return (
                        <React.Fragment key={interview.id}>
                          <tr className="hover:bg-slate-50/60 transition">
                            {/* Candidate */}
                            <td className="py-3.5 px-4 align-top">
                              <span className="font-semibold text-slate-900 block">
                                {interview.candidate_name || "Candidate"}
                              </span>
                              <span className="text-slate-500 text-[11px] block mt-0.5">
                                {interview.candidate_email || "-"}
                              </span>
                            </td>

                            {/* Role */}
                            <td className="py-3.5 px-4 align-top">
                              <span className="font-medium text-slate-800 block">
                                {interview.job_title || "Job Position"}
                              </span>
                              <span className="text-slate-500 text-[11px] block mt-0.5">
                                {jobs.find((j) => j.id === interview.job_role_id)?.department || "Department"}
                              </span>
                            </td>

                            {/* Scheduled */}
                            <td className="py-3.5 px-4 align-top font-tabular text-slate-800 whitespace-nowrap">
                              {formatDateTime(interview.scheduled_at)}
                            </td>

                            {/* Duration */}
                            <td className="py-3.5 px-4 align-top text-slate-600 font-tabular whitespace-nowrap">
                              {interview.duration_minutes} min
                            </td>

                            {/* Mode */}
                            <td className="py-3.5 px-4 align-top whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5 text-slate-700">
                                {interview.mode === "phone" && (
                                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                                )}
                                {interview.mode === "video" && (
                                  <Video className="w-3.5 h-3.5 text-slate-500" />
                                )}
                                {interview.mode === "in_person" && (
                                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                )}
                                <span className="capitalize">{interview.mode.replace("_", " ")}</span>
                              </div>
                            </td>

                            {/* Status (Neutral Styling: Scheduled=slate, Completed=slate, Cancelled=muted) */}
                            <td className="py-3.5 px-4 align-top whitespace-nowrap">
                              {interview.status === "scheduled" && (
                                <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  Scheduled
                                </span>
                              )}
                              {interview.status === "completed" && (
                                <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 text-slate-700 border border-slate-200">
                                  Completed
                                </span>
                              )}
                              {interview.status === "cancelled" && (
                                <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-slate-50 text-slate-400 border border-slate-200">
                                  Cancelled
                                </span>
                              )}
                              {interview.status === "no_show" && (
                                <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-amber-50 text-amber-700 border border-amber-200">
                                  No Show
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td className="py-3.5 px-4 align-top text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1.5">
                                {interview.status === "scheduled" && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleMarkDone(interview.id)}
                                      className="px-2.5 py-1 rounded bg-slate-900 hover:bg-black text-white font-medium text-[11px] transition shadow-2xs cursor-pointer"
                                    >
                                      Mark Done
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRescheduleTarget(interview)}
                                      className="px-2 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-[11px] transition cursor-pointer"
                                    >
                                      Reschedule
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setCancelTarget(interview)}
                                      className="px-2 py-1 rounded bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-medium text-[11px] transition cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}

                                {interview.status === "completed" && !hasFeedback && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenFeedbackForm(interview)}
                                    className="px-2.5 py-1 rounded bg-slate-900 hover:bg-black text-white font-medium text-[11px] transition shadow-2xs cursor-pointer"
                                  >
                                    Add Feedback
                                  </button>
                                )}

                                {interview.status === "completed" && hasFeedback && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setViewFeedbackId(isFeedbackViewOpen ? null : interview.id)
                                    }
                                    className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-[11px] transition cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <span>{isFeedbackViewOpen ? "Hide Feedback" : "View Feedback"}</span>
                                    <ChevronDown
                                      className={`w-3 h-3 transition-transform ${
                                        isFeedbackViewOpen ? "rotate-180" : ""
                                      }`}
                                    />
                                  </button>
                                )}

                                {(interview.status === "cancelled" ||
                                  interview.status === "no_show") && (
                                  <Link
                                    href={`/candidates/${interview.application_id}`}
                                    className="px-2 py-1 rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium text-[11px] transition inline-flex items-center gap-1"
                                  >
                                    <span>View Dossier</span>
                                    <ExternalLink className="w-3 h-3 text-slate-400" />
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expand-in-place: Add Feedback Form */}
                          {isFeedbackFormOpen && (
                            <tr className="bg-slate-50/80">
                              <td colSpan={7} className="p-4 border-t border-slate-200">
                                <div className="max-w-3xl bg-white border border-slate-200 rounded-md p-5 shadow-2xs space-y-4">
                                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                    <h4 className="font-semibold text-slate-900 text-xs">
                                      Add Interview Feedback - {interview.candidate_name}
                                    </h4>
                                    <button
                                      type="button"
                                      onClick={() => setActiveFeedbackId(null)}
                                      className="text-slate-400 hover:text-slate-600"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    {/* Overall Rating */}
                                    <div>
                                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                                        Overall Rating (1-5) *
                                      </label>
                                      <div className="flex items-center gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                          <button
                                            key={star}
                                            type="button"
                                            onClick={() =>
                                              setFeedbackForm({ ...feedbackForm, overall_rating: star })
                                            }
                                            className="p-1 text-slate-300 hover:text-amber-400"
                                          >
                                            <Star
                                              className={`w-4 h-4 ${
                                                star <= feedbackForm.overall_rating
                                                  ? "fill-amber-400 text-amber-400"
                                                  : "text-slate-200"
                                              }`}
                                            />
                                          </button>
                                        ))}
                                        <span className="text-xs font-semibold ml-1 text-slate-800">
                                          {feedbackForm.overall_rating}/5
                                        </span>
                                      </div>
                                    </div>

                                    {/* Technical */}
                                    <div>
                                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                                        Technical (1-5)
                                      </label>
                                      <select
                                        value={feedbackForm.technical_rating || 3}
                                        onChange={(e) =>
                                          setFeedbackForm({
                                            ...feedbackForm,
                                            technical_rating: Number(e.target.value),
                                          })
                                        }
                                        className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs bg-white"
                                      >
                                        {[1, 2, 3, 4, 5].map((num) => (
                                          <option key={num} value={num}>
                                            {num} - {num === 5 ? "Exceptional" : num === 1 ? "Poor" : "Competent"}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Communication */}
                                    <div>
                                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                                        Communication (1-5)
                                      </label>
                                      <select
                                        value={feedbackForm.communication_rating || 3}
                                        onChange={(e) =>
                                          setFeedbackForm({
                                            ...feedbackForm,
                                            communication_rating: Number(e.target.value),
                                          })
                                        }
                                        className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs bg-white"
                                      >
                                        {[1, 2, 3, 4, 5].map((num) => (
                                          <option key={num} value={num}>
                                            {num}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Decision */}
                                    <div>
                                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                                        Recommendation Decision *
                                      </label>
                                      <select
                                        value={feedbackForm.decision}
                                        onChange={(e) =>
                                          setFeedbackForm({
                                            ...feedbackForm,
                                            decision: e.target.value as "proceed" | "hold" | "reject",
                                          })
                                        }
                                        className="w-full px-2 py-1.5 rounded border border-slate-200 text-xs font-semibold uppercase bg-white"
                                      >
                                        <option value="proceed">Proceed</option>
                                        <option value="hold">Hold</option>
                                        <option value="reject">Reject</option>
                                      </select>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                                        Strengths &amp; Highlights
                                      </label>
                                      <textarea
                                        rows={2}
                                        value={feedbackForm.strengths || ""}
                                        onChange={(e) =>
                                          setFeedbackForm({ ...feedbackForm, strengths: e.target.value })
                                        }
                                        placeholder="Key competencies demonstrated..."
                                        className="w-full p-2 border border-slate-200 rounded text-xs resize-none"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-[11px] font-medium text-slate-700 mb-1">
                                        Concerns or Red Flags
                                      </label>
                                      <textarea
                                        rows={2}
                                        value={feedbackForm.concerns || ""}
                                        onChange={(e) =>
                                          setFeedbackForm({ ...feedbackForm, concerns: e.target.value })
                                        }
                                        placeholder="Any reservations or skill gaps..."
                                        className="w-full p-2 border border-slate-200 rounded text-xs resize-none"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                                    <button
                                      type="button"
                                      onClick={() => setActiveFeedbackId(null)}
                                      className="px-3 py-1.5 rounded border border-slate-200 text-slate-600 hover:text-slate-800 text-xs font-medium"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      disabled={submittingFeedback}
                                      onClick={() => handleSubmitFeedback(interview.id)}
                                      className="px-4 py-1.5 rounded bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition shadow-2xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                    >
                                      {submittingFeedback && (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      )}
                                      <span>Submit Feedback</span>
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Expand-in-place: View Submitted Feedback */}
                          {isFeedbackViewOpen && latestFeedback && (
                            <tr className="bg-slate-50/70">
                              <td colSpan={7} className="p-4 border-t border-slate-200">
                                <div className="max-w-2xl bg-white border border-slate-200 rounded-md p-4 text-xs space-y-3">
                                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-slate-900">
                                        Panel Feedback
                                      </span>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                                        {latestFeedback.decision}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 font-semibold text-slate-800 font-tabular">
                                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                      <span>{latestFeedback.overall_rating}/5</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-3 gap-2 text-[11px] pb-2 border-b border-slate-100">
                                    <div>
                                      <span className="text-slate-400 block">Technical:</span>
                                      <span className="font-semibold text-slate-800">
                                        {latestFeedback.technical_rating ? `${latestFeedback.technical_rating}/5` : "-"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block">Communication:</span>
                                      <span className="font-semibold text-slate-800">
                                        {latestFeedback.communication_rating ? `${latestFeedback.communication_rating}/5` : "-"}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-slate-400 block">Culture:</span>
                                      <span className="font-semibold text-slate-800">
                                        {latestFeedback.culture_rating ? `${latestFeedback.culture_rating}/5` : "-"}
                                      </span>
                                    </div>
                                  </div>

                                  {latestFeedback.strengths && (
                                    <div>
                                      <span className="font-medium text-slate-700 block text-[11px]">Strengths</span>
                                      <p className="text-slate-600 leading-relaxed">{latestFeedback.strengths}</p>
                                    </div>
                                  )}

                                  {latestFeedback.concerns && (
                                    <div>
                                      <span className="font-medium text-slate-700 block text-[11px]">Concerns</span>
                                      <p className="text-slate-600 leading-relaxed">{latestFeedback.concerns}</p>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* ── Calendar View (Pure CSS Grid, Mon-Sun, 8 AM - 7 PM) ─────────── */
          <div className="space-y-4">
            <div className="bg-white rounded-md border border-slate-200/90 shadow-2xs overflow-hidden">
              {/* Header Days of Week */}
              <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-700">
                <div className="py-2.5 border-r border-slate-200 text-slate-400 text-[11px]">Time</div>
                {weekDays.map((day, idx) => {
                  const isToday =
                    new Date().toDateString() === day.toDateString();
                  return (
                    <div
                      key={idx}
                      className={`py-2.5 border-r border-slate-200 last:border-r-0 ${
                        isToday ? "bg-brand-50/60 text-brand-600 font-bold" : ""
                      }`}
                    >
                      <span className="block text-[11px] font-medium text-slate-500">
                        {day.toLocaleDateString("en-IN", { weekday: "short" })}
                      </span>
                      <span className="text-xs font-semibold">{day.getDate()}</span>
                    </div>
                  );
                })}
              </div>

              {/* Time Slots Grid */}
              <div className="divide-y divide-slate-100">
                {calendarHours.map((hour) => {
                  const hourLabel =
                    hour === 12
                      ? "12 PM"
                      : hour > 12
                      ? `${hour - 12} PM`
                      : `${hour} AM`;

                  return (
                    <div key={hour} className="grid grid-cols-8 min-h-[58px]">
                      {/* Hour label */}
                      <div className="py-2 px-2 border-r border-slate-200 text-[11px] text-slate-400 font-tabular text-right select-none bg-slate-50/40">
                        {hourLabel}
                      </div>

                      {/* 7 Day cells */}
                      {weekDays.map((day, dIdx) => {
                        const dayInterviews = interviews.filter((i) => {
                          const iDate = new Date(i.scheduled_at);
                          return (
                            iDate.toDateString() === day.toDateString() &&
                            iDate.getHours() === hour
                          );
                        });

                        return (
                          <div
                            key={dIdx}
                            className="border-r border-slate-100 last:border-r-0 p-1 relative hover:bg-slate-50/50 transition"
                          >
                            {dayInterviews.map((slot) => (
                              <button
                                key={slot.id}
                                type="button"
                                onClick={() => setDrawerInterview(slot)}
                                className="w-full text-left p-1.5 mb-1 rounded bg-slate-900 text-white hover:bg-black transition shadow-2xs text-[10px] truncate block cursor-pointer group"
                              >
                                <span className="font-semibold block truncate group-hover:text-brand-300">
                                  {slot.candidate_name || "Candidate"}
                                </span>
                                <span className="text-slate-300 block truncate text-[9px]">
                                  {slot.job_title || "Role"}
                                </span>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Helper notice */}
            <p className="text-[11px] text-slate-400 italic text-center">
              Click any calendar block to preview details and jump directly to the candidate dossier.
            </p>
          </div>
        )}

        {/* Right-Side Candidate Dossier Drawer (for Calendar View) */}
        {drawerInterview && (
          <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {drawerInterview.candidate_name || "Candidate"}
                    </h3>
                    <p className="text-xs text-slate-500">{drawerInterview.job_title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawerInterview(null)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Scheduled Time</span>
                    <span className="font-semibold text-slate-800 text-sm font-tabular">
                      {formatDateTime(drawerInterview.scheduled_at)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Duration</span>
                      <span className="font-medium text-slate-800 font-tabular">
                        {drawerInterview.duration_minutes} minutes
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Mode</span>
                      <span className="font-medium text-slate-800 capitalize">
                        {drawerInterview.mode.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {drawerInterview.candidate_email && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Email</span>
                      <span className="text-slate-700">{drawerInterview.candidate_email}</span>
                    </div>
                  )}

                  {drawerInterview.meeting_link && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Meeting URL</span>
                      <a
                        href={drawerInterview.meeting_link}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-600 hover:underline break-all"
                      >
                        {drawerInterview.meeting_link}
                      </a>
                    </div>
                  )}

                  {drawerInterview.location && (
                    <div>
                      <span className="text-slate-400 block text-[11px]">Location</span>
                      <span className="text-slate-700">{drawerInterview.location}</span>
                    </div>
                  )}

                  {drawerInterview.hr_notes && (
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-md">
                      <span className="text-[11px] font-medium text-slate-700 block mb-0.5">
                        Panel HR Notes
                      </span>
                      <p className="text-slate-600 italic">{drawerInterview.hr_notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setDrawerInterview(null)}
                  className="px-4 py-2 rounded-md border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Close
                </button>
                <Link
                  href={`/candidates/${drawerInterview.application_id}`}
                  className="px-4 py-2 rounded-md bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition shadow-2xs inline-flex items-center gap-1.5"
                >
                  <span>Open Full Dossier</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Global Schedule Interview Modal */}
        <ScheduleInterviewModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          onSuccess={(candName) => {
            loadInterviews();
            setToastMessage(`Interview scheduled. Confirmation email sent to ${candName}.`);
          }}
        />

        {/* Reschedule Modal */}
        {rescheduleTarget && (
          <RescheduleInterviewModal
            isOpen={!!rescheduleTarget}
            onClose={() => setRescheduleTarget(null)}
            interviewId={rescheduleTarget.id}
            candidateName={rescheduleTarget.candidate_name || "Candidate"}
            initialScheduledAt={rescheduleTarget.scheduled_at}
            initialMeetingLink={rescheduleTarget.meeting_link}
            onSuccess={() => {
              loadInterviews();
              setToastMessage("Interview rescheduled successfully.");
            }}
          />
        )}

        {/* Cancel Modal */}
        {cancelTarget && (
          <CancelInterviewModal
            isOpen={!!cancelTarget}
            onClose={() => setCancelTarget(null)}
            interviewId={cancelTarget.id}
            candidateName={cancelTarget.candidate_name || "Candidate"}
            onSuccess={() => {
              loadInterviews();
              setToastMessage("Interview cancelled.");
            }}
          />
        )}

        {/* Floating Toast Notification */}
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
      </div>
    </AppShell>
  );
}
