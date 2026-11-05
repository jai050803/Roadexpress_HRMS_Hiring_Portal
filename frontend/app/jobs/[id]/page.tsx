"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Lock,
  Send,
  Users,
  XCircle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import LinkedInCopyPanel from "@/components/LinkedInCopyPanel";
import StatusBadge from "@/components/StatusBadge";
import { closeJob, getJob, publishJob } from "@/lib/api";
import { JobRole } from "@/lib/types";

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadJob = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getJob(jobId);
      setJob(data);
    } catch (err: any) {
      setError(err.message || "Failed to load job role");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) loadJob();
  }, [jobId]);

  const handlePublish = async () => {
    if (!window.confirm("Publish this job role? It will become live on the public candidate portal.")) {
      return;
    }
    try {
      setActionLoading(true);
      await publishJob(jobId);
      await loadJob();
    } catch (err: any) {
      alert(err.message || "Failed to publish job");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (!window.confirm("Close this job role? Candidates will no longer be able to submit applications.")) {
      return;
    }
    try {
      setActionLoading(true);
      await closeJob(jobId);
      await loadJob();
    } catch (err: any) {
      alert(err.message || "Failed to close job");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "None";
    try {
      return new Date(isoString).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="p-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
          <span className="text-xs">Loading role details...</span>
        </div>
      </AppShell>
    );
  }

  if (error || !job) {
    return (
      <AppShell>
        <div className="p-8 max-w-xl mx-auto">
          <div className="p-4 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium mb-4">
            {error || "Job role not found."}
          </div>
          <Link href="/jobs" className="text-xs text-blue-600 hover:underline">
            &larr; Back to all job roles
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header
        title={job.title}
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Job Roles", href: "/jobs" },
          { label: job.title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/pipeline/${job.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
            >
              <Users className="w-3.5 h-3.5" />
              <span>View Candidate Pipeline ({job.applications_count})</span>
            </Link>

            {job.status === "draft" && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm disabled:bg-slate-300"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Publish Role</span>
              </button>
            )}

            {job.status === "published" && (
              <button
                type="button"
                onClick={handleClose}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-xs transition disabled:bg-slate-100"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Close Role</span>
              </button>
            )}
          </div>
        }
      />

      <main className="p-6 space-y-6 max-w-6xl">
        {/* Top Summary Banner */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <StatusBadge status={job.status} type="job" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {job.department}
                </span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {job.title}
              </h1>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Total Applicants
                </span>
                <span className="text-base font-black text-slate-800 font-mono">
                  {job.applications_count}
                </span>
              </div>

              {job.max_applications && (
                <div className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Application Cap
                  </span>
                  <span className="text-base font-black text-slate-800 font-mono">
                    {job.max_applications}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs text-slate-600">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Location & Mode
              </span>
              <span className="font-medium text-slate-800">
                {job.location || "Remote"} ({job.work_mode || "hybrid"})
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Employment Type
              </span>
              <span className="font-medium text-slate-800 capitalize">
                {job.employment_type?.replace(/_/g, " ") || "Full Time"}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Deadline
              </span>
              <span className="font-medium text-slate-800 font-mono">
                {formatDate(job.application_deadline)}
              </span>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Status
              </span>
              <span className="font-medium text-slate-800">
                {job.applications_still_open ? "Accepting submissions" : "Closed to new applicants"}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Section: JD & LinkedIn copy panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Generated Job Description (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Rendered Job Description (JD)
                </h2>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Omitted empty sections
              </span>
            </div>

            {job.jd_text ? (
              <div className="prose prose-xs max-w-none text-slate-800 font-sans leading-relaxed">
                <pre className="font-sans whitespace-pre-wrap text-xs bg-slate-50 p-4 rounded border border-slate-200">
                  {job.jd_text}
                </pre>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-4">
                No JD text generated yet. Publishing the role will automatically generate this.
              </p>
            )}
          </div>

          {/* LinkedIn Copy Panel & Pipeline Link (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <LinkedInCopyPanel
              jobId={job.id}
              initialPosted={job.linkedin_posted}
              initialPostedAt={job.linkedin_posted_at}
              copyText={job.linkedin_post_copy}
              onPostedChange={(posted) => {
                setJob({ ...job, linkedin_posted: posted });
              }}
            />

            {/* Quick Pipeline Jump Card */}
            <div className="bg-slate-900 text-white rounded-lg p-5 shadow-sm border border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                Candidate Pipeline
              </h3>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Review screened candidates, shortlist for interview, or reject applicants with audit tracking.
              </p>
              <Link
                href={`/pipeline/${job.id}`}
                className="w-full py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Go to Pipeline ({job.applications_count} Candidates)</span>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
