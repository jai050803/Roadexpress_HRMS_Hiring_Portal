"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, Search } from "lucide-react";
import JobCard from "@/components/JobCard";
import { getPublishedJobs, JobSummary } from "@/lib/api";

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("all");

  useEffect(() => {
    async function loadJobs() {
      try {
        setLoading(true);
        setError(null);
        const data = await getPublishedJobs();
        setJobs(data);
      } catch (err: any) {
        setError(err.message || "Failed to load current career opportunities.");
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  const departments = ["all", ...Array.from(new Set(jobs.map((j) => j.department)))];

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.department.toLowerCase().includes(search.toLowerCase()) ||
      (job.location && job.location.toLowerCase().includes(search.toLowerCase()));

    const matchesDept = selectedDept === "all" || job.department === selectedDept;

    return matchesSearch && matchesDept;
  });

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-8">
      {/* Hero Header */}
      <div className="border-b border-slate-200 pb-8">
        <span className="inline-block px-2.5 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700 mb-3">
          Road Express Talent Network
        </span>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight mb-2">
          Build the logistics infrastructure of tomorrow
        </h1>
        <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
          Explore corporate, engineering, accounts, operations, and supply chain management positions across Road Express Freight.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-md border border-slate-200/90 p-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by role title, department, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-slate-900 placeholder:text-slate-400 bg-white"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-medium text-slate-500 hidden sm:inline-block">
              Department:
            </span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 text-xs rounded-md border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === "all" ? "All departments" : dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Job Grid / States */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-500">Loading open roles...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-md bg-stone-50 border border-stone-200 text-center max-w-lg mx-auto">
          <p className="text-xs font-medium text-stone-800 mb-3">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-3.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition"
          >
            Retry
          </button>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-md border border-slate-200/90 p-8 shadow-2xs">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">No openings found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
            {search || selectedDept !== "all"
              ? "No roles match your search filters. Try adjusting your query."
              : "There are currently no published openings available. Check back soon or track an active submission."}
          </p>
          {(search || selectedDept !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedDept("all");
              }}
              className="text-xs font-medium text-slate-700 hover:text-slate-950 underline"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </main>
  );
}
