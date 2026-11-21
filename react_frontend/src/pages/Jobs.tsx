import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Briefcase,
  CheckCircle,
  Filter,
  Loader2,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import AppShell from "../components/layout/AppShell";
import Header from "../components/layout/Header";
import StatusBadge from "../components/ui/StatusBadge";
import CreateJobModal from "../components/jobs/CreateJobModal";
import { closeJob, listAllJobs, publishJob } from "../lib/api";
import { JobRole } from "../lib/types";

const DEPARTMENTS = [
  "All Departments",
  "Engineering",
  "Supply Chain",
  "Accounts & Finance",
  "Human Resources",
  "Operations & Team Lead",
  "Data & Analytics",
];

const WORK_MODES = [
  { value: "all", label: "All Work Modes" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
  { value: "remote", label: "Remote" },
];

export default function Jobs() {
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("All Departments");
  const [workModeFilter, setWorkModeFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listAllJobs(
        statusFilter === "all" ? undefined : statusFilter,
        departmentFilter === "All Departments" ? undefined : departmentFilter
      );
      setJobs(data || []);
    } catch (err: any) {
      setError(err.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [statusFilter, departmentFilter]);

  const handlePublish = async (jobId: string) => {
    if (!window.confirm("Publish this job role? It will become visible on the public careers portal.")) {
      return;
    }
    try {
      setActionLoading(jobId);
      await publishJob(jobId);
      await loadJobs();
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
      await loadJobs();
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

  // Filter jobs by work mode locally if selected
  const filteredJobs = jobs.filter((job) => {
    if (workModeFilter !== "all" && job.work_mode !== workModeFilter) {
      return false;
    }
    return true;
  });

  const publishedCount = jobs.filter((j) => j.status === "published").length;
  const draftCount = jobs.filter((j) => j.status === "draft").length;
  const closedCount = jobs.filter((j) => j.status === "closed").length;

  return (
    <AppShell>
      <Header
        title="Job Openings & Roles"
        breadcrumbs={[{ label: "Overview", href: "/dashboard" }, { label: "Job roles" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadJobs}
              disabled={loading}
              className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 cursor-pointer"
              title="Refresh job listings"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              to="/jobs/new"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create role</span>
            </Link>
          </div>
        }
      />

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Metric Summary Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-md border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Total Roles</span>
            <span className="text-xl font-semibold text-slate-900 font-tabular">{jobs.length}</span>
          </div>
          <div className="bg-white p-3.5 rounded-md border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Published (Active)</span>
            <span className="text-xl font-semibold text-signal-published font-tabular">{publishedCount}</span>
          </div>
          <div className="bg-white p-3.5 rounded-md border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Draft Openings</span>
            <span className="text-xl font-semibold text-amber-600 font-tabular">{draftCount}</span>
          </div>
          <div className="bg-white p-3.5 rounded-md border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Closed Positions</span>
            <span className="text-xl font-semibold text-slate-500 font-tabular">{closedCount}</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200/60 text-xs font-medium">
            {["all", "published", "draft", "closed"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded capitalize transition cursor-pointer ${
                  statusFilter === f
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Department & Work Mode Dropdowns */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-brand-500 font-medium"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <select
              value={workModeFilter}
              onChange={(e) => setWorkModeFilter(e.target.value)}
              className="px-2.5 py-1 text-xs rounded border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-brand-500 font-medium"
            >
              {WORK_MODES.map((wm) => (
                <option key={wm.value} value={wm.value}>
                  {wm.label}
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

        {/* Dense Job Openings Table */}
        <div className="bg-white rounded-md border border-slate-200/90 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-600 font-medium text-xs">
                <th className="py-2.5 px-3.5 font-medium">Title & Department</th>
                <th className="py-2.5 px-3 font-medium">Location / Mode</th>
                <th className="py-2.5 px-3 font-medium">Salary Band</th>
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
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading roles...</span>
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No job roles found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const isProcessing = actionLoading === job.id;

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-3.5">
                        <Link
                          to={`/jobs/${job.id}`}
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

                      <td className="py-2.5 px-3 text-slate-600 capitalize">
                        {job.location || "Corporate HQ"}
                        {job.work_mode && (
                          <span className="block text-[11px] text-slate-400">
                            ({job.work_mode})
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 font-tabular">
                        {job.salary_band || "Undisclosed"}
                      </td>

                      <td className="py-2.5 px-3">
                        <StatusBadge status={job.status} type="job" />
                      </td>

                      <td className="py-2.5 px-3">
                        <Link
                          to={`/pipeline/${job.id}`}
                          className="font-tabular font-medium text-slate-800 hover:text-brand-600 flex items-center gap-1.5 transition"
                        >
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{job.applications_count || 0}</span>
                        </Link>
                      </td>

                      <td className="py-2.5 px-3 text-slate-600 font-tabular text-xs">
                        {formatDate(job.application_deadline)}
                      </td>

                      <td className="py-2.5 px-3">
                        {job.linkedin_posted ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 font-medium">
                            <CheckCircle className="w-3 h-3 text-signal-published" /> Posted
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Not shared</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Link
                            to={`/pipeline/${job.id}`}
                            className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-[11px] transition"
                            title="Candidate pipeline"
                          >
                            Pipeline
                          </Link>

                          <Link
                            to={`/jobs/${job.id}`}
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
                              className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium text-[11px] transition disabled:opacity-50 cursor-pointer"
                            >
                              Publish
                            </button>
                          )}

                          {job.status === "published" && (
                            <button
                              type="button"
                              onClick={() => handleClose(job.id)}
                              disabled={isProcessing}
                              className="px-2.5 py-1 rounded-md bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 font-medium text-[11px] transition disabled:opacity-50 cursor-pointer"
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

      {/* Create Job Opening Modal */}
      <CreateJobModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          loadJobs();
        }}
      />
    </AppShell>
  );
}
