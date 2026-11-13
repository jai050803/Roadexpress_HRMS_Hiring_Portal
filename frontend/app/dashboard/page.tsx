"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Check,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileUp,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import ScoreIndicator from "@/components/ScoreIndicator";
import StatusBadge from "@/components/StatusBadge";
import RejectionModal from "@/components/RejectionModal";
import {
  listAllJobs,
  listApplications,
  rejectApplication,
  screenApplication,
  shortlistApplication,
} from "@/lib/api";
import { ApplicationListItem, JobRole, RejectionReason } from "@/lib/types";

export default function DashboardPage() {
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Triage stream filter: "needs_review" | "all" | "shortlisted"
  const [triageTab, setTriageTab] = useState<"needs_review" | "all" | "shortlisted">("needs_review");

  // Rejection modal state
  const [rejectModalState, setRejectModalState] = useState<{
    isOpen: boolean;
    candidateId?: string;
    candidateName?: string;
  }>({ isOpen: false });

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [jobsData, appsData] = await Promise.all([
        listAllJobs(),
        listApplications({ limit: 100 }),
      ]);
      setJobs(jobsData || []);
      setApplications(appsData.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Operational metrics
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

  // Quick triage actions
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

  // Format date cleanly
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

  // Triage list computation
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
              className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
              title="Refresh dashboard"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/upload-cv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-200 transition"
            >
              <FileUp className="w-3.5 h-3.5 text-slate-500" />
              <span>Upload emailed CV</span>
            </Link>
            <Link
              href="/jobs/new"
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

        {/* 1. Operational Triage Summary Cards (Action-Oriented, NOT Passive Vanity) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Review Queue / Awaiting Action */}
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
                className="text-slate-700 hover:text-slate-950 font-medium underline text-xs"
              >
                Review queue
              </button>
            </div>
          </div>

          {/* Card 2: Interview Pipeline */}
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
              <span>Ready for panel scheduling</span>
              <button
                type="button"
                onClick={() => setTriageTab("shortlisted")}
                className="text-slate-700 hover:text-slate-950 font-medium underline text-xs"
              >
                View list
              </button>
            </div>
          </div>

          {/* Card 3: Active Job Roles */}
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
              <Link href="/jobs" className="text-slate-700 hover:text-slate-950 font-medium">
                Manage all
              </Link>
            </div>
          </div>

          {/* Card 4: Daily Inflow & Capacity */}
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
              <Link href="/cv-bank" className="text-slate-700 hover:text-slate-950 font-medium">
                CV bank
              </Link>
            </div>
          </div>
        </div>

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

              {/* Triage Segments */}
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => setTriageTab("needs_review")}
                  className={`px-2.5 py-1 rounded transition ${
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
                  className={`px-2.5 py-1 rounded transition ${
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
                  className={`px-2.5 py-1 rounded transition ${
                    triageTab === "all"
                      ? "bg-slate-900 text-white font-medium"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Recent all
                </button>
              </div>
            </div>

            {/* Candidates Action Stream */}
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
                      {/* Candidate info */}
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/candidates/${app.id}`}
                            className="font-medium text-xs text-slate-900 hover:text-brand-600 transition truncate"
                          >
                            {app.candidate_name}
                          </Link>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500 truncate">
                            {app.job_title}
                          </span>
                        </div>

                        {/* Verified Competencies in plain text (NO boxes) */}
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

                      {/* Score & Direct Action Triggers */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Match Score */}
                        <div className="text-right">
                          <ScoreIndicator score={app.screening_score} size="sm" />
                          <div className="text-[10px] text-slate-400">
                            {isHardFail ? "Exp gap" : app.screening_score !== null ? "Fit score" : "Queued"}
                          </div>
                        </div>

                        {/* 1-Click Action Buttons Right Here on the Dashboard */}
                        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200/80">
                          {!isShortlisted && !isTerminal && (
                            <button
                              type="button"
                              onClick={() => handleQuickShortlist(app.id, app.current_status)}
                              disabled={actionLoading}
                              className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-brand-600 hover:border-brand-300 text-[11px] font-medium transition disabled:opacity-50"
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
                              className="px-2 py-1 rounded text-slate-400 hover:text-stone-800 hover:bg-slate-100 text-[11px] font-medium transition disabled:opacity-50"
                              title="Reject candidate"
                            >
                              Reject
                            </button>
                          )}

                          <Link
                            href={`/candidates/${app.id}`}
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

            {/* Bottom jump link */}
            {displayedCandidates.length > 8 && (
              <div className="p-3 bg-slate-50/50 border-t border-slate-100 text-center">
                <Link
                  href="/cv-bank"
                  className="text-xs font-medium text-slate-700 hover:text-slate-950 underline"
                >
                  View all {displayedCandidates.length} candidates in talent bank
                </Link>
              </div>
            )}
          </div>

          {/* Right Column (5 cols): Active Hiring Pipelines & Health Matrix */}
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
                  href="/jobs"
                  className="text-xs font-medium text-slate-600 hover:text-slate-900 transition"
                >
                  Manage all
                </Link>
              </div>

              {/* Pipeline Role Cards with Live Funnels */}
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="p-8 text-center text-slate-400 text-xs">Loading roles...</div>
                ) : openRoles.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No active job roles published.
                  </div>
                ) : (
                  openRoles.slice(0, 5).map((role) => {
                    // Compute per-role applicant breakdown
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
                              href={`/pipeline/${role.id}`}
                              className="font-medium text-xs text-slate-900 hover:text-brand-600 block transition"
                            >
                              {role.title}
                            </Link>
                            <span className="text-[11px] text-slate-400">
                              {role.department} · {role.location || "Corporate HQ"}
                            </span>
                          </div>

                          <Link
                            href={`/pipeline/${role.id}`}
                            className="px-2 py-1 text-[11px] font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition shrink-0"
                          >
                            Pipeline
                          </Link>
                        </div>

                        {/* Pipeline Funnel Distribution (Real recruiter data, NOT empty filler) */}
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

            {/* Quick Operational Launchpad */}
            <div className="bg-white rounded-md border border-slate-200/90 p-4 shadow-2xs space-y-2.5">
              <span className="text-xs font-semibold text-slate-900 block">
                Quick actions
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Link
                  href="/jobs/new"
                  className="p-2.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-medium flex items-center gap-2 transition"
                >
                  <Plus className="w-3.5 h-3.5 text-brand-500" />
                  <span>Create role</span>
                </Link>

                <Link
                  href="/upload-cv"
                  className="p-2.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-medium flex items-center gap-2 transition"
                >
                  <FileUp className="w-3.5 h-3.5 text-slate-500" />
                  <span>Upload CV</span>
                </Link>

                <Link
                  href="/cv-bank"
                  className="p-2.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-medium flex items-center gap-2 transition"
                >
                  <Search className="w-3.5 h-3.5 text-slate-500" />
                  <span>CV bank query</span>
                </Link>

                <Link
                  href="/jobs"
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

      {/* Direct Rejection Modal from Dashboard */}
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
