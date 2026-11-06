"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import StatusBadge from "@/components/StatusBadge";
import { exportCVBankCSV, getCVBank, listAllJobs } from "@/lib/api";
import { CVBankItem, JobRole } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "APPLIED", label: "Applied" },
  { value: "SCREENED", label: "Screened (Reviewed)" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "INTERVIEW_SCHEDULED", label: "Interview Scheduled" },
  { value: "INTERVIEW_COMPLETED", label: "Interview Completed" },
  { value: "OFFER_EXTENDED", label: "Offer Extended" },
  { value: "OFFER_ACCEPTED", label: "Offer Accepted" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: "portal", label: "Candidate Portal" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "email_upload", label: "Email Upload" },
];

function CVBankContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filter States from URL search params
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [jobRoleId, setJobRoleId] = useState(searchParams.get("job_role_id") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [minScore, setMinScore] = useState<number | string>(
    searchParams.get("min_score") ? Number(searchParams.get("min_score")) : ""
  );
  const [source, setSource] = useState(searchParams.get("source") || "");
  const [skill, setSkill] = useState(searchParams.get("skill") || "");
  const [fromDate, setFromDate] = useState(searchParams.get("from_date") || "");
  const [toDate, setToDate] = useState(searchParams.get("to_date") || "");
  const [page, setPage] = useState<number>(Number(searchParams.get("page")) || 1);

  // Data & UI states
  const [items, setItems] = useState<CVBankItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(true);

  // Load available roles for dropdown filter
  useEffect(() => {
    listAllJobs()
      .then((res) => setJobs(res || []))
      .catch(() => {});
  }, []);

  // Fetch CV Bank Data
  const loadData = async (currentPage = page) => {
    try {
      setLoading(true);
      setError(null);

      const res = await getCVBank({
        job_role_id: jobRoleId || undefined,
        status: status || undefined,
        min_score: minScore !== "" ? Number(minScore) : undefined,
        source: source || undefined,
        skill: skill.trim() || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        search: search.trim() || undefined,
        page: currentPage,
        limit: 25,
      });

      setItems(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err: any) {
      setError(err.message || "Failed to query CV Bank");
    } finally {
      setLoading(false);
    }
  };

  // Sync state to URL and load data
  const syncToURLAndFetch = (newPage = 1) => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (jobRoleId) params.set("job_role_id", jobRoleId);
    if (status) params.set("status", status);
    if (minScore !== "") params.set("min_score", minScore.toString());
    if (source) params.set("source", source);
    if (skill.trim()) params.set("skill", skill.trim());
    if (fromDate) params.set("from_date", fromDate);
    if (toDate) params.set("to_date", toDate);
    if (newPage > 1) params.set("page", newPage.toString());

    router.push(`/cv-bank${params.toString() ? `?${params.toString()}` : ""}`);
    setPage(newPage);
    loadData(newPage);
  };

  useEffect(() => {
    loadData(page);
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    syncToURLAndFetch(1);
  };

  const handleResetFilters = () => {
    setSearch("");
    setJobRoleId("");
    setStatus("");
    setMinScore("");
    setSource("");
    setSkill("");
    setFromDate("");
    setToDate("");
    setPage(1);
    router.push("/cv-bank");
    setTimeout(() => {
      getCVBank({ page: 1, limit: 25 }).then((res) => {
        setItems(res.items || []);
        setTotal(res.total || 0);
        setTotalPages(res.total_pages || 1);
      });
    }, 0);
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const blob = await exportCVBankCSV({
        job_role_id: jobRoleId || undefined,
        status: status || undefined,
        min_score: minScore !== "" ? Number(minScore) : undefined,
        source: source || undefined,
        skill: skill.trim() || undefined,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
        search: search.trim() || undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const today = new Date().toISOString().split("T")[0];
      a.download = `cv-bank-${today}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (isoString: string) => {
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

  const hasActiveFilters = Boolean(
    search || jobRoleId || status || minScore !== "" || source || skill || fromDate || toDate
  );

  return (
    <AppShell>
      <Header
        title="CV Bank"
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "CV Bank" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(page)}
              disabled={loading}
              className="p-1.5 rounded bg-white border border-slate-300 text-slate-600 hover:text-slate-900 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-semibold transition ${
                showFilters
                  ? "bg-slate-100 border-slate-300 text-slate-800"
                  : "bg-white border-slate-300 text-slate-600 hover:text-slate-900"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters {hasActiveFilters && "•"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={exporting || total === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-sm disabled:bg-slate-300"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              <span>Export CSV</span>
            </button>
          </div>
        }
      />

      <main className="p-6 space-y-4">
        {error && (
          <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-4">
            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {/* 1. Free-Text Search */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Candidate Search
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Name or email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                    />
                  </div>
                </div>

                {/* 2. Job Role Dropdown */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Job Role</label>
                  <select
                    value={jobRoleId}
                    onChange={(e) => setJobRoleId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    <option value="">All Roles</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} ({j.department})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Status Filter */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Min Score */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Min Score</label>
                    <span className="font-mono text-slate-500 text-[11px]">
                      {minScore !== "" ? `${minScore}%` : "Any"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={minScore === "" ? 0 : minScore}
                    onChange={(e) => setMinScore(e.target.value === "0" ? "" : Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                </div>

                {/* 5. Source */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  >
                    {SOURCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 6. Skill Keyword */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Skill Keyword</label>
                  <input
                    type="text"
                    placeholder="e.g. Python, SQL, Logistics..."
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* 7. From Date */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Applied From</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>

                {/* 8. To Date */}
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Applied To</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Filters</span>
                  </button>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Apply Filters</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Results Metadata Header */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div>
            Showing <strong className="text-slate-800">{items.length}</strong> of{" "}
            <strong className="text-slate-800">{total}</strong> total candidates in CV Bank
          </div>
          {totalPages > 1 && (
            <div className="font-mono">
              Page {page} of {totalPages}
            </div>
          )}
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-3">Candidate</th>
                <th className="py-2.5 px-3">Role Applied</th>
                <th className="py-2.5 px-3">Reference</th>
                <th className="py-2.5 px-3">Applied</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3">AI Score</th>
                <th className="py-2.5 px-3">Hard Filter</th>
                <th className="py-2.5 px-3">Matched Skills</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400 italic">
                    {loading
                      ? "Querying CV Bank..."
                      : "No candidate records found matching your filter criteria."}
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isHardFail = item.hard_filter_passed === false;

                  return (
                    <tr
                      key={item.application_id}
                      className={`transition ${
                        isHardFail
                          ? "bg-rose-50/70 hover:bg-rose-100/50 border-l-4 border-rose-400"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      {/* Candidate Name & Contact */}
                      <td className="py-2.5 px-3">
                        <Link
                          href={`/candidates/${item.application_id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600 block"
                        >
                          {item.candidate_name}
                        </Link>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>{item.candidate_email}</span>
                          {item.candidate_phone && <span>• {item.candidate_phone}</span>}
                        </div>
                      </td>

                      {/* Job Title & Department */}
                      <td className="py-2.5 px-3">
                        <Link
                          href={`/jobs/${item.job_role_id}`}
                          className="font-medium text-slate-800 hover:text-blue-600 block"
                        >
                          {item.job_title}
                        </Link>
                        <span className="text-[11px] text-slate-400">{item.department}</span>
                      </td>

                      {/* Reference Number */}
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {item.reference_number}
                      </td>

                      {/* Applied Date */}
                      <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                        {formatDate(item.applied_at)}
                      </td>

                      {/* Source */}
                      <td className="py-2.5 px-3">
                        <StatusBadge status={item.source} type="source" />
                      </td>

                      {/* AI Score with progress bar behind */}
                      <td className="py-2.5 px-3">
                        {item.screening_score !== null && item.screening_score !== undefined ? (
                          <div
                            className={`relative px-2 py-1 rounded border text-xs font-mono font-bold text-center overflow-hidden w-20 shadow-xs ${
                              item.screening_score >= 70
                                ? "border-emerald-300 text-emerald-800 bg-emerald-50/40"
                                : item.screening_score >= 40
                                ? "border-amber-300 text-amber-800 bg-amber-50/40"
                                : "border-rose-300 text-rose-800 bg-rose-50/40"
                            }`}
                          >
                            <div
                              className={`absolute inset-y-0 left-0 transition-all ${
                                item.screening_score >= 70
                                  ? "bg-emerald-200/50"
                                  : item.screening_score >= 40
                                  ? "bg-amber-200/50"
                                  : "bg-rose-200/50"
                              }`}
                              style={{
                                width: `${Math.min(100, Math.max(0, item.screening_score))}%`,
                              }}
                            />
                            <span className="relative z-10">{item.screening_score}/100</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Hard Filter Badge */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        {isHardFail ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-rose-100 text-rose-800 border border-rose-300 shadow-xs">
                            Hard Fail
                          </span>
                        ) : item.hard_filter_passed === true ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Passed
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Matched Skills */}
                      <td className="py-2.5 px-3 max-w-[180px]">
                        {item.matched_skills && item.matched_skills.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {item.matched_skills.slice(0, 2).map((s, idx) => (
                              <span
                                key={idx}
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200"
                              >
                                {s}
                              </span>
                            ))}
                            {item.matched_skills.length > 2 && (
                              <span className="text-[10px] text-slate-400 font-medium">
                                +{item.matched_skills.length - 2}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <StatusBadge status={item.current_status} type="application" />
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="inline-flex items-center gap-1 justify-end">
                          <Link
                            href={`/candidates/${item.application_id}`}
                            title="View Candidate Profile"
                            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          {item.resume_download_url && (
                            <a
                              href={item.resume_download_url}
                              target="_blank"
                              rel="noreferrer"
                              title="Download Resume"
                              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => syncToURLAndFetch(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="text-xs text-slate-600">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>

            <button
              type="button"
              onClick={() => syncToURLAndFetch(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </main>
    </AppShell>
  );
}

export default function CVBankPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-slate-500">Loading CV Bank...</div>
      }
    >
      <CVBankContent />
    </Suspense>
  );
}
