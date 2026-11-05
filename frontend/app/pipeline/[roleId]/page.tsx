"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  FileUp,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Users,
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
  shortlistApplication,
} from "@/lib/api";
import { ApplicationListItem, JobRole, RejectionReason } from "@/lib/types";

const STAGE_TABS = [
  { id: "ALL", label: "All Candidates" },
  { id: "SCREENED", label: "Needs Review (Screened)" },
  { id: "SHORTLISTED", label: "Shortlisted" },
  { id: "REJECTED", label: "Rejected" },
];

export default function RolePipelinePage() {
  const params = useParams();
  const roleId = params.roleId as string;

  const [job, setJob] = useState<JobRole | null>(null);
  const [candidates, setCandidates] = useState<ApplicationListItem[]>([]);
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPipeline = async () => {
    try {
      setLoading(true);
      setError(null);
      const [jobData, appsData] = await Promise.all([
        getJob(roleId),
        listApplications({
          job_role_id: roleId,
          status: activeTab !== "ALL" ? activeTab : undefined,
          search: searchTerm.trim() || undefined,
          limit: 100,
        }),
      ]);
      setJob(jobData);
      setCandidates(appsData.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load candidate pipeline");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roleId) loadPipeline();
  }, [roleId, activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadPipeline();
  };

  const handleShortlist = async (id: string) => {
    await shortlistApplication(id);
    await loadPipeline();
  };

  const handleReject = async (id: string, reason: RejectionReason, remarks: string) => {
    await rejectApplication(id, reason, remarks);
    await loadPipeline();
  };

  const handleBulkShortlist = async (ids: string[]) => {
    await bulkShortlist(ids);
    await loadPipeline();
  };

  const handleBulkReject = async (ids: string[], reason: RejectionReason, remarks: string) => {
    await bulkReject(ids, reason, remarks);
    await loadPipeline();
  };

  return (
    <AppShell>
      <Header
        title={job ? `${job.title} — Pipeline` : "Candidate Pipeline"}
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Job Roles", href: "/jobs" },
          { label: job ? job.title : "Role", href: `/jobs/${roleId}` },
          { label: "Pipeline" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadPipeline}
              disabled={loading}
              className="p-1.5 rounded bg-white border border-slate-300 text-slate-600 hover:text-slate-900 transition"
              title="Refresh Pipeline"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              href="/upload-cv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm"
            >
              <FileUp className="w-3.5 h-3.5 text-slate-300" />
              <span>Upload Emailed CV</span>
            </Link>
          </div>
        }
      />

      <main className="p-6 space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded font-medium">
            {error}
          </div>
        )}

        {/* Role Meta Summary Strip */}
        {job && (
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={job.status} type="job" />
              <div>
                <span className="text-xs font-bold text-slate-900 block leading-tight">
                  {job.title}
                </span>
                <span className="text-[11px] text-slate-500">
                  {job.department} • {job.location || "Remote"} • {job.work_mode || "hybrid"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs font-mono">
              <div>
                <span className="text-[10px] uppercase text-slate-400 block">Total Applied</span>
                <strong className="text-slate-900 text-sm">{job.applications_count}</strong>
              </div>
              {job.max_applications && (
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Capacity</span>
                  <strong className="text-slate-900 text-sm">
                    {job.applications_count} / {job.max_applications}
                  </strong>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold overflow-x-auto">
            {STAGE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter by name / email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </form>
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
