"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  GraduationCap,
  Loader2,
  MapPin,
  Wallet,
} from "lucide-react";
import DeadlineCountdown from "@/components/DeadlineCountdown";
import { getJobDetail, JobDetail } from "@/lib/api";

export default function JobDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function loadJob() {
      try {
        setLoading(true);
        setError(null);
        const data = await getJobDetail(id);
        setJob(data);

        if (
          data.application_deadline &&
          new Date(data.application_deadline).getTime() <= Date.now()
        ) {
          setIsExpired(true);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load job role details.");
      } finally {
        setLoading(false);
      }
    }
    loadJob();
  }, [id]);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Loader2 className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500">Loading role details...</p>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="p-6 rounded-md bg-stone-50 border border-stone-200 max-w-md mx-auto">
          <p className="text-xs font-medium text-stone-800 mb-3">
            {error || "Position not found."}
          </p>
          <Link
            href="/jobs"
            className="text-xs font-medium text-slate-700 hover:text-slate-950 underline"
          >
            Back to open roles
          </Link>
        </div>
      </main>
    );
  }

  const isActuallyOpen = job.applications_still_open && !isExpired;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/jobs" className="hover:text-slate-900 transition flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> All roles
        </Link>
        <span className="text-slate-300">/</span>
        <span>{job.department}</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-medium truncate max-w-xs">{job.title}</span>
      </nav>

      {/* Header Card */}
      <div className="bg-white rounded-md border border-slate-200/90 p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80 mb-2.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              {job.department}
            </span>
            <h1 className="text-2xl font-semibold text-slate-950 tracking-tight">
              {job.title}
            </h1>
          </div>

          <div className="flex flex-col items-end gap-2">
            {isActuallyOpen ? (
              <Link
                href={`/apply/${job.id}`}
                className="px-5 py-2.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs"
              >
                Apply for this role
              </Link>
            ) : (
              <button
                disabled
                className="px-5 py-2.5 rounded-md bg-slate-100 text-slate-400 font-medium text-xs cursor-not-allowed"
              >
                Applications closed
              </button>
            )}
          </div>
        </div>

        {/* Quick Meta Chips */}
        <div className="flex flex-wrap gap-y-2 gap-x-4 text-xs text-slate-500 pt-4 border-t border-slate-100">
          {job.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{job.location}</span>
            </div>
          )}

          {job.work_mode && (
            <div className="flex items-center gap-1.5 capitalize">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span>{job.work_mode}</span>
            </div>
          )}

          {job.employment_type && (
            <span className="capitalize">
              {job.employment_type.replace("_", " ")}
            </span>
          )}

          {job.salary_band && (
            <div className="flex items-center gap-1.5 font-tabular">
              <Wallet className="w-3.5 h-3.5 text-slate-400" />
              <span>{job.salary_band}</span>
            </div>
          )}
        </div>

        {/* Countdown Timer */}
        {job.application_deadline && isActuallyOpen && (
          <div className="mt-5">
            <DeadlineCountdown
              deadline={job.application_deadline}
              onExpire={() => setIsExpired(true)}
            />
          </div>
        )}

        {!isActuallyOpen && (
          <div className="mt-4 p-3 rounded-md bg-stone-50 border border-stone-200 text-xs text-stone-800">
            Applications for this role are currently closed.
          </div>
        )}
      </div>

      {/* Main Content & Rendered JD */}
      <div className="bg-white rounded-md border border-slate-200/90 p-6 sm:p-8 shadow-2xs space-y-6">
        {/* Responsibilities */}
        {job.responsibilities_text && (
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">
              Role responsibilities
            </h2>
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans">
              {job.responsibilities_text}
            </div>
          </div>
        )}

        {/* Required Skills */}
        {job.required_skills && job.required_skills.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">
              Required skills & competencies
            </h2>
            <div className="flex flex-wrap gap-2">
              {job.required_skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1.5 border border-slate-200/80"
                >
                  <Check className="w-3 h-3 text-slate-500" />
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Qualifications & Experience */}
        {(job.education_qualification || job.min_experience_years !== null) && (
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">
              Qualifications & experience
            </h2>
            <ul className="space-y-2 text-xs text-slate-700">
              {job.min_experience_years !== null && job.min_experience_years !== undefined && (
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>
                    Minimum <strong>{job.min_experience_years} year(s)</strong> of relevant experience
                  </span>
                </li>
              )}
              {job.education_qualification && (
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>
                    Education: <strong>{job.education_qualification}</strong>
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Full Detailed Job Description */}
        {job.jd_text ? (
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">
              Detailed job specification
            </h2>
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50/60 p-5 rounded-md border border-slate-200/80">
              {job.jd_text}
            </div>
          </div>
        ) : job.responsibilities_text ? (
          <div>
            <h2 className="text-sm font-semibold text-slate-900 mb-3 border-b border-slate-100 pb-2">
              Role responsibilities
            </h2>
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-sans">
              {job.responsibilities_text}
            </div>
          </div>
        ) : null}

        {/* Bottom Apply CTA */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Road Express Freight is an equal opportunity employer.
          </div>

          {isActuallyOpen ? (
            <Link
              href={`/apply/${job.id}`}
              className="w-full sm:w-auto px-6 py-2.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white font-medium text-xs transition shadow-2xs text-center"
            >
              Apply now
            </Link>
          ) : (
            <button
              disabled
              className="w-full sm:w-auto px-6 py-2.5 rounded-md bg-slate-100 text-slate-400 font-medium text-xs cursor-not-allowed"
            >
              Applications closed
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
