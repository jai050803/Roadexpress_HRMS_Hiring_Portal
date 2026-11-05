"use client";

import { useEffect, useState } from "react";
import { Building2, Filter, Loader2, Search } from "lucide-react";
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
    <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      {/* Hero Header */}
      <div className="mb-10 text-center sm:text-left">
        <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold uppercase tracking-wider mb-3">
          Road Express Talent Network
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-3">
          Build the Logistics Infrastructure of Tomorrow
        </h1>
        <p className="text-slate-600 text-sm sm:text-base max-w-2xl">
          Join our corporate, engineering, accounts, and supply chain management teams shaping India's most dependable logistics network.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by role title, department, or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:inline-block">
              Department:
            </span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === "all" ? "All Departments" : dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Job Grid / States */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Loading open roles...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-xl bg-red-50 border border-red-200 text-center max-w-lg mx-auto">
          <p className="text-sm font-semibold text-red-800 mb-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition"
          >
            Retry Loading
          </button>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No Openings Found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
            {search || selectedDept !== "all"
              ? "No roles matched your search criteria. Try resetting the filters."
              : "There are currently no published positions available. Please check back soon or track an existing application."}
          </p>
          {(search || selectedDept !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setSelectedDept("all");
              }}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </main>
  );
}
