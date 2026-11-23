"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import ScoreIndicator from "@/components/ScoreIndicator";
import StatusBadge from "@/components/StatusBadge";
import { exportCVBankCSV, getCVBank, listAllJobs } from "@/lib/api";
import { CVBankItem, JobRole } from "@/lib/types";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "APPLIED", label: "Applied" },
  { value: "SCREENED", label: "Screened (reviewed)" },
  { value: "SHORTLISTED", label: "Shortlisted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "INTERVIEW_SCHEDULED", label: "Interview scheduled" },
  { value: "INTERVIEW_COMPLETED", label: "Interview completed" },
  { value: "OFFER_EXTENDED", label: "Offer extended" },
  { value: "OFFER_ACCEPTED", label: "Offer accepted" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All sources" },
  { value: "portal", label: "Direct portal" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "email_upload", label: "Email upload" },
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
        title="Candidate bank"
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "CV bank" },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(page)}
              disabled={loading}
              className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
              title="Refresh data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition ${
                showFilters
                  ? "bg-slate-100 border-slate-300 text-slate-900"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters {hasActiveFilters && "·"}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={exporting || total === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium text-xs transition shadow-2xs disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>Export CSV</span>
            </button>
          </div>
        }
      />

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {error && (
          <div className="p-3 text-xs bg-stone-50 border border-stone-200 text-stone-800 rounded-md font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="bg-white rounded-md border border-slate-200/90 p-4 shadow-2xs space-y-4">
            <form onSubmit={handleSearchSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {/* 1. Free-Text Search */}
                <div>
                  <label className="font-medium text-slate-700 block mb-1">
                    Candidate search
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Name or email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
                    />
                  </div>
                </div>

                {/* 2. Job Role Dropdown */}
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Job role</label>
                  <select
                    value={jobRoleId}
                    onChange={(e) => setJobRoleId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
                  >
                    <option value="">All roles</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} ({j.department})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Status Filter */}
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
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
                    <label className="font-medium text-slate-700">Minimum score</label>
                    <span className="font-tabular text-slate-500 text-xs">
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
                    className="w-full accent-brand-500 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                </div>

                {/* 5. Source */}
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Source</label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
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
                  <label className="font-medium text-slate-700 block mb-1">Skill keyword</label>
                  <input
                    type="text"
                    placeholder="e.g. Python, SQL, Dispatch..."
                    value={skill}
                    onChange={(e) => setSkill(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
                  />
                </div>

                {/* 7. From Date */}
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Applied from</label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
                  />
                </div>

                {/* 8. To Date */}
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Applied to</label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset filters</span>
                  </button>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Apply filters</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Results Metadata Header */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div>
            Showing <strong className="text-slate-900 font-medium font-tabular">{items.length}</strong> of{" "}
            <strong className="text-slate-900 font-medium font-tabular">{total}</strong> total candidates in bank
          </div>
          {totalPages > 1 && (
            <div className="font-tabular">
              Page {page} of {totalPages}
            </div>
          )}
        </div>

        {/* Results Table - 7 Focused Columns (NO noisy boxes) */}
        <div className="overflow-x-auto border border-slate-200/90 rounded-md bg-white shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-600 font-medium text-xs">
                <th className="py-3 px-3.5 font-medium">Candidate</th>
                <th className="py-3 px-3.5 font-medium">Applied role</th>
                <th className="py-3 px-3.5 font-medium w-36">Match evaluation</th>
                <th className="py-3 px-3.5 font-medium">Verified competencies</th>
                <th className="py-3 px-3.5 font-medium w-28">Stage</th>
                <th className="py-3 px-3.5 font-medium w-24">Applied</th>
                <th className="py-3 px-3.5 text-right font-medium w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400">
                    {loading
                      ? "Querying candidate records..."
                      : "No candidate records match the selected filter criteria."}
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isHardFail = item.hard_filter_passed === false;

                  return (
                    <tr
                      key={item.application_id}
                      className={`transition-colors ${
                        isHardFail
                          ? "bg-stone-50/50 hover:bg-stone-100/50"
                          : "hover:bg-slate-50/70"
                      }`}
                    >
                      {/* Candidate Name & Contact */}
                      <td className="py-3 px-3.5">
                        <Link
                          href={`/candidates/${item.application_id}`}
                          className="font-medium text-slate-900 hover:text-brand-600 block transition text-xs leading-snug"
                        >
                          {item.candidate_name}
                        </Link>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>{item.candidate_email}</span>
                          {item.candidate_phone && (
                            <>
                              <span className="text-slate-300">/</span>
                              <span>{item.candidate_phone}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Job Title & Department */}
                      <td className="py-3 px-3.5">
                        <Link
                          href={`/jobs/${item.job_role_id}`}
                          className="font-medium text-slate-800 hover:text-brand-600 block transition text-xs"
                        >
                          {item.job_title}
                        </Link>
                        <span className="text-[11px] text-slate-400">{item.department}</span>
                      </td>

                      {/* Match Evaluation: Score + criteria verdict (NO boxes) */}
                      <td className="py-3 px-3.5">
                        <div className="space-y-1">
                          <ScoreIndicator score={item.screening_score} size="sm" />
                          <div className="text-[11px] leading-tight">
                            {isHardFail ? (
                              <span className="text-stone-600 font-medium">Experience gap</span>
                            ) : item.hard_filter_passed === true ? (
                              <span className="text-slate-500">Criteria met</span>
                            ) : (
                              <span className="text-slate-400">Pending review</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Verified Competencies: Plain typography (NO colored boxes) */}
                      <td className="py-3 px-3.5 max-w-md lg:max-w-xl">
                        {item.matched_skills && item.matched_skills.length > 0 ? (
                          <div className="text-xs text-slate-700 leading-relaxed font-sans">
                            <span>{item.matched_skills.slice(0, 3).join(", ")}</span>
                            {item.matched_skills.length > 3 && (
                              <span className="text-slate-400 font-tabular ml-1">
                                +{item.matched_skills.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Stage Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <StatusBadge status={item.current_status} type="application" />
                      </td>

                      {/* Applied Date */}
                      <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap font-tabular text-xs">
                        {formatDate(item.applied_at)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <Link
                            href={`/candidates/${item.application_id}`}
                            title="View candidate dossier"
                            className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          {item.resume_download_url && (
                            <a
                              href={item.resume_download_url}
                              target="_blank"
                              rel="noreferrer"
                              title="Download resume PDF"
                              className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition"
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
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>

            <span className="text-xs text-slate-600 font-tabular">
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </span>

            <button
              type="button"
              onClick={() => syncToURLAndFetch(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
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
        <div className="p-12 text-center text-xs text-slate-400">Loading CV bank...</div>
      }
    >
      <CVBankContent />
    </Suspense>
  );
}
