"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  FileUp,
  PlusCircle,
  TrendingUp,
  Users,
  XCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { listAllJobs, listApplications } from "@/lib/api";
import { ApplicationListItem, JobRole } from "@/lib/types";

export default function DashboardPage() {
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        setError(null);
        const [jobsData, appsData] = await Promise.all([
          listAllJobs(),
          listApplications({ limit: 50 }),
        ]);
        setJobs(jobsData);
        setApplications(appsData.items || []);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  // Compute metrics
  const openRolesCount = jobs.filter((j) => j.status === "published").length;
  const draftRolesCount = jobs.filter((j) => j.status === "draft").length;
  const closedRolesCount = jobs.filter((j) => j.status === "closed").length;
  const totalApplicationsCount = jobs.reduce((acc, j) => acc + (j.applications_count || 0), 0);

  // Today's applications
  const todayStr = new Date().toISOString().split("T")[0];
  const todayApps = applications.filter(
    (a) => a.applied_at && a.applied_at.startsWith(todayStr)
  );

  // Status breakdown
  const statusCounts = applications.reduce((acc, a) => {
    acc[a.current_status] = (acc[a.current_status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppShell>
      <Header
        title="Recruitment Dashboard"
        breadcrumbs={[{ label: "Overview" }]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/jobs/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create Role</span>
            </Link>
            <Link
              href="/upload-cv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-300 transition"
            >
              <FileUp className="w-3.5 h-3.5 text-slate-500" />
              <span>Upload Emailed CV</span>
            </Link>
          </div>
        }
      />

      <main className="p-6 space-y-6">
        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded font-medium">
            {error}
          </div>
        )}

        {/* Dense Stats Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Open Roles */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Published Roles
              </span>
              <Briefcase className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {loading ? "--" : openRolesCount}
              </span>
              <span className="text-xs text-slate-400">
                ({draftRolesCount} draft, {closedRolesCount} closed)
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Active in candidate portal</span>
              <Link href="/jobs" className="text-blue-600 hover:underline font-medium">
                View all &rarr;
              </Link>
            </div>
          </div>

          {/* Card 2: Total Applications */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Total Applications
              </span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {loading ? "--" : totalApplicationsCount}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {todayApps.length} submitted today
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Across all hiring roles
            </div>
          </div>

          {/* Card 3: Shortlisted Candidates */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Shortlisted
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-700">
                {loading ? "--" : statusCounts["SHORTLISTED"] || 0}
              </span>
              <span className="text-xs text-slate-400">
                Ready for interview
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Passed initial evaluation
            </div>
          </div>

          {/* Card 4: Under Review / Screened */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">
                Pending Review
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {loading
                  ? "--"
                  : (statusCounts["APPLIED"] || 0) + (statusCounts["SCREENED"] || 0)}
              </span>
              <span className="text-xs text-slate-400">
                Awaiting HR decision
              </span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500">
              Requires shortlisting / rejection
            </div>
          </div>
        </div>

        {/* Main 2-Column Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Active Roles List (2 cols) */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Open Job Roles
                </h2>
              </div>
              <Link
                href="/jobs"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition flex items-center gap-1"
              >
                <span>Manage Roles</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                  <span className="text-xs">Loading roles...</span>
                </div>
              ) : jobs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  No job roles created yet. Click "Create Role" to begin.
                </div>
              ) : (
                jobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 transition"
                  >
                    <div>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="font-bold text-sm text-slate-900 hover:text-blue-600 block"
                      >
                        {job.title}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span>{job.department}</span>
                        <span>•</span>
                        <span>{job.location || "Remote"}</span>
                        <span>•</span>
                        <span className="font-mono text-slate-700 font-semibold">
                          {job.applications_count} applicants
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusBadge status={job.status} type="job" />
                      <Link
                        href={`/pipeline/${job.id}`}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition border border-slate-200"
                      >
                        Pipeline &rarr;
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Recent Applications Feed (1 col) */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Recent Submissions
                </h2>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-xs">Loading...</div>
              ) : applications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  No applications received yet.
                </div>
              ) : (
                applications.slice(0, 6).map((app) => (
                  <div key={app.id} className="p-3.5 hover:bg-slate-50 transition">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/candidates/${app.id}`}
                        className="text-xs font-bold text-slate-900 hover:text-blue-600 truncate"
                      >
                        {app.candidate_name}
                      </Link>
                      <StatusBadge status={app.current_status} type="application" />
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {app.job_title}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-50">
                      <span>{app.reference_number}</span>
                      <span>
                        {new Date(app.applied_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
