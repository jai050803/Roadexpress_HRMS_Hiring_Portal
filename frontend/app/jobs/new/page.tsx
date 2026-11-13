"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Briefcase,
  Check,
  Copy,
  Eye,
  FileText,
  Loader2,
  Save,
  Send,
  Share2,
  Sparkles,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import { createJob, previewJobContent, publishJob } from "@/lib/api";
import { JobCreatePayload } from "@/lib/types";

const DEPARTMENTS = [
  "Engineering",
  "Supply Chain",
  "Accounts & Finance",
  "Human Resources",
  "Operations & Team Lead",
  "Data & Analytics",
];

export default function NewJobRolePage() {
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [location, setLocation] = useState("Bangalore, Karnataka");
  const [workMode, setWorkMode] = useState("hybrid");

  // Optional Criteria
  const [education, setEducation] = useState("");
  const [minExp, setMinExp] = useState<number | "">("");
  const [skillsRaw, setSkillsRaw] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [salaryBand, setSalaryBand] = useState("");

  // Optional Limits
  const [deadline, setDeadline] = useState("");
  const [maxApps, setMaxApps] = useState<number | "">("");

  // Submission State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Backend Preview State (ZERO logic in frontend, purely rendered from backend API)
  const [activePreviewTab, setActivePreviewTab] = useState<"jd" | "linkedin">("jd");
  const [backendJdText, setBackendJdText] = useState("");
  const [backendLinkedinCopy, setBackendLinkedinCopy] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copiedLi, setCopiedLi] = useState(false);
  const [copiedJd, setCopiedJd] = useState(false);

  // Debounced real-time preview query to backend generator endpoint
  useEffect(() => {
    if (!title.trim() && !responsibilities.trim() && !skillsRaw.trim()) {
      setBackendJdText("");
      setBackendLinkedinCopy("");
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        const skills = skillsRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        const res = await previewJobContent({
          title: title.trim() || "Job Title",
          department: department.trim(),
          employment_type: employmentType,
          location: location.trim() || undefined,
          work_mode: workMode,
          education_qualification: education.trim() || undefined,
          min_experience_years: minExp !== "" ? Number(minExp) : undefined,
          required_skills: skills.length > 0 ? skills : undefined,
          responsibilities_text: responsibilities.trim() || undefined,
          salary_band: salaryBand.trim() || undefined,
        });

        setBackendJdText(res.jd_text);
        setBackendLinkedinCopy(res.linkedin_post_copy);
      } catch (err) {
        // Keep previous preview on transient error
      } finally {
        setPreviewLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [
    title,
    department,
    employmentType,
    location,
    workMode,
    education,
    minExp,
    skillsRaw,
    responsibilities,
    salaryBand,
  ]);

  const handleCopyLinkedin = () => {
    if (!backendLinkedinCopy) return;
    navigator.clipboard.writeText(backendLinkedinCopy);
    setCopiedLi(true);
    setTimeout(() => setCopiedLi(false), 2000);
  };

  const handleCopyJd = () => {
    if (!backendJdText) return;
    navigator.clipboard.writeText(backendJdText);
    setCopiedJd(true);
    setTimeout(() => setCopiedJd(false), 2000);
  };

  const handleSubmit = async (publishImmediately: boolean) => {
    if (!title.trim() || !department.trim()) {
      setError("Please provide a job title and department.");
      return;
    }

    const skills = skillsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload: JobCreatePayload = {
      title: title.trim(),
      department: department.trim(),
      employment_type: employmentType,
      location: location.trim() || undefined,
      work_mode: workMode,
      education_qualification: education.trim() || undefined,
      min_experience_years: minExp !== "" ? Number(minExp) : undefined,
      required_skills: skills.length > 0 ? skills : undefined,
      responsibilities_text: responsibilities.trim() || undefined,
      salary_band: salaryBand.trim() || undefined,
      application_deadline: deadline ? new Date(deadline).toISOString() : undefined,
      max_applications: maxApps !== "" ? Number(maxApps) : undefined,
    };

    try {
      setLoading(true);
      setError(null);
      const created = await createJob(payload);

      if (publishImmediately) {
        await publishJob(created.id);
      }

      router.push(`/jobs/${created.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create job role");
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <Header
        title="Create job role"
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Job roles", href: "/jobs" },
          { label: "New role" },
        ]}
      />

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-4 p-3 rounded-md bg-stone-50 border border-stone-200 text-stone-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-brand-500" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Columns (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Section 1: Required Details */}
            <div className="bg-white rounded-md border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <h2 className="text-xs font-semibold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-slate-500" />
                <span>1. Core role details</span>
              </h2>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Job title <span className="text-brand-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Logistics Systems Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Department <span className="text-brand-500">*</span>
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Employment type
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium capitalize"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bangalore, Karnataka"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Work mode
                  </label>
                  <div className="flex items-center gap-4 mt-2">
                    {["remote", "onsite", "hybrid"].map((mode) => (
                      <label key={mode} className="inline-flex items-center gap-1.5 text-xs text-slate-700 capitalize cursor-pointer font-medium">
                        <input
                          type="radio"
                          name="workMode"
                          value={mode}
                          checked={workMode === mode}
                          onChange={(e) => setWorkMode(e.target.value)}
                          className="w-3.5 h-3.5 text-brand-500 focus:ring-0 border-slate-300"
                        />
                        <span>{mode}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Qualifications & Criteria (Optional) */}
            <div className="bg-white rounded-md border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>2. Candidate qualifications & criteria</span>
                </h2>
                <span className="text-[11px] text-slate-400">Optional fields</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Education qualification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech in CS / IT or equivalent"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Minimum experience (years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 3"
                    value={minExp}
                    onChange={(e) => setMinExp(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Required skills <span className="text-slate-400 font-normal">(Comma-separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Python, FastAPI, PostgreSQL, Docker, Redis"
                  value={skillsRaw}
                  onChange={(e) => setSkillsRaw(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Responsibilities
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe day-to-day responsibilities, expectations, and goals..."
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Salary band
                </label>
                <input
                  type="text"
                  placeholder="e.g. ₹18,00,000 - ₹24,00,000 PA"
                  value={salaryBand}
                  onChange={(e) => setSalaryBand(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>
            </div>

            {/* Section 3: Limits (Optional) */}
            <div className="bg-white rounded-md border border-slate-200/90 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-xs font-semibold text-slate-900">
                  3. Application limits & deadlines
                </h2>
                <span className="text-[11px] text-slate-400">Optional</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Application deadline
                  </label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-tabular"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Maximum applications cap
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    value={maxApps}
                    onChange={(e) => setMaxApps(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className="px-4 py-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5 text-slate-500" />}
                <span>Save as draft</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="px-5 py-2 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Publish role</span>
              </button>
            </div>
          </div>

          {/* Right Column: Live Backend-Generated Side-by-Side JD & LinkedIn Post (5 cols) */}
          <div className="lg:col-span-5 sticky top-6 space-y-4">
            <div className="bg-white rounded-md border border-slate-200/90 shadow-2xs overflow-hidden">
              {/* Preview Header & Segmented Tab Switcher */}
              <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-md">
                  <button
                    type="button"
                    onClick={() => setActivePreviewTab("jd")}
                    className={`px-3 py-1 rounded text-xs font-medium transition flex items-center gap-1.5 ${
                      activePreviewTab === "jd"
                        ? "bg-white text-slate-950 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Job description</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePreviewTab("linkedin")}
                    className={`px-3 py-1 rounded text-xs font-medium transition flex items-center gap-1.5 ${
                      activePreviewTab === "linkedin"
                        ? "bg-white text-slate-950 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5 text-brand-500" />
                    <span>LinkedIn post copy</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {previewLoading && (
                    <Loader2 className="w-3.5 h-3.5 text-brand-500 animate-spin" />
                  )}
                  {activePreviewTab === "jd" ? (
                    <button
                      type="button"
                      onClick={handleCopyJd}
                      disabled={!backendJdText}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition disabled:opacity-40"
                    >
                      {copiedJd ? (
                        <>
                          <Check className="w-3 h-3 text-signal-published" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 text-slate-500" />
                          <span>Copy JD</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCopyLinkedin}
                      disabled={!backendLinkedinCopy}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition shadow-2xs disabled:opacity-40"
                    >
                      {copiedLi ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy post</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Preview Content Area */}
              <div className="p-4 max-h-[68vh] overflow-y-auto">
                {activePreviewTab === "jd" ? (
                  backendJdText ? (
                    <div className="prose prose-xs max-w-none text-slate-800 font-sans leading-relaxed">
                      <pre className="font-sans whitespace-pre-wrap text-xs bg-slate-50/70 p-3.5 rounded-md border border-slate-200/80">
                        {backendJdText}
                      </pre>
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                      <FileText className="w-6 h-6 mx-auto text-slate-300 stroke-[1.5]" />
                      <p>Fill in the role title on the left to see the executive JD generated by the backend.</p>
                    </div>
                  )
                ) : backendLinkedinCopy ? (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-md bg-slate-50/80 border border-slate-200/80 font-sans text-xs text-slate-800 whitespace-pre-wrap leading-relaxed select-text">
                      {backendLinkedinCopy}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                      <span>Executive Talent Framework</span>
                      <span>Zero hashtags · Zero emojis · Ready to paste</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                    <Share2 className="w-6 h-6 mx-auto text-slate-300 stroke-[1.5]" />
                    <p>LinkedIn post copy will be generated automatically in real time.</p>
                  </div>
                )}
              </div>

              {/* Informational Footer */}
              <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Backend Framework Engine</span>
                <span className="font-tabular">Synced with Career Portal</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
