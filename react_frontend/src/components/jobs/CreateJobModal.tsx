import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  Briefcase,
  Check,
  Copy,
  Eye,
  FileText,
  Loader2,
  Plus,
  Save,
  Send,
  Share2,
  X,
} from "lucide-react";
import { createJob, previewJobContent, publishJob } from "../../lib/api";
import { JobCreatePayload, JobRole } from "../../lib/types";

export interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (job: JobRole) => void;
}

const DEPARTMENTS = [
  "Engineering",
  "Supply Chain",
  "Accounts & Finance",
  "Human Resources",
  "Operations & Team Lead",
  "Data & Analytics",
];

export default function CreateJobModal({
  isOpen,
  onClose,
  onCreated,
}: CreateJobModalProps) {
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("Engineering");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [location, setLocation] = useState("Bangalore, Karnataka");
  const [workMode, setWorkMode] = useState("hybrid");

  const [education, setEducation] = useState("");
  const [minExp, setMinExp] = useState<number | "">("");
  const [skillsRaw, setSkillsRaw] = useState("");
  const [responsibilities, setResponsibilities] = useState("");
  const [salaryBand, setSalaryBand] = useState("");

  const [deadline, setDeadline] = useState("");
  const [maxApps, setMaxApps] = useState<number | "">("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [previewSubTab, setPreviewSubTab] = useState<"jd" | "linkedin">("jd");
  const [backendJdText, setBackendJdText] = useState("");
  const [backendLinkedinCopy, setBackendLinkedinCopy] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copiedLi, setCopiedLi] = useState(false);
  const [copiedJd, setCopiedJd] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDepartment("Engineering");
      setEmploymentType("full_time");
      setLocation("Bangalore, Karnataka");
      setWorkMode("hybrid");
      setEducation("");
      setMinExp("");
      setSkillsRaw("");
      setResponsibilities("");
      setSalaryBand("");
      setDeadline("");
      setMaxApps("");
      setError(null);
      setActiveTab("form");
      setBackendJdText("");
      setBackendLinkedinCopy("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activeTab !== "preview") return;

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
      } catch {
        // preserve previous preview
      } finally {
        setPreviewLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [
    isOpen,
    activeTab,
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

  if (!isOpen) return null;

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
    if (!title.trim()) {
      setError("Job title is required.");
      setActiveTab("form");
      return;
    }
    if (!department.trim()) {
      setError("Department is required.");
      setActiveTab("form");
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
      let created = await createJob(payload);

      if (publishImmediately) {
        created = await publishJob(created.id);
      }

      onCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create job opening.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-lg border border-slate-200 w-full max-w-3xl overflow-hidden shadow-xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-brand-500" />
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
              Create New Job Opening
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex items-center bg-slate-200/70 p-0.5 rounded-md text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("form")}
                className={`px-3 py-1 rounded transition cursor-pointer ${
                  activeTab === "form"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Form Editor
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1 rounded transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "preview"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Live Preview</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-md bg-stone-50 border border-stone-200 text-stone-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-brand-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 space-y-5 flex-1">
          {activeTab === "form" ? (
            <div className="space-y-4">
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
                  <select
                    value={workMode}
                    onChange={(e) => setWorkMode(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 capitalize"
                  >
                    <option value="hybrid">Hybrid</option>
                    <option value="onsite">On-site</option>
                    <option value="remote">Remote</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Min experience (years)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 3"
                    value={minExp}
                    onChange={(e) => setMinExp(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-tabular"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Salary band
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 18-24 LPA"
                    value={salaryBand}
                    onChange={(e) => setSalaryBand(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Education qualification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. B.Tech / BE or equivalent"
                    value={education}
                    onChange={(e) => setEducation(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Required skills <span className="text-slate-400 font-normal">(Comma separated)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Node.js, Express, PostgreSQL, Redis, Docker, System Design"
                  value={skillsRaw}
                  onChange={(e) => setSkillsRaw(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Core responsibilities & requirements
                </label>
                <textarea
                  rows={4}
                  placeholder="Outline key operational objectives, daily duties, and technical expectations..."
                  value={responsibilities}
                  onChange={(e) => setResponsibilities(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Application deadline
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-tabular"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Application cap (optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    value={maxApps}
                    onChange={(e) => setMaxApps(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-tabular"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreviewSubTab("jd")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition cursor-pointer ${
                      previewSubTab === "jd"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Formatted Job Description</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPreviewSubTab("linkedin")}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition cursor-pointer ${
                      previewSubTab === "linkedin"
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Executive LinkedIn Copy</span>
                  </button>
                </div>

                {previewLoading && (
                  <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Generating...
                  </span>
                )}
              </div>

              {previewSubTab === "jd" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Generated from role metadata</span>
                    <button
                      type="button"
                      onClick={handleCopyJd}
                      disabled={!backendJdText}
                      className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-950 font-medium cursor-pointer"
                    >
                      {copiedJd ? <Check className="w-3.5 h-3.5 text-signal-published" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedJd ? "Copied" : "Copy JD"}</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                    {backendJdText || "Enter a job title and details to preview the generated description."}
                  </pre>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Ready for social sharing</span>
                    <button
                      type="button"
                      onClick={handleCopyLinkedin}
                      disabled={!backendLinkedinCopy}
                      className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-950 font-medium cursor-pointer"
                    >
                      {copiedLi ? <Check className="w-3.5 h-3.5 text-signal-published" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLi ? "Copied" : "Copy LinkedIn Text"}</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                    {backendLinkedinCopy || "Enter a job title and details to preview the executive LinkedIn copy."}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/70">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save as Draft</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded bg-brand-500 hover:bg-brand-600 text-white transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>Publish Immediately</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
