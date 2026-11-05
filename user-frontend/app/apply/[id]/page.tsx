"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle,
  Clock,
  Loader2,
  Send,
} from "lucide-react";
import DeadlineCountdown from "@/components/DeadlineCountdown";
import FileUpload from "@/components/FileUpload";
import { getJobDetail, JobDetail, submitApplication } from "@/lib/api";

export default function ApplyPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  // Job data
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [isExpired, setIsExpired] = useState(false);

  // Form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  // Client-generated UUID idempotency key stored in state (never localStorage)
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Generate UUID idempotency key on form load
    if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
      setIdempotencyKey(window.crypto.randomUUID());
    } else {
      setIdempotencyKey(`idemp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
    }
  }, []);

  useEffect(() => {
    if (!id) return;

    async function loadJob() {
      try {
        setLoadingJob(true);
        const data = await getJobDetail(id);
        setJob(data);

        if (
          data.application_deadline &&
          new Date(data.application_deadline).getTime() <= Date.now()
        ) {
          setIsExpired(true);
        }
      } catch (err: any) {
        setServerError({
          code: "not_found",
          message: err.message || "Failed to load job role.",
        });
      } finally {
        setLoadingJob(false);
      }
    }
    loadJob();
  }, [id]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = "Full name is required.";
    }

    if (!email.trim()) {
      errors.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Please enter a valid email address.";
    }

    if (!resumeFile) {
      errors.resume = "Please upload your resume in PDF format (max 5MB).";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (isExpired || !job?.applications_still_open) {
      setServerError({
        code: "applications_closed",
        message: "Applications for this role are no longer being accepted.",
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append("idempotency_key", idempotencyKey);
      formData.append("job_role_id", id);
      formData.append("name", name.trim());
      formData.append("email", email.trim().toLowerCase());
      if (phone.trim()) {
        formData.append("phone", phone.trim());
      }
      if (resumeFile) {
        formData.append("resume", resumeFile);
      }

      const response = await submitApplication(formData);

      // Redirect to success page with reference number and job title
      const queryParams = new URLSearchParams({
        ref: response.reference_number,
        title: response.job_title,
        email: email.trim(),
      });
      router.push(`/apply/success?${queryParams.toString()}`);
    } catch (err: any) {
      // Inline server error handling without window.alert
      if (err.error === "duplicate_application") {
        setServerError({
          code: "duplicate_application",
          message: "You have already submitted an application for this role. You can track its status on the tracking page.",
        });
      } else if (err.error === "applications_closed") {
        setServerError({
          code: "applications_closed",
          message: "Applications for this role have just closed and are no longer being accepted.",
        });
        setIsExpired(true);
      } else {
        setServerError({
          code: err.error || "submission_failed",
          message: err.message || "Failed to submit application. Please check your network and try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingJob) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500 font-medium">Preparing application form...</p>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="p-6 rounded-xl bg-red-50 border border-red-200">
          <p className="text-sm font-semibold text-red-800 mb-2">
            Position not available.
          </p>
          <Link href="/jobs" className="text-xs font-semibold text-blue-600 hover:underline">
            Back to open roles
          </Link>
        </div>
      </main>
    );
  }

  const isActuallyClosed = !job.applications_still_open || isExpired;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      {/* Back button */}
      <Link
        href={`/jobs/${job.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to job details
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Form Header */}
        <div className="p-6 bg-slate-900 text-white">
          <span className="text-xs uppercase font-bold tracking-wider text-blue-400 block mb-1">
            Application Form
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
            {job.title}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Building2 className="w-3.5 h-3.5" />
            <span>{job.department}</span>
            {job.location && (
              <>
                <span>•</span>
                <span>{job.location}</span>
              </>
            )}
          </div>
        </div>

        {/* Deadline Alert Banner */}
        {job.application_deadline && !isActuallyClosed && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
            <DeadlineCountdown
              deadline={job.application_deadline}
              onExpire={() => setIsExpired(true)}
              compact
            />
          </div>
        )}

        {/* Inline Server Error Banner */}
        {serverError && (
          <div className="mx-6 mt-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 text-red-800">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold">{serverError.message}</p>
              {serverError.code === "duplicate_application" && (
                <Link
                  href="/track"
                  className="mt-2 inline-block text-xs font-bold text-red-900 underline underline-offset-2"
                >
                  Track your existing application &rarr;
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Closed Banner */}
        {isActuallyClosed && (
          <div className="m-6 p-4 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-sm">
            <div className="flex items-center gap-2 font-semibold mb-1 text-slate-900">
              <Clock className="w-4 h-4 text-slate-500" />
              Applications are closed for this position
            </div>
            <p className="text-xs text-slate-600">
              The deadline for submitting applications has passed or the quota has been reached. Please explore other active roles.
            </p>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              disabled={isActuallyClosed || isSubmitting}
              placeholder="e.g. Priya Sharma"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (validationErrors.name) {
                  setValidationErrors((prev) => ({ ...prev, name: "" }));
                }
              }}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                validationErrors.name
                  ? "border-red-300 bg-red-50/20 focus:ring-red-400"
                  : "border-slate-300 focus:ring-blue-500 focus:border-transparent"
              } disabled:bg-slate-100 disabled:text-slate-400`}
            />
            {validationErrors.name && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.name}</p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              disabled={isActuallyClosed || isSubmitting}
              placeholder="e.g. priya.sharma@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (validationErrors.email) {
                  setValidationErrors((prev) => ({ ...prev, email: "" }));
                }
              }}
              className={`w-full px-3.5 py-2.5 text-sm rounded-lg border text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                validationErrors.email
                  ? "border-red-300 bg-red-50/20 focus:ring-red-400"
                  : "border-slate-300 focus:ring-blue-500 focus:border-transparent"
              } disabled:bg-slate-100 disabled:text-slate-400`}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Confirmation and interview updates will be sent to this email address.
            </p>
            {validationErrors.email && (
              <p className="mt-1 text-xs text-red-600">{validationErrors.email}</p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="tel"
              disabled={isActuallyClosed || isSubmitting}
              placeholder="e.g. +91-9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>

          {/* Resume Upload */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Resume / CV (PDF Document) <span className="text-red-500">*</span>
            </label>
            <FileUpload
              onFileSelect={(file) => {
                setResumeFile(file);
                if (validationErrors.resume) {
                  setValidationErrors((prev) => ({ ...prev, resume: "" }));
                }
              }}
              error={validationErrors.resume}
              maxSizeMb={5}
            />
          </div>

          {/* Submit CTA */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isActuallyClosed || isSubmitting}
              className={`w-full py-3.5 rounded-lg font-semibold text-sm transition shadow-sm flex items-center justify-center gap-2 ${
                isActuallyClosed
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : isSubmitting
                  ? "bg-blue-400 text-white cursor-wait"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Application...</span>
                </>
              ) : isActuallyClosed ? (
                <span>Applications Closed</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Application</span>
                </>
              )}
            </button>

            <p className="mt-3 text-[11px] text-center text-slate-500">
              By submitting, you confirm that all information provided is accurate and truthful.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
