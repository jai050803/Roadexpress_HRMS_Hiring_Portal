"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
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

    if (!validateForm()) return;
    if (!job || !id) return;

    setIsSubmitting(true);
    setServerError(null);

    const formData = new FormData();
    formData.append("job_role_id", id);
    formData.append("name", name.trim());
    formData.append("email", email.trim());
    if (phone.trim()) {
      formData.append("phone", phone.trim());
    }
    if (resumeFile) {
      formData.append("resume", resumeFile);
    }
    formData.append("idempotency_key", idempotencyKey);

    try {
      const response = await submitApplication(formData);
      router.push(
        `/apply/success?ref=${encodeURIComponent(response.reference_number)}&title=${encodeURIComponent(
          job.title
        )}&email=${encodeURIComponent(email.trim())}`
      );
    } catch (err: any) {
      setIsSubmitting(false);

      if (err.status === 409 || err.code === "duplicate_application") {
        setServerError({
          code: "duplicate_application",
          message:
            "You have already submitted an application for this role. Only one submission per candidate email is allowed.",
        });
      } else if (err.status === 410 || err.code === "role_closed") {
        setServerError({
          code: "role_closed",
          message: "Applications for this role have closed.",
        });
      } else if (err.status === 429 || err.code === "capacity_reached") {
        setServerError({
          code: "capacity_reached",
          message: "This role has reached its maximum application capacity.",
        });
      } else {
        setServerError({
          code: "general_error",
          message: err.message || "Failed to submit application. Please try again.",
        });
      }
    }
  };

  if (loadingJob) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500">Loading position details...</p>
      </main>
    );
  }

  if (!job) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="p-6 rounded-md bg-stone-50 border border-stone-200 text-stone-800 text-xs">
          <p className="font-medium mb-3">Position not found.</p>
          <Link href="/jobs" className="underline font-medium">
            Return to open roles
          </Link>
        </div>
      </main>
    );
  }

  const isActuallyClosed = !job.applications_still_open || isExpired;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12 space-y-4">
      <Link
        href={`/jobs/${job.id}`}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to job details
      </Link>

      <div className="bg-white rounded-md border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Form Header */}
        <div className="p-6 bg-charcoal-900 text-white">
          <span className="text-xs font-medium text-slate-400 block mb-1">
            Application submission
          </span>
          <h1 className="text-xl font-semibold tracking-tight mb-2">
            {job.title}
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span>{job.department}</span>
            {job.location && (
              <>
                <span className="text-slate-600">/</span>
                <span>{job.location}</span>
              </>
            )}
          </div>
        </div>

        {/* Deadline Alert Banner */}
        {job.application_deadline && !isActuallyClosed && (
          <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3">
            <DeadlineCountdown
              deadline={job.application_deadline}
              onExpire={() => setIsExpired(true)}
              compact
            />
          </div>
        )}

        {/* Inline Server Error Banner */}
        {serverError && (
          <div className="mx-6 mt-6 p-3.5 rounded-md bg-stone-50 border border-stone-200 flex items-start gap-2.5 text-stone-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-brand-500 mt-0.5" />
            <div>
              <p className="font-medium">{serverError.message}</p>
              {serverError.code === "duplicate_application" && (
                <Link
                  href="/track"
                  className="mt-1.5 inline-block text-xs font-medium text-brand-600 underline"
                >
                  Track your existing application
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Closed Banner */}
        {isActuallyClosed && (
          <div className="m-6 p-4 rounded-md bg-stone-50 border border-stone-200 text-stone-800 text-xs">
            <div className="flex items-center gap-2 font-medium mb-1">
              <Clock className="w-4 h-4 text-slate-500" />
              Applications are closed for this position
            </div>
            <p className="text-slate-600">
              The submission deadline has passed or application capacity has been reached. Please explore other active roles.
            </p>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Full name <span className="text-brand-500">*</span>
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
              className={`w-full px-3 py-2 text-xs rounded-md border text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${
                validationErrors.name
                  ? "border-stone-300 bg-stone-50/50"
                  : "border-slate-300"
              } disabled:bg-slate-100 disabled:text-slate-400`}
            />
            {validationErrors.name && (
              <p className="mt-1 text-xs text-stone-700">{validationErrors.name}</p>
            )}
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Email address <span className="text-brand-500">*</span>
            </label>
            <input
              type="email"
              disabled={isActuallyClosed || isSubmitting}
              placeholder="candidate@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (validationErrors.email) {
                  setValidationErrors((prev) => ({ ...prev, email: "" }));
                }
              }}
              className={`w-full px-3 py-2 text-xs rounded-md border text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 ${
                validationErrors.email
                  ? "border-stone-300 bg-stone-50/50"
                  : "border-slate-300"
              } disabled:bg-slate-100 disabled:text-slate-400`}
            />
            <p className="mt-1 text-[11px] text-slate-500">
              Application updates will be delivered to this email address.
            </p>
            {validationErrors.email && (
              <p className="mt-1 text-xs text-stone-700">{validationErrors.email}</p>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Phone number <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="tel"
              disabled={isActuallyClosed || isSubmitting}
              placeholder="+91 9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>

          {/* Resume Upload */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Resume document <span className="text-brand-500">*</span> <span className="text-slate-400 font-normal">(PDF format)</span>
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
          <div className="pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={isActuallyClosed || isSubmitting}
              className={`w-full py-2.5 rounded-md font-medium text-xs transition shadow-2xs flex items-center justify-center gap-2 ${
                isActuallyClosed
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : isSubmitting
                  ? "bg-brand-400 text-white cursor-wait"
                  : "bg-brand-500 hover:bg-brand-600 text-white cursor-pointer"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting application...</span>
                </>
              ) : isActuallyClosed ? (
                <span>Applications closed</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit application</span>
                </>
              )}
            </button>

            <p className="mt-2.5 text-[11px] text-center text-slate-500">
              Submitted applications are evaluated according to Road Express hiring criteria.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
