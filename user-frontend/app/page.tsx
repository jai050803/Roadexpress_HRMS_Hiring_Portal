"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle,
  Clock,
  Compass,
  FileCheck,
  Globe,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
  TrendingUp,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import JobCard from "@/components/JobCard";
import { getPublishedJobs, JobSummary } from "@/lib/api";

const STATS = [
  { value: "500+", label: "Hubs & Cities", desc: "Pan-India connectivity" },
  { value: "99.4%", label: "Linehaul SLA", desc: "On-time delivery record" },
  { value: "12,000+", label: "Tonnes Daily", desc: "Industrial express cargo" },
  { value: "100%", label: "Corporate Merit", desc: "Fast-track promotions" },
];

const PILLARS = [
  {
    icon: Zap,
    title: "Mission-Critical Technology",
    description:
      "We design proprietary dispatch, fleet routing, and automated candidate screening platforms running 24/7 across our network.",
  },
  {
    icon: TrendingUp,
    title: "High-Velocity Growth",
    description:
      "Logistics is India's fastest-scaling infrastructure sector. Our corporate and engineering teams grow through merit and measurable impact.",
  },
  {
    icon: ShieldCheck,
    title: "Operational Excellence",
    description:
      "Disciplined logistics requires precision in accounts, contract management, linehaul scheduling, and hub safety protocols.",
  },
  {
    icon: Users,
    title: "People-Centric Culture",
    description:
      "Transparent compensation, structured career ladders, mentorship from supply chain veterans, and comprehensive benefits.",
  },
];

const DEPARTMENTS = [
  {
    name: "Engineering & Systems",
    desc: "Full-stack software, data systems, linehaul algorithms, and infrastructure reliability.",
  },
  {
    name: "Supply Chain & Operations",
    desc: "Regional hub coordination, express routing, dispatch strategy, and warehouse automation.",
  },
  {
    name: "Accounts & Financial Audit",
    desc: "Corporate billing, cost control, tariff auditing, and client financial reconciliation.",
  },
  {
    name: "Human Resources & Talent",
    desc: "People operations, candidate onboarding, compliance, and leadership development.",
  },
];

const PROCESS_STEPS = [
  {
    step: "01",
    title: "Submit CV in 2 Minutes",
    desc: "Apply with your PDF resume. No tedious 50-field forms — we extract relevant experience automatically.",
  },
  {
    step: "02",
    title: "Automated Profile Screening",
    desc: "Our screening worker assesses technical and operational alignment against role criteria within hours.",
  },
  {
    step: "03",
    title: "Technical & Leadership Discussion",
    desc: "A focused conversation with department leaders on your problem-solving experience and potential.",
  },
  {
    step: "04",
    title: "Transparent Offer & Onboarding",
    desc: "Direct communication on compensation, role expectations, and immediate start dates.",
  },
];

