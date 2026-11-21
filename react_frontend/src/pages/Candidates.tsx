import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Briefcase,
  Eye,
  Filter,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import AppShell from "../components/layout/AppShell";
import Header from "../components/layout/Header";
import ScoreIndicator from "../components/ui/ScoreIndicator";
import StatusBadge from "../components/ui/StatusBadge";
import CandidateProfileDrawer from "../components/candidates/CandidateProfileDrawer";
import RejectionModal from "../components/common/RejectionModal";
import {
  listAllJobs,
  listApplications,
  rejectApplication,
  shortlistApplication,
} from "../lib/api";
import { ApplicationListItem, JobRole, RejectionReason } from "../lib/types";

const SKILL_TAGS = [
  "All Skills",
  "Python",
  "Node.js",
  "React",
  "PostgreSQL",
  "Linehaul",
  "Fleet Dispatch",
  "Docker",
  "Logistics Ops",
  "Supply Chain",
];

export default function Candidates() {
  const [candidates, setCandidates] = useState<ApplicationListItem[]>([]);
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("All Skills");
  const [selectedJobId, setSelectedJobId] = useState<string>("all");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Drawer & Modal State
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [rejectModalState, setRejectModalState] = useState<{
    isOpen: boolean;
    candidateId?: string;
    candidateName?: string;
  }>({ isOpen: false });
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [jobsData, appsData] = await Promise.all([
        listAllJobs(),
        listApplications({
          job_role_id: selectedJobId === "all" ? undefined : selectedJobId,
          search: searchQuery.trim() || undefined,
          limit: 100,
        }),
      ]);
      setJobs(jobsData || []);
      setCandidates(appsData.items || []);
    } catch (err: any) {
      setError(err.message || "Failed to load candidate directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedJobId]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleQuickShortlist = async (id: string) => {
    try {
      setActionLoading(true);
      await shortlistApplication(id, "Shortlisted from candidate talent pool");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to shortlist candidate");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmRejection = async (reason: RejectionReason, remarks: string) => {
    if (!rejectModalState.candidateId) return;
    try {
      setActionLoading(true);
      await rejectApplication(rejectModalState.candidateId, reason, remarks);
      setRejectModalState({ isOpen: false });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to reject candidate");
    } finally {
      setActionLoading(false);
    }
  };

  // Filter candidates by skill tag
  const filteredCandidates = candidates.filter((c) => {
    if (selectedSkill === "All Skills") return true;
    const skills = c.matched_skills || [];
    return skills.some((s) => s.toLowerCase().includes(selectedSkill.toLowerCase()));
  });

  const totalPages = Math.ceil(filteredCandidates.length / pageSize) || 1;
  const paginatedCandidates = filteredCandidates.slice((page - 1) * pageSize, page * pageSize);

  const highFitCount = candidates.filter((c) => (c.screening_score ?? 0) >= 70).length;
  const shortlistedCount = candidates.filter((c) => c.current_status === "SHORTLISTED").length;
  const hiredCount = candidates.filter((c) => c.current_status === "HIRED" || c.current_status === "OFFER_ACCEPTED").length;

  return (
    <AppShell>
      <Header
        title="Candidate Talent Pool"
        breadcrumbs={[{ label: "Overview", href: "/dashboard" }, { label: "Candidates" }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 cursor-pointer"
              title="Refresh talent directory"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Link
              to="/upload-cv"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs cursor-pointer"
            >
              <span>+ Upload CV</span>
            </Link>
          </div>
        }
      />

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Metric Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-md border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Total Applicants</span>
            <span className="text-xl font-semibold text-slate-900 font-tabular">{candidates.length}</span>
          </div>
          <div className="bg-white p-3.5 rounded-md border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Top Match ($\ge 70\%$)</span>
            <span className="text-xl font-semibold text-brand-600 font-tabular">{highFitCount}</span>
          </div>
          <div className="bg-white p-3.5 rounded-md border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Shortlisted</span>
            <span className="text-xl font-semibold text-signal-published font-tabular">{shortlistedCount}</span>
          </div>
          <div className="bg-white p-3.5 rounded-md border border-slate-200/90 shadow-2xs">
            <span className="text-[11px] font-medium text-slate-500 block">Hired / Offered</span>
            <span className="text-xl font-semibold text-slate-700 font-tabular">{hiredCount}</span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-white rounded-md border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search candidates by name, email, or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 font-medium"
              />
            </div>

            {/* Job Opening Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Role:</span>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-brand-500 font-medium max-w-xs truncate"
              >
                <option value="all">All Positions</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.department})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Skill Tag Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100 text-xs">
            <span className="text-[11px] text-slate-400 font-medium shrink-0 mr-1">Skills:</span>
            {SKILL_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  setSelectedSkill(tag);
                  setPage(1);
                }}
                className={`px-2.5 py-0.5 rounded text-[11px] font-medium transition shrink-0 cursor-pointer ${
                  selectedSkill === tag
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs bg-stone-50 border border-stone-200 text-stone-800 rounded-md font-medium">
            {error}
          </div>
        )}

        {/* Dense Candidate Talent Table */}
        <div className="bg-white rounded-md border border-slate-200/90 shadow-2xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-600 font-medium text-xs">
                <th className="py-2.5 px-3.5 font-medium">Candidate</th>
                <th className="py-2.5 px-3 font-medium">Applied Position</th>
                <th className="py-2.5 px-3 font-medium">Top Skills</th>
                <th className="py-2.5 px-3 font-medium text-center">Fit Score</th>
                <th className="py-2.5 px-3 font-medium">Stage</th>
                <th className="py-2.5 px-3 font-medium">Applied Date</th>
                <th className="py-2.5 px-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                    <span>Loading talent pool...</span>
                  </td>
                </tr>
              ) : paginatedCandidates.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No candidates found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedCandidates.map((candidate) => {
                  const isShortlisted = candidate.current_status === "SHORTLISTED";
                  const isTerminal = candidate.current_status === "REJECTED" || candidate.current_status === "OFFER_ACCEPTED";

                  return (
                    <tr key={candidate.id} className="hover:bg-slate-50/70 transition">
                      {/* Name & Contact */}
                      <td className="py-2.5 px-3.5">
                        <button
                          type="button"
                          onClick={() => setSelectedAppId(candidate.id)}
                          className="font-medium text-slate-900 hover:text-brand-600 text-left block leading-snug transition cursor-pointer"
                        >
                          {candidate.candidate_name}
                        </button>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {candidate.reference_number || "Ref pending"}
                        </div>
                      </td>

                      {/* Applied Position */}
                      <td className="py-2.5 px-3 text-slate-700 font-medium">
                        <Link
                          to={`/pipeline/${candidate.job_role_id}`}
                          className="hover:text-brand-600 transition"
                        >
                          {candidate.job_title}
                        </Link>
                      </td>

                      {/* Skills */}
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {candidate.matched_skills && candidate.matched_skills.length > 0 ? (
                            candidate.matched_skills.slice(0, 3).map((s, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-medium"
                              >
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400">Parsed on review</span>
                          )}
                        </div>
                      </td>

                      {/* Match Score */}
                      <td className="py-2.5 px-3 text-center">
                        <ScoreIndicator score={candidate.screening_score} size="sm" />
                      </td>

                      {/* Stage Badge */}
                      <td className="py-2.5 px-3">
                        <StatusBadge status={candidate.current_status} />
                      </td>

                      {/* Applied Date */}
                      <td className="py-2.5 px-3 text-slate-500 font-tabular text-xs">
                        {candidate.applied_at ? new Date(candidate.applied_at).toLocaleDateString("en-IN") : "--"}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {!isShortlisted && !isTerminal && (
                            <button
                              type="button"
                              onClick={() => handleQuickShortlist(candidate.id)}
                              disabled={actionLoading}
                              className="px-2 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-brand-600 text-[11px] font-medium transition cursor-pointer"
                              title="Shortlist for interview"
                            >
                              Shortlist
                            </button>
                          )}

                          {!isTerminal && (
                            <button
                              type="button"
                              onClick={() =>
                                setRejectModalState({
                                  isOpen: true,
                                  candidateId: candidate.id,
                                  candidateName: candidate.candidate_name,
                                })
                              }
                              disabled={actionLoading}
                              className="px-2 py-1 rounded text-slate-400 hover:text-stone-800 hover:bg-slate-100 text-[11px] font-medium transition cursor-pointer"
                              title="Reject candidate"
                            >
                              Reject
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedAppId(candidate.id)}
                            className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition cursor-pointer"
                            title="Open candidate dossier"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination Footer */}
          {filteredCandidates.length > 0 && (
            <div className="px-4 py-3 border-t border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing {(page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, filteredCandidates.length)} of {filteredCandidates.length} candidates
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

      {/* Candidate Profile Slide-over Drawer */}
      <CandidateProfileDrawer
        applicationId={selectedAppId}
        isOpen={Boolean(selectedAppId)}
        onClose={() => setSelectedAppId(null)}
        onStatusUpdated={loadData}
      />

      {/* Rejection Modal */}
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
