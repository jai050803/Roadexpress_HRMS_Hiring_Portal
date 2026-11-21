import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Briefcase,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Star,
  Users,
} from "lucide-react";
import AppShell from "../components/layout/AppShell";
import Header from "../components/layout/Header";
import ScoreIndicator from "../components/ui/ScoreIndicator";
import StatusBadge from "../components/ui/StatusBadge";
import CandidateProfileDrawer from "../components/candidates/CandidateProfileDrawer";
import ResumePreviewModal from "../components/resumes/ResumePreviewModal";
import { exportCVBankCSV, getCVBank, listAllJobs } from "../lib/api";
import { CVBankItem, JobRole } from "../lib/types";

export default function CVBank() {
  const [candidates, setCandidates] = useState<CVBankItem[]>([]);
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [minScore, setMinScore] = useState<number | "">("");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  // Drawer & Resume Preview
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [previewResumeState, setPreviewResumeState] = useState<{
    isOpen: boolean;
    resumeId?: string;
    candidateName?: string;
  }>({ isOpen: false });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, any> = {
        page,
        limit: pageSize,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (roleFilter !== "all") params.job_role_id = roleFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      if (minScore !== "") params.min_score = Number(minScore);

      const [cvData, jobsData] = await Promise.all([
        getCVBank(params),
        listAllJobs(),
      ]);

      setCandidates(cvData.items || []);
      setTotalCount(cvData.total || 0);
      setJobs(jobsData || []);
    } catch (err: any) {
      setError(err.message || "Failed to query CV talent bank.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, roleFilter, statusFilter, minScore]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadData();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params: Record<string, any> = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (roleFilter !== "all") params.job_role_id = roleFilter;
      if (statusFilter !== "all") params.status = statusFilter;
      if (minScore !== "") params.min_score = Number(minScore);

      const blob = await exportCVBankCSV(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `RoadExpress_Talent_Bank_Export_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || "Failed to export talent CSV");
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <AppShell>
      <Header
        title="CV Bank & Talent Repository"
        breadcrumbs={[{ label: "Overview", href: "/dashboard" }, { label: "CV Bank" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 cursor-pointer"
              title="Refresh CV bank"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={exporting || totalCount === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-medium text-xs transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
              <span>{exporting ? "Generating CSV..." : "Export to CSV"}</span>
            </button>
          </div>
        }
      />

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Filter Controls Ribbon */}
        <div className="bg-white rounded-md border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search candidates, skills, emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 font-medium"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 font-medium truncate"
            >
              <option value="all">All Positions</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 font-medium capitalize"
            >
              <option value="all">All Stages</option>
              <option value="APPLIED">Applied</option>
              <option value="SCREENED">Screened</option>
              <option value="SHORTLISTED">Shortlisted</option>
              <option value="INTERVIEW_SCHEDULED">Interview Scheduled</option>
              <option value="OFFER_EXTENDED">Offer Extended</option>
              <option value="HIRED">Hired</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Min Fit Score */}
            <select
              value={minScore}
              onChange={(e) => {
                setMinScore(e.target.value === "" ? "" : Number(e.target.value));
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-slate-700 font-medium"
            >
              <option value="">All Match Scores</option>
              <option value="50">Fit Score ≥ 50%</option>
              <option value="70">Top Fit ≥ 70%</option>
              <option value="85">Elite Fit ≥ 85%</option>
            </select>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>
              Total records archived: <strong className="font-tabular text-slate-900">{totalCount}</strong>
            </span>
            <span className="text-[11px] text-slate-400">
              Direct resume streaming &amp; CSV reporting enabled
            </span>
          </div>
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
                <th className="py-2.5 px-3.5 font-medium">Candidate</th>
                <th className="py-2.5 px-3 font-medium">Applied Position</th>
                <th className="py-2.5 px-3 font-medium">Skills</th>
                <th className="py-2.5 px-3 font-medium text-center">Score</th>
                <th className="py-2.5 px-3 font-medium">Stage</th>
                <th className="py-2.5 px-3 font-medium">Source</th>
                <th className="py-2.5 px-3 font-medium">Date</th>
                <th className="py-2.5 px-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Searching talent archive...</span>
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No candidates found matching the query.
                  </td>
                </tr>
              ) : (
                candidates.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3.5">
                      <button
                        type="button"
                        onClick={() => setSelectedAppId(c.id)}
                        className="font-medium text-slate-900 hover:text-brand-600 text-left block leading-snug transition cursor-pointer"
                      >
                        {c.candidate_name}
                      </button>
                      <div className="text-[11px] text-slate-400 truncate max-w-xs">
                        {c.candidate_email}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      <Link
                        to={`/pipeline/${c.job_role_id}`}
                        className="hover:text-brand-600 transition"
                      >
                        {c.job_title}
                      </Link>
                      <span className="block text-[11px] text-slate-400 font-normal">
                        {c.job_department}
                      </span>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {c.matched_skills && c.matched_skills.length > 0 ? (
                          c.matched_skills.slice(0, 3).map((s, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium"
                            >
                              {s}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">None detected</span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <ScoreIndicator score={c.screening_score} size="sm" />
                    </td>

                    <td className="py-2.5 px-3">
                      <StatusBadge status={c.current_status} />
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-100 text-slate-600 capitalize">
                        {c.source || "portal"}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-500 font-tabular text-xs">
                      {c.applied_at ? new Date(c.applied_at).toLocaleDateString("en-IN") : "--"}
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {c.resume_id && (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewResumeState({
                                isOpen: true,
                                resumeId: c.resume_id,
                                candidateName: c.candidate_name,
                              })
                            }
                            className="p-1 text-slate-400 hover:text-brand-600 hover:bg-slate-100 rounded transition cursor-pointer"
                            title="Preview PDF resume"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedAppId(c.id)}
                          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition cursor-pointer"
                          title="Open dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {totalCount > 0 && (
            <div className="px-4 py-3 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {(page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, totalCount)} of {totalCount} records
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                >
                  Previous
                </button>
                <span className="font-tabular font-medium text-slate-800">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2.5 py-1 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Candidate Dossier Drawer */}
      <CandidateProfileDrawer
        applicationId={selectedAppId}
        isOpen={Boolean(selectedAppId)}
        onClose={() => setSelectedAppId(null)}
        onStatusUpdated={loadData}
      />

      {/* Resume Viewer */}
      <ResumePreviewModal
        resumeId={previewResumeState.resumeId}
        candidateName={previewResumeState.candidateName}
        isOpen={previewResumeState.isOpen}
        onClose={() => setPreviewResumeState({ isOpen: false })}
      />
    </AppShell>
  );
}