export default function CareerHomePage() {
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
        setError(err.message || "Unable to load open career opportunities.");
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  const departmentList = ["all", ...Array.from(new Set(jobs.map((j) => j.department)))];

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.department.toLowerCase().includes(search.toLowerCase()) ||
      (job.location && job.location.toLowerCase().includes(search.toLowerCase()));

    const matchesDept = selectedDept === "all" || job.department === selectedDept;

    return matchesSearch && matchesDept;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* 1. Cinematic Hero Section */}
      <section className="relative bg-charcoal-950 text-white border-b border-charcoal-800 overflow-hidden">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />

        <div className="max-w-6xl mx-auto px-4 py-20 sm:py-28 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-charcoal-800 border border-charcoal-700 text-xs text-brand-400 font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            Road Express Freight Careers
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white max-w-4xl leading-[1.15] mb-6">
            Powering India&apos;s freight. Building careers that move the nation.
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed mb-10">
            Join our corporate, engineering, accounts, operations, and supply chain teams orchestrating express logistics across 500+ commercial centers.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <a
              href="#open-roles"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-sm transition shadow-sm"
            >
              <span>Explore open positions</span>
              <ArrowDown className="w-4 h-4" />
            </a>

            <Link
              href="/track"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md bg-charcoal-800 hover:bg-charcoal-700 text-slate-200 border border-charcoal-700 font-medium text-sm transition"
            >
              <span>Track existing application</span>
              <Search className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Operational Metrics Strip */}
        <div className="border-t border-charcoal-800/80 bg-charcoal-900/60 backdrop-blur-xs">
          <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <div key={i} className="border-l border-charcoal-700/60 pl-4 first:border-l-0">
                <div className="text-2xl sm:text-3xl font-semibold text-white font-tabular">
                  {s.value}
                </div>
                <div className="text-xs font-medium text-slate-300 mt-0.5">{s.label}</div>
                <div className="text-[11px] text-slate-400">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Value Pillars Section */}
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
        <div className="max-w-2xl mb-12">
          <span className="text-xs font-medium text-brand-600 uppercase tracking-wider block mb-2">
            Why Road Express
          </span>
          <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight">
            Enterprise logistics with software engineering velocity.
          </h2>
          <p className="text-sm text-slate-600 mt-3 leading-relaxed">
            We are not a traditional trucking agency. Road Express Freight is a technology-enabled industrial logistics provider handling high-value express linehauls, pharmaceutical corridors, and automotive supply chains.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PILLARS.map((p, idx) => {
            const Icon = p.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-md border border-slate-200/90 p-6 shadow-2xs hover:border-slate-300 transition"
              >
                <div className="w-9 h-9 rounded-md bg-slate-100 text-slate-800 flex items-center justify-center mb-4">
                  <Icon className="w-4 h-4 text-slate-700" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  {p.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {p.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Core Departments Overview */}
      <section className="bg-slate-100/60 border-y border-slate-200/80 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-xl mb-12">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">
              Our Core Divisions
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight">
              Where will you make your mark?
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {DEPARTMENTS.map((d, idx) => (
              <div
                key={idx}
                className="bg-white rounded-md border border-slate-200/90 p-5 shadow-2xs"
              >
                <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
                  {d.name}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {d.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Live Open Positions Section (Integrated Right Here) */}
      <section id="open-roles" className="max-w-6xl mx-auto px-4 py-16 sm:py-24 scroll-mt-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-medium text-brand-600 uppercase tracking-wider block mb-2">
              Opportunities
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight">
              Open positions
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Currently accepting direct applications. Reviewed by hiring managers daily.
            </p>
          </div>

          <div className="text-xs text-slate-500 font-tabular">
            Showing <strong className="text-slate-900">{filteredJobs.length}</strong> available position{filteredJobs.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white rounded-md border border-slate-200/90 p-4 shadow-2xs mb-8">
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
                {departmentList.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept === "all" ? "All departments" : dept}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Job Cards Grid */}
        {loading ? (
          <div className="text-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading open positions...</p>
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
            <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2.5" />
            <h3 className="text-sm font-semibold text-slate-900 mb-1">No openings match your query</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              {search || selectedDept !== "all"
                ? "Try adjusting your search terms or clearing department filters."
                : "There are currently no active openings published. Check back soon."}
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
      </section>

      {/* 5. Transparent Hiring Process */}
      <section className="bg-white border-t border-slate-200/90 py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="max-w-xl mb-12">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">
              Our Process
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight">
              Fast, transparent, respectful of your time.
            </h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              We know waiting weeks in the dark is frustrating. Here is our exact candidate journey:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS_STEPS.map((s, idx) => (
              <div key={idx} className="relative">
                <div className="text-2xl font-bold font-tabular text-slate-300 mb-2">
                  {s.step}
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
                  {s.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Application Tracker Quick Card */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <div className="bg-charcoal-900 text-white rounded-md p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border border-charcoal-800">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-white mb-1">
              Already submitted an application?
            </h3>
            <p className="text-xs text-slate-400 max-w-xl">
              Track the exact stage of your submission using your reference number and registered email address.
            </p>
          </div>
          <Link
            href="/track"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition shadow-2xs whitespace-nowrap"
          >
            <span>Track your application</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t border-slate-200 bg-white py-10 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-brand-500 text-white font-semibold text-[10px] flex items-center justify-center">
              RF
            </span>
            <span className="font-semibold text-slate-900 tracking-tight">Road Express Freight</span>
            <span className="text-slate-400">· Careers & Talent Portal</span>
          </div>
          <div className="text-center sm:text-right">
            <span>Corporate HQ: Bangalore, Karnataka · Pan-India Operations</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
