"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Save,
  Send,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import { createJob, publishJob } from "@/lib/api";
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

  // Live JD Generation for preview
  const generatePreviewJd = () => {
    const lines: string[] = [];
    lines.push(`# ${title || "Job Title"} — ${department}`);
    lines.push(`**Location:** ${location || "Remote"} (${workMode}) | **Type:** ${employmentType.replace(/_/g, " ")}`);
    lines.push("");

    if (education.trim()) {
      lines.push("### Education Qualification");
      lines.push(education.trim());
      lines.push("");
    }

    if (minExp !== "" && Number(minExp) >= 0) {
      lines.push("### Minimum Experience");
      lines.push(`${minExp} years of relevant industry experience.`);
      lines.push("");
    }

    const skills = skillsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (skills.length > 0) {
      lines.push("### Required Skills & Competencies");
      lines.push(skills.map((s) => `- ${s}`).join("\n"));
      lines.push("");
    }

    if (responsibilities.trim()) {
      lines.push("### Key Responsibilities");
      lines.push(responsibilities.trim());
      lines.push("");
    }

    if (salaryBand.trim()) {
      lines.push("### Compensation");
      lines.push(salaryBand.trim());
      lines.push("");
    }

    return lines.join("\n");
  };

  const handleSubmit = async (publishImmediately: boolean) => {
    if (!title.trim() || !department.trim()) {
      setError("Please provide a Job Title and Department.");
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
        title="Create New Job Role"
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Job Roles", href: "/jobs" },
          { label: "New Role" },
        ]}
      />

      <main className="p-6 max-w-6xl">
        {error && (
          <div className="mb-4 p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Form Columns (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Section 1: Required Details */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span>1. Core Role Details</span>
              </h2>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Job Title <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Logistics Systems Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Department <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Employment Type
                  </label>
                  <select
                    value={employmentType}
                    onChange={(e) => setEmploymentType(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium capitalize"
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
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bangalore, Karnataka"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Work Mode
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
                          className="w-3.5 h-3.5 text-blue-600 focus:ring-0 border-slate-300"
                        />
                        <span>{mode}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Qualifications & Criteria (Optional) */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>2. Description & Candidate Criteria</span>
                </h2>
                <span className="text-[10px] text-slate-400 italic">All fields optional</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Education Qualification <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech in CS / IT or equivalent"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Minimum Experience (Years) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 3"
                    value={minExp}
                    onChange={(e) => setMinExp(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Required Skills <span className="text-slate-400 font-normal">(Comma-separated, optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Python, FastAPI, PostgreSQL, Docker, Redis"
                  value={skillsRaw}
                  onChange={(e) => setSkillsRaw(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Responsibilities <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Describe day-to-day responsibilities, expectations, and goals..."
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Salary Band <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ₹18,00,000 - ₹24,00,000 PA"
                  value={salaryBand}
                  onChange={(e) => setSalaryBand(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Section 3: Limits (Optional) */}
            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  3. Application Limits & Deadlines
                </h2>
                <span className="text-[10px] text-slate-400 italic">Optional</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Application Deadline <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Max Applications Cap <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    value={maxApps}
                    onChange={(e) => setMaxApps(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-500"
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
                className="px-4 py-2 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition shadow-sm flex items-center gap-1.5 disabled:bg-slate-100"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save as Draft</span>
              </button>

              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="px-5 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5 disabled:bg-emerald-400"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Publish Immediately</span>
              </button>
            </div>
          </div>

          {/* Right Column: Live JD Preview (5 cols) */}
          <div className="lg:col-span-5 sticky top-6">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-slate-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Live JD Preview
                  </h3>
                </div>
                <span className="text-[10px] text-slate-400">Updates dynamically</span>
              </div>

              <div className="p-4 max-h-[70vh] overflow-y-auto">
                <pre className="font-sans text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {generatePreviewJd()}
                </pre>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500">
                Notice: Sections with empty fields are omitted automatically from the generated JD.
              </div>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
