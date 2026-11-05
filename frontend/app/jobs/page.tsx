"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
  PlusCircle,
  Share2,
  Users,
  XCircle,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { closeJob, listAllJobs, publishJob } from "@/lib/api";
import { JobRole } from "@/lib/types";

export default function JobsManagementPage() {
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadJobs = async (filter: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await listAllJobs(filter);
      setJobs(data);
    } catch (err: any) {
      setError(err.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs(statusFilter);
  }, [statusFilter]);

  const handlePublish = async (jobId: string) => {
    if (!window.confirm("Publish this job role? It will become visible on the public careers portal.")) {
      return;
    }
    try {
      setActionLoading(jobId);
      await publishJob(jobId);
      await loadJobs(statusFilter);
    } catch (err: any) {
      alert(err.message || "Failed to publish job");
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async (jobId: string) => {
    if (!window.confirm("Close applications for this job role? New candidates will no longer be accepted.")) {
      return;
    }
    try {
      setActionLoading(jobId);
      await closeJob(jobId);
      await loadJobs(statusFilter);
    } catch (err: any) {
      alert(err.message || "Failed to close job");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "--";
    try {
      return new Date(isoString).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <AppShell>
      <Header
        title="Job Roles Management"
        breadcrumbs={[{ label: "Overview", href: "/dashboard" }, { label: "Job Roles" }]}
        actions={
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Role</span>
          </Link>
        }
      />

      <main className="p-6 space-y-4">
        {/* Filter Tab Bar */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            {["all", "published", "draft", "closed"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded capitalize transition ${
                  statusFilter === f
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-mono">
            {jobs.length} total roles
          </span>
        </div>

        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded font-medium">
            {error}
          </div>
        )}

        {/* Dense Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3.5">Title & Department</th>
                <th className="py-2.5 px-3">Location / Mode</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Applicants</th>
                <th className="py-2.5 px-3">Deadline</th>
                <th className="py-2.5 px-3">LinkedIn</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading roles...</span>
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    No job roles found in this status.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const isProcessing = actionLoading === job.id;

                  return (
                    <tr key={job.id} className="hover:bg-slate-50 transition">
                      {/* Title & Department */}
                      <td className="py-2.5 px-3.5">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="font-bold text-slate-900 hover:text-blue-600 block leading-snug"
                        >
                          {job.title}
                        </Link>
                        <span className="text-[11px] text-slate-400 block mt-0.5">
                          {job.department} • {job.employment_type?.replace(/_/g, " ") || "Full Time"}
                        </span>
                      </td>

                      {/* Location / Mode */}
                      <td className="py-2.5 px-3 text-slate-600 capitalize">
                        {job.location || "Remote"}
                        {job.work_mode && (
                          <span className="block text-[10px] text-slate-400 font-medium">
                            ({job.work_mode})
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3">
                        <StatusBadge status={job.status} type="job" />
                      </td>

                      {/* Applicants */}
                      <td className="py-2.5 px-3">
                        <Link
                          href={`/pipeline/${job.id}`}
                          className="font-mono font-bold text-slate-800 hover:text-blue-600 flex items-center gap-1.5"
                        >
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{job.applications_count}</span>
                        </Link>
                      </td>

                      {/* Deadline */}
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                        {formatDate(job.application_deadline)}
                      </td>

                      {/* LinkedIn Posted */}
                      <td className="py-2.5 px-3">
                        {job.linkedin_posted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Posted
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Not yet</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Link
                            href={`/pipeline/${job.id}`}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition"
                            title="Candidate Pipeline"
                          >
                            Pipeline
                          </Link>

                          <Link
                            href={`/jobs/${job.id}`}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition"
                            title="Role Details & JD"
                          >
                            Details
                          </Link>

                          {job.status === "draft" && (
                            <button
                              type="button"
                              onClick={() => handlePublish(job.id)}
                              disabled={isProcessing}
                              className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition disabled:bg-slate-300"
                            >
                              Publish
                            </button>
                          )}

                          {job.status === "published" && (
                            <button
                              type="button"
                              onClick={() => handleClose(job.id)}
                              disabled={isProcessing}
                              className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px] transition disabled:bg-slate-100"
                            >
                              Close
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
      </main>
    </AppShell>
  );
}
