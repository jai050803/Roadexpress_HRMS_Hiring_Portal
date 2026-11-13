"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FileUp,
  RefreshCw,
  Search,
  ExternalLink,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import CandidateTable from "@/components/CandidateTable";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import {
  bulkReject,
  bulkShortlist,
  getJob,
  listApplications,
  rejectApplication,
  screenApplication,
  shortlistApplication,
} from "@/lib/api";
import { ApplicationListItem, JobRole, RejectionReason } from "@/lib/types";

export default function RolePipelinePage() {
  const params = useParams();
  const roleId = params.roleId as string;

  const [job, setJob] = useState<JobRole | null>(null);
  const [allCandidates, setAllCandidates] = useState<ApplicationListItem[]>([]);
  const [candidates, setCandidates] = useState<ApplicationListItem[]>([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [scoreFilter, setScoreFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPipeline = async () => {
    if (!roleId || roleId === "undefined" || roleId === "null") {
      setLoading(false);
      setError("No valid job role selected.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [jobData, appsData] = await Promise.all([
        getJob(roleId).catch(() => null),
        listApplications({
          job_role_id: roleId,
          limit: 100,
        }),
      ]);
      setJob(jobData);

      const items: ApplicationListItem[] = appsData.items || [];
      // Default sort by AI screening score descending (unscreened at end)
      const sorted = [...items].sort((a, b) => {
        const scoreA = a.screening_score ?? -1;
        const scoreB = b.screening_score ?? -1;
        if (scoreB !== scoreA) {
          return scoreB - scoreA;
        }
        return new Date(b.applied_at).getTime() - new Date(a.applied_at).getTime();
      });

      setAllCandidates(sorted);
    } catch (err: any) {
      setError(err.message || "Failed to load candidate pipeline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roleId) loadPipeline();
  }, [roleId]);

  // Compute stage counts from allCandidates
  const counts = {
    ALL: allCandidates.length,
    SCREENED: allCandidates.filter((c) => c.current_status === "SCREENED" || c.current_status === "APPLIED").length,
    SHORTLISTED: allCandidates.filter((c) => c.current_status === "SHORTLISTED").length,
    REJECTED: allCandidates.filter((c) => c.current_status === "REJECTED").length,
  };

  // Filter candidates based on activeTab, search, and scoreFilter
  useEffect(() => {
    let filtered = allCandidates;

    if (activeTab === "SCREENED") {
      filtered = filtered.filter((c) => c.current_status === "SCREENED" || c.current_status === "APPLIED");
    } else if (activeTab === "SHORTLISTED") {
      filtered = filtered.filter((c) => c.current_status === "SHORTLISTED");
    } else if (activeTab === "REJECTED") {
      filtered = filtered.filter((c) => c.current_status === "REJECTED");
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          c.candidate_name.toLowerCase().includes(q) ||
          c.candidate_email.toLowerCase().includes(q)
      );
    }

    if (scoreFilter === "top") {
      filtered = filtered.filter((c) => (c.screening_score ?? 0) >= 70);
    } else if (scoreFilter === "criteria_met") {
      filtered = filtered.filter((c) => c.hard_filter_passed !== false);
    }

    setCandidates(filtered);
  }, [allCandidates, activeTab, searchTerm, scoreFilter]);

  const handleShortlist = async (id: string, currentStatus?: string) => {
    try {
      if (currentStatus === "APPLIED") {
        await screenApplication(id, "Screened on HR review");
      }
      await shortlistApplication(id);
      await loadPipeline();
    } catch (err: any) {
      alert(err.message || "Failed to shortlist candidate");
    }
  };

  const handleReject = async (id: string, reason: RejectionReason, remarks: string) => {
    try {
      await rejectApplication(id, reason, remarks);
      await loadPipeline();
    } catch (err: any) {
      alert(err.message || "Failed to reject candidate");
    }
  };

  const handleBulkShortlist = async (ids: string[]) => {
    try {
      const appliedCandidates = candidates.filter(
        (c) => ids.includes(c.id) && c.current_status === "APPLIED"
      );
      for (const c of appliedCandidates) {
        try {
          await screenApplication(c.id, "Auto-screened on bulk shortlist");
        } catch {}
      }

      await bulkShortlist(ids);
      await loadPipeline();
    } catch (err: any) {
      alert(err.message || "Failed to bulk shortlist");
    }
  };

  const handleBulkReject = async (ids: string[], reason: RejectionReason, remarks: string) => {
    try {
      await bulkReject(ids, reason, remarks);
      await loadPipeline();
    } catch (err: any) {
      alert(err.message || "Failed to bulk reject");
    }
  };

  const stageTabs = [
    { id: "ALL", label: "All candidates", count: counts.ALL },
    { id: "SCREENED", label: "Needs review", count: counts.SCREENED },
    { id: "SHORTLISTED", label: "Shortlisted", count: counts.SHORTLISTED },
    { id: "REJECTED", label: "Rejected", count: counts.REJECTED },
  ];

  return (
    <AppShell>
      <Header
        title={job ? `${job.title} · Pipeline` : "Candidate pipeline"}
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Job roles", href: "/jobs" },
          { label: job ? job.title : "Role", href: `/jobs/${roleId}` },
          { label: "Pipeline" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadPipeline}
              disabled={loading}
              className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
              title="Refresh pipeline data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/upload-cv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-200 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
            >
              <FileUp className="w-3.5 h-3.5 text-slate-500" />
              <span>Upload emailed CV</span>
            </Link>
          </div>
        }
      />

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {error && (
          <div className="p-3 text-xs bg-stone-50 border border-stone-200 text-stone-800 rounded-md font-medium">
            {error}
          </div>
        )}

        {/* Role Executive Summary Strip */}
        {job && (
          <div className="bg-white rounded-md border border-slate-200/90 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={job.status} type="job" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-950">
                    {job.title}
                  </span>
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-xs text-slate-400 hover:text-slate-700 inline-flex items-center gap-0.5"
                    title="View job description"
                  >
                    <span>JD</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                  <span>{job.department}</span>
                  <span className="text-slate-300">/</span>
                  <span>{job.location || "Corporate HQ"}</span>
                  <span className="text-slate-300">/</span>
                  <span className="capitalize">{job.work_mode || "Hybrid"}</span>
                </div>
              </div>
            </div>

            {/* Executive Stat Pods */}
            <div className="flex items-center">
              <div className="flex items-center bg-slate-50/90 border border-slate-200/80 rounded-lg px-4 py-2 divide-x divide-slate-200">
                <div className="pr-4 text-left">
                  <span className="text-[11px] font-medium text-slate-500 block leading-tight">
                    Total applicants
                  </span>
                  <span className="text-base font-semibold text-slate-900 font-tabular leading-snug">
                    {job.applications_count ?? allCandidates.length}
                  </span>
                </div>

                <div className="px-4 text-left">
                  <span className="text-[11px] font-medium text-slate-500 block leading-tight">
                    Shortlisted
                  </span>
                  <span className={`text-base font-semibold font-tabular leading-snug ${
                    counts.SHORTLISTED > 0 ? "text-brand-600" : "text-slate-700"
                  }`}>
                    {counts.SHORTLISTED}
                  </span>
                </div>

                {job.max_applications ? (
                  <div className="pl-4 text-left">
                    <span className="text-[11px] font-medium text-slate-500 block leading-tight">
                      Target quota
                    </span>
                    <span className="text-base font-semibold text-slate-900 font-tabular leading-snug">
                      {job.applications_count ?? allCandidates.length}
                      <span className="text-slate-400 font-normal text-xs ml-1">/ {job.max_applications}</span>
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Stage Filter Segment Bar + Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          {/* Stage Segments with Live Counts */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {stageTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition whitespace-nowrap ${
                    isActive
                      ? "bg-slate-900 text-white font-medium"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`font-tabular text-[11px] px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? "bg-slate-800 text-slate-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Score Quick Filter */}
          <div className="flex items-center gap-2">
            <select
              value={scoreFilter}
              onChange={(e) => setScoreFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-md border border-slate-300 bg-white text-slate-700 font-medium focus:outline-none focus:border-brand-500"
            >
              <option value="all">All scores</option>
              <option value="top">Top matches (≥70%)</option>
              <option value="criteria_met">Criteria met only</option>
            </select>

            <div className="relative w-full sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 bg-white"
              />
            </div>
          </div>
        </div>

        {/* Candidate Table */}
        <CandidateTable
          candidates={candidates}
          onShortlist={handleShortlist}
          onReject={handleReject}
          onBulkShortlist={handleBulkShortlist}
          onBulkReject={handleBulkReject}
          isLoading={loading}
        />
      </main>
    </AppShell>
  );
}
