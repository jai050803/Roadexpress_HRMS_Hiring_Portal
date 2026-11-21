import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Briefcase,
  Calendar,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Loader2,
  Lock,
  Send,
  Users,
} from "lucide-react";
import AppShell from "../components/layout/AppShell";
import Header from "../components/layout/Header";
import LinkedInCopyPanel from "../components/jobs/LinkedInCopyPanel";
import StatusBadge from "../components/ui/StatusBadge";
import ScoreIndicator from "../components/ui/ScoreIndicator";
import { closeJob, getJob, listApplications, publishJob } from "../lib/api";
import { ApplicationListItem, JobRole } from "../lib/types";

export default function JobDetail() {
  const params = useParams<{ id: string }>();
  const navigate = useNavigate();
  const jobId = params.id as string;

  const [job, setJob] = useState<JobRole | null>(null);
  const [applications, setApplications] = useState<ApplicationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadJobData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [jobData, appsData] = await Promise.all([
        getJob(jobId),
        listApplications({ job_role_id: jobId, limit: 20 }).catch(() => ({ items: [] })),
      ]);
      setJob(jobData);
      setApplications(appsData.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load job role");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (jobId) loadJobData();
  }, [jobId]);

  const handlePublish = async () => {
    if (!window.confirm("Publish this job role? It will become live on the public candidate portal.")) {
      return;
    }
    try {
      setActionLoading(true);
      await publishJob(jobId);
      await loadJobData();
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
      await loadJobData();
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
        <div className="p-16 text-center text-slate-400">
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
          <div className="p-4 rounded-md bg-stone-50 border border-stone-200 text-stone-800 text-xs font-medium mb-4">
            {error || "Job role not found."}
          </div>
          <Link to="/jobs" className="text-xs text-slate-700 hover:text-slate-950 underline font-medium">
            Return to all job roles
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
          { label: "Job roles", href: "/jobs" },
          { label: job.title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Link
              to={`/pipeline/${job.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Pipeline ({job.applications_count ?? applications.length})</span>
            </Link>

            {job.status === "draft" && (
              <button
                type="button"
                onClick={handlePublish}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Publish role</span>
              </button>
            )}

            {job.status === "published" && (
              <button
                type="button"
                onClick={handleClose}
                disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 font-medium text-xs transition disabled:opacity-50 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Close role</span>
              </button>
            )}
          </div>
        }
      />

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Top Summary Banner */}
        <div className="bg-white rounded-md border border-slate-200/90 p-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <StatusBadge status={job.status} type="job" />
                <span className="text-xs font-medium text-slate-500">
                  {job.department}
                </span>
              </div>
              <h1 className="text-xl font-semibold text-slate-950 tracking-tight">
                {job.title}
              </h1>
            </div>

            <div className="flex items-center">
              <div className="flex items-center bg-slate-50/90 border border-slate-200/80 rounded-lg px-4 py-2 divide-x divide-slate-200">
                <div className="pr-4 text-left">
                  <span className="text-[11px] font-medium text-slate-500 block leading-tight">
                    Total applicants
                  </span>
                  <span className="text-base font-semibold text-slate-900 font-tabular leading-snug">
                    {job.applications_count ?? applications.length}
                  </span>
                </div>

                {job.max_applications ? (
                  <div className="pl-4 text-left">
                    <span className="text-[11px] font-medium text-slate-500 block leading-tight">
                      Application cap
                    </span>
                    <span className="text-base font-semibold text-slate-900 font-tabular leading-snug">
                      {job.applications_count ?? applications.length}
                      <span className="text-slate-400 font-normal text-xs ml-1">/ {job.max_applications}</span>
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs text-slate-600">
            <div>
              <span className="text-xs text-slate-500 block mb-0.5">
                Location & mode
              </span>
              <span className="font-medium text-slate-900">
                {job.location || "Corporate HQ"} ({job.work_mode || "hybrid"})
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 block mb-0.5">
                Employment type
              </span>
              <span className="font-medium text-slate-900 capitalize">
                {job.employment_type?.replace(/_/g, " ") || "Full Time"}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 block mb-0.5">
                Salary band
              </span>
              <span className="font-medium text-slate-900 font-tabular">
                {job.salary_band || "Undisclosed"}
              </span>
            </div>

            <div>
              <span className="text-xs text-slate-500 block mb-0.5">
                Application deadline
              </span>
              <span className="font-medium text-slate-900 font-tabular">
                {formatDate(job.application_deadline)}
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Section: JD & LinkedIn copy panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Rendered Job Description (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-md border border-slate-200/90 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <h2 className="text-xs font-semibold text-slate-900 tracking-tight">
                  Rendered job description
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Generated from role metadata
              </span>
            </div>

            {job.jd_text ? (
              <div className="prose prose-xs max-w-none text-slate-800 font-sans leading-relaxed">
                <pre className="font-sans whitespace-pre-wrap text-xs bg-slate-50/70 p-4 rounded-md border border-slate-200/80">
                  {job.jd_text}
                </pre>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-4">
                No JD text generated yet.
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

            <div className="bg-white rounded-md p-5 border border-slate-200/90 shadow-2xs">
              <h3 className="text-xs font-semibold text-slate-900 mb-1">
                Candidate pipeline
              </h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Review screened candidates, shortlist for interview, or reject applicants with audit tracking.
              </p>
              <Link
                to={`/pipeline/${job.id}`}
                className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center gap-2 transition"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Go to pipeline ({job.applications_count ?? applications.length} candidates)</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Role Applicants Stream */}
        <div className="bg-white rounded-md border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <h2 className="text-xs font-semibold text-slate-900 tracking-tight">
                Applicants for this position ({applications.length})
              </h2>
            </div>
            <Link
              to={`/pipeline/${job.id}`}
              className="text-xs font-medium text-slate-700 hover:text-slate-950 underline"
            >
              Open Kanban board
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {applications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No candidate applications received for this opening yet.
              </div>
            ) : (
              applications.map((app) => (
                <div
                  key={app.id}
                  className="p-4 hover:bg-slate-50/70 transition flex items-center justify-between gap-4"
                >
                  <div className="space-y-0.5 min-w-0">
                    <Link
                      to={`/candidates/${app.id}`}
                      className="font-medium text-xs text-slate-900 hover:text-brand-600 transition"
                    >
                      {app.candidate_name}
                    </Link>
                    <div className="text-[11px] text-slate-500">
                      <span>{app.matched_skills?.slice(0, 3).join(", ") || "Skills parsing"}</span>
                      <span className="text-slate-300 mx-1.5">/</span>
                      <span className="text-slate-400 font-tabular">{app.applied_at ? new Date(app.applied_at).toLocaleDateString("en-IN") : ""}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <ScoreIndicator score={app.screening_score} size="sm" />
                    <StatusBadge status={app.current_status} />
                    <Link
                      to={`/candidates/${app.id}`}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                      title="View candidate dossier"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
