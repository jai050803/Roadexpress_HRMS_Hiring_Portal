"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle,
  Loader2,
  Plus,
  Users,
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
        title="Job roles"
        breadcrumbs={[{ label: "Overview", href: "/dashboard" }, { label: "Job roles" }]}
        actions={
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create role</span>
          </Link>
        }
      />

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Filter Tab Bar */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200/60 text-xs font-medium">
            {["all", "published", "draft", "closed"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded capitalize transition ${
                  statusFilter === f
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-tabular">
            {jobs.length} total roles
          </span>
        </div>

        {error && (
          <div className="p-3 text-xs bg-stone-50 border border-stone-200 text-stone-800 rounded-md font-medium">
            {error}
          </div>
        )}

        {/* Dense Table */}
        <div className="bg-white rounded-md border border-slate-200/90 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-600 font-medium text-xs">
                <th className="py-2.5 px-3.5 font-medium">Title & department</th>
                <th className="py-2.5 px-3 font-medium">Location / mode</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium">Applicants</th>
                <th className="py-2.5 px-3 font-medium">Deadline</th>
                <th className="py-2.5 px-3 font-medium">LinkedIn</th>
                <th className="py-2.5 px-3 text-right font-medium">Actions</th>
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
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No job roles found in this status.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => {
                  const isProcessing = actionLoading === job.id;

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/70 transition">
                      {/* Title & Department */}
                      <td className="py-2.5 px-3.5">
                        <Link
                          href={`/jobs/${job.id}`}
                          className="font-medium text-slate-900 hover:text-brand-600 block leading-snug transition"
                        >
                          {job.title}
                        </Link>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>{job.department}</span>
                          <span className="text-slate-300">/</span>
                          <span>{job.employment_type?.replace(/_/g, " ") || "Full Time"}</span>
                        </div>
                      </td>

                      {/* Location / Mode */}
                      <td className="py-2.5 px-3 text-slate-600 capitalize">
                        {job.location || "Corporate HQ"}
                        {job.work_mode && (
                          <span className="block text-[11px] text-slate-400">
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
                          className="font-tabular font-medium text-slate-800 hover:text-brand-600 flex items-center gap-1.5 transition"
                        >
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{job.applications_count}</span>
                        </Link>
                      </td>

                      {/* Deadline */}
                      <td className="py-2.5 px-3 text-slate-600 font-tabular text-xs">
                        {formatDate(job.application_deadline)}
                      </td>

                      {/* LinkedIn Posted */}
                      <td className="py-2.5 px-3">
                        {job.linkedin_posted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-medium">
                            <CheckCircle className="w-3 h-3 text-signal-published" /> Posted
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Not shared</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Link
                            href={`/pipeline/${job.id}`}
                            className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-[11px] transition"
                            title="Candidate pipeline"
                          >
                            Pipeline
                          </Link>

                          <Link
                            href={`/jobs/${job.id}`}
                            className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-[11px] transition"
                            title="Role details"
                          >
                            Details
                          </Link>

                          {job.status === "draft" && (
                            <button
                              type="button"
                              onClick={() => handlePublish(job.id)}
                              disabled={isProcessing}
                              className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-[11px] transition disabled:opacity-50"
                            >
                              Publish
                            </button>
                          )}

                          {job.status === "published" && (
                            <button
                              type="button"
                              onClick={() => handleClose(job.id)}
                              disabled={isProcessing}
                              className="px-2.5 py-1 rounded-md bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 font-medium text-[11px] transition disabled:opacity-50"
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
