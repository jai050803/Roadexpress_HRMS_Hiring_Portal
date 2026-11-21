import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Briefcase,
  CheckCircle,
  FileText,
  FileUp,
  Loader2,
  Mail,
  Phone,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import AppShell from "../components/layout/AppShell";
import Header from "../components/layout/Header";
import { listAllJobs, uploadCvManually } from "../lib/api";
import { JobRole } from "../lib/types";

export default function UploadResume() {
  const [publishedJobs, setPublishedJobs] = useState<JobRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    reference_number: string;
    job_title: string;
    job_role_id: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadJobs() {
      try {
        setLoading(true);
        const all = await listAllJobs("published");
        setPublishedJobs(all);
        if (all.length > 0) {
          setSelectedRoleId(all[0].id);
        }
      } catch {
        setError("Failed to load active job roles.");
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  const validateAndSetFile = (file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("File must be a valid PDF document.");
      setResumeFile(null);
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File size exceeds 5MB limit.");
      setResumeFile(null);
      return false;
    }

    setError(null);
    setResumeFile(file);
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetFile(file);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoleId) {
      setError("Please select a target job opening.");
      return;
    }
    if (!name.trim() || !email.trim()) {
      setError("Candidate full name and email are required.");
      return;
    }
    if (!resumeFile) {
      setError("Please attach a PDF resume file under 5MB.");
      return;
    }

    const formData = new FormData();
    formData.append("job_role_id", selectedRoleId);
    formData.append("name", name.trim());
    formData.append("email", email.trim());
    if (phone.trim()) {
      formData.append("phone", phone.trim());
    }
    formData.append("resume", resumeFile);
    formData.append("idempotency_key", crypto.randomUUID());

    try {
      setSubmitting(true);
      setError(null);
      const res = await uploadCvManually(formData);
      setSuccessResult({
        reference_number: res.reference_number || "APP-" + Date.now().toString().slice(-6),
        job_title: res.job_title || publishedJobs.find((j) => j.id === selectedRoleId)?.title || "Target Role",
        job_role_id: selectedRoleId,
      });

      // Clear input fields
      setName("");
      setEmail("");
      setPhone("");
      setResumeFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      setError(err.message || "Failed to upload candidate CV.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <Header
        title="Direct Resume & CV Upload"
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Upload CV" },
        ]}
      />

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Success Banner */}
          {successResult && (
            <div className="p-5 rounded-md bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-signal-published mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Candidate Profile & Resume Uploaded Successfully
                  </h3>
                  <p className="text-xs text-slate-600">
                    The candidate has been added to the pipeline for{" "}
                    <strong>{successResult.job_title}</strong> with automated resume parsing initiated.
                  </p>
                  <div className="flex items-center gap-4 text-xs pt-1">
                    <span className="font-tabular text-slate-500">
                      Reference Code: <strong className="font-mono text-slate-900">{successResult.reference_number}</strong>
                    </span>
                    <Link
                      to={`/pipeline/${successResult.job_role_id}`}
                      className="text-brand-500 hover:text-brand-600 font-medium"
                    >
                      View in pipeline →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-md bg-stone-50 border border-stone-200 text-stone-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-brand-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Form Card */}
          <div className="bg-white rounded-md border border-slate-200/90 p-6 shadow-2xs space-y-6">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                Candidate Intake Form
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload emailed resumes or walk-in candidate profiles directly into the hiring workflow.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Target Job Role */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Target Job Opening <span className="text-brand-500">*</span>
                </label>
                {loading ? (
                  <div className="text-xs text-slate-400 flex items-center gap-2 py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading active positions...</span>
                  </div>
                ) : publishedJobs.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                    No published job openings available. Please publish a role first.
                  </div>
                ) : (
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 bg-white focus:outline-none focus:border-brand-500 font-medium"
                  >
                    {publishedJobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} — {j.department} ({j.work_mode || "Hybrid"})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Drag and Drop File Upload Zone */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Resume Document (PDF) <span className="text-brand-500">*</span>
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${
                    isDragging
                      ? "border-brand-500 bg-brand-50/40"
                      : resumeFile
                      ? "border-slate-300 bg-slate-50/60"
                      : "border-slate-300 hover:border-slate-400 bg-white"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {resumeFile ? (
                    <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-md max-w-md mx-auto">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-brand-500 shrink-0" />
                        <div className="text-left truncate">
                          <span className="block text-xs font-medium text-slate-900 truncate">
                            {resumeFile.name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-tabular">
                            {formatFileSize(resumeFile.size)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setResumeFile(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="p-1.5 text-slate-400 hover:text-stone-700 rounded transition cursor-pointer"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FileUp className="w-8 h-8 text-slate-400 mx-auto" />
                      <div>
                        <span className="text-xs font-medium text-slate-900">
                          Click to select a file or drag and drop
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          PDF documents only (Maximum 5MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Candidate Personal Details */}
              <div className="space-y-4 pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-800 block">
                  Candidate Contact Information
                </span>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Full Name <span className="text-brand-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Vikram Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Email Address <span className="text-brand-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        placeholder="e.g. vikram.sharma@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Phone Number (Optional)
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        placeholder="e.g. +91 98765 43210"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 font-tabular"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={submitting || !resumeFile || publishedJobs.length === 0}
                  className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded shadow-xs transition cursor-pointer"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{submitting ? "Uploading & Parsing Resume..." : "Submit Candidate"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
