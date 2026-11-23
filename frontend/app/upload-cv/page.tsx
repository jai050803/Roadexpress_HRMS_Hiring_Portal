"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle,
  FileUp,
  Loader2,
  Mail,
  Phone,
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

    if (file.type !== "application/pdf" || file.size > 5 * 1024 * 1024) {
      setError("File must be a PDF under 5MB");
      setResumeFile(null);
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
      setError("File must be a PDF under 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("job_id", selectedRoleId);
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
        title="Upload emailed CV"
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Upload CV" },
        ]}
      />

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Success Card */}
          {successResult && (
            <div className="p-4 rounded-md bg-slate-50 border border-slate-200 shadow-2xs">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-signal-published mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">
                    Candidate CV uploaded
                  </h3>
                  <p className="text-xs text-slate-600 mb-2">
                    The candidate has been added to the pipeline for <strong>{successResult.job_title}</strong> with source tag <strong>email_upload</strong>.
                  </p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="font-tabular text-slate-500">Reference: <strong className="text-slate-900">{successResult.reference_number}</strong></span>
                    <Link
                      href={`/pipeline/${selectedRoleId}`}
                      className="text-brand-500 hover:text-brand-600 font-medium"
                    >
                      View in pipeline
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="p-3 rounded-md bg-stone-50 border border-stone-200 text-stone-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-brand-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Form Box */}
          <div className="bg-white rounded-md border border-slate-200/90 p-6 shadow-2xs">
            <div className="pb-4 mb-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-900">
                Manual CV intake
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter candidate details and upload their PDF CV. Automated parsing and screening will run in the background.
              </p>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-slate-400" />
                <span className="text-xs">Loading active job roles...</span>
              </div>
            ) : publishedJobs.length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-md border border-slate-200 text-xs">
                <p className="mb-2">There are currently no published roles accepting submissions.</p>
                <Link href="/jobs/new" className="text-brand-500 hover:text-brand-600 font-medium">
                  Create and publish a role first
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Select Role */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Target job role <span className="text-brand-500">*</span>
                  </label>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium"
                  >
                    {publishedJobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.title} - {job.department} ({job.location || "Corporate HQ"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Candidate Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Candidate full name <span className="text-brand-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Candidate Email */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Candidate email address <span className="text-brand-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="candidate@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Candidate Phone */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Phone number <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      placeholder="+91 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Resume File Upload */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Resume document <span className="text-brand-500">*</span> <span className="text-slate-400 font-normal">(PDF, max 5MB)</span>
                  </label>
                  <div className="border border-dashed border-slate-300 hover:border-slate-400 rounded-md p-5 text-center transition bg-slate-50/50">
                    <input
                      type="file"
                      id="cv-upload-input"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <label htmlFor="cv-upload-input" className="cursor-pointer block">
                      <FileUp className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                      {resumeFile ? (
                        <div>
                          <span className="text-xs font-medium text-slate-800 block truncate">
                            {resumeFile.name}
                          </span>
                          <span className="text-xs text-slate-400 font-tabular">
                            {Math.round(resumeFile.size / 1024)} KB - click to replace
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-xs font-medium text-slate-800 block">
                            Click to select resume PDF
                          </span>
                          <span className="text-xs text-slate-400">
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
                    className="w-full py-2.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading & queuing evaluation...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Submit candidate CV</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
