"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  FileText,
  FileUp,
  Loader2,
  Mail,
  Phone,
  Send,
  Upload,
  User,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import { listAllJobs, uploadCvManually } from "@/lib/api";
import { JobRole } from "@/lib/types";

export default function UploadCvPage() {
  const router = useRouter();

  const [publishedJobs, setPublishedJobs] = useState<JobRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    reference_number: string;
    job_title: string;
  } | null>(null);

  useEffect(() => {
    async function loadJobs() {
      try {
        setLoading(true);
        const all = await listAllJobs("published");
        setPublishedJobs(all);
        if (all.length > 0) {
          setSelectedRoleId(all[0].id);
        }
      } catch (err: any) {
        setError("Failed to load active job roles.");
      } finally {
        setLoading(false);
      }
    }
    loadJobs();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Resume file must be under 5MB.");
      return;
    }

    setError(null);
    setResumeFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedRoleId) {
      setError("Please select a target job role.");
      return;
    }
    if (!name.trim() || !email.trim()) {
      setError("Candidate full name and email are required.");
      return;
    }
    if (!resumeFile) {
      setError("Please select a resume PDF file to upload.");
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
        reference_number: res.reference_number,
        job_title: res.job_title,
      });
      // Reset form
      setName("");
      setEmail("");
      setPhone("");
      setResumeFile(null);
    } catch (err: any) {
      setError(err.message || "Failed to upload candidate CV.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <Header
        title="Upload Emailed CV"
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Upload Emailed CV" },
        ]}
      />

      <main className="p-6 max-w-2xl">
        {/* Success Card */}
        {successResult && (
          <div className="mb-6 p-5 rounded-lg bg-emerald-50 border border-emerald-200 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-emerald-900 mb-1">
                  Candidate CV Uploaded Successfully!
                </h3>
                <p className="text-xs text-emerald-700 mb-3">
                  The candidate has been added to the pipeline for <strong>{successResult.job_title}</strong> with the <strong>email_upload</strong> source tag.
                </p>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span>Reference: <strong>{successResult.reference_number}</strong></span>
                  <Link
                    href={`/pipeline/${selectedRoleId}`}
                    className="text-blue-700 hover:underline font-semibold font-sans"
                  >
                    View in Pipeline &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Upload Form Box */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
          <div className="pb-4 mb-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">
              Manual CV Intake (Inbound Email Resumes)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter candidate information and upload their PDF CV. The system will create the candidate record and schedule automated parsing.
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
              <span className="text-xs">Loading published job roles...</span>
            </div>
          ) : publishedJobs.length === 0 ? (
            <div className="p-6 text-center text-slate-500 bg-slate-50 rounded border border-slate-200 text-xs">
              <p className="mb-2">There are currently no <strong>published</strong> job roles accepting applications.</p>
              <Link href="/jobs/new" className="text-blue-600 hover:underline font-semibold">
                Create and publish a job role first &rarr;
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Select Role */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Target Job Role <span className="text-rose-600">*</span>
                </label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  {publishedJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title} — {job.department} ({job.location || "Remote"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Candidate Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Candidate Full Name <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Candidate Email */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Candidate Email Address <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="rahul.sharma@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Candidate Phone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Resume File Upload */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Resume PDF <span className="text-rose-600">*</span> <span className="text-slate-400 font-normal">(Max 5MB)</span>
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-lg p-5 text-center transition bg-slate-50">
                  <input
                    type="file"
                    id="cv-upload-input"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label htmlFor="cv-upload-input" className="cursor-pointer block">
                    <FileUp className="w-7 h-7 text-slate-400 mx-auto mb-2" />
                    {resumeFile ? (
                      <div>
                        <span className="text-xs font-bold text-slate-800 block truncate">
                          {resumeFile.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {Math.round(resumeFile.size / 1024)} KB — Click to change
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xs font-semibold text-blue-600 block">
                          Click to browse for candidate resume PDF
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Strictly application/pdf format
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-2 disabled:bg-blue-400 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading & Processing CV...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Submit Candidate CV</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </AppShell>
  );
}
