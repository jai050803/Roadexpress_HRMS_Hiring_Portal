"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  CheckCircle,
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
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500 font-medium">Loading position details...</p>
      </main>
    );
  }

  if (error || !job) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="p-6 rounded-xl bg-red-50 border border-red-200 max-w-md mx-auto">
          <p className="text-sm font-semibold text-red-800 mb-3">
            {error || "Position not found."}
          </p>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to open roles
          </Link>
        </div>
      </main>
    );
  }

  const isActuallyOpen = job.applications_still_open && !isExpired;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
        <Link href="/jobs" className="hover:text-blue-600 transition flex items-center gap-1">
          <ArrowLeft className="w-3 h-3" /> All Roles
        </Link>
        <span>/</span>
        <span className="text-slate-400">{job.department}</span>
        <span>/</span>
        <span className="text-slate-800 font-semibold truncate max-w-xs">{job.title}</span>
      </nav>

      {/* Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
              <Building2 className="w-3.5 h-3.5" />
              {job.department}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {job.title}
            </h1>
          </div>

          <div className="flex flex-col items-end gap-2">
            {isActuallyOpen ? (
              <Link
                href={`/apply/${job.id}`}
                className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-sm"
              >
                Apply for this Role
              </Link>
            ) : (
              <button
                disabled
                className="px-6 py-2.5 rounded-lg bg-slate-100 text-slate-400 font-semibold text-sm cursor-not-allowed"
              >
                Applications Closed
              </button>
            )}
          </div>
        </div>

        {/* Quick Meta Chips */}
        <div className="flex flex-wrap gap-y-2 gap-x-4 text-xs text-slate-600 pt-4 border-t border-slate-100">
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
            <span className="capitalize px-2 py-0.5 bg-slate-100 rounded text-slate-600">
              {job.employment_type.replace("_", " ")}
            </span>
          )}

          {job.salary_band && (
            <div className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-slate-400" />
              <span>{job.salary_band}</span>
            </div>
          )}
        </div>

        {/* Countdown Timer */}
        {job.application_deadline && isActuallyOpen && (
          <div className="mt-6">
            <DeadlineCountdown
              deadline={job.application_deadline}
              onExpire={() => setIsExpired(true)}
            />
          </div>
        )}

        {!isActuallyOpen && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
            Applications for this role are currently closed and no longer accepting submissions.
          </div>
        )}
      </div>

      {/* Main Content & Rendered JD */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-8">
        {/* Responsibilities */}
        {job.responsibilities_text && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">
              Role Responsibilities
            </h2>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {job.responsibilities_text}
            </div>
          </div>
        )}

        {/* Required Skills */}
        {job.required_skills && job.required_skills.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">
              Required Skills & Competencies
            </h2>
            <div className="flex flex-wrap gap-2">
              {job.required_skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
                >
                  <CheckCircle className="w-3 h-3 text-blue-600" />
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Qualifications & Experience */}
        {(job.education_qualification || job.min_experience_years !== null) && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">
              Qualifications & Experience
            </h2>
            <ul className="space-y-2 text-sm text-slate-700">
              {job.min_experience_years !== null && job.min_experience_years !== undefined && (
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span>
                    Minimum <strong>{job.min_experience_years} year(s)</strong> of professional experience
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

        {/* Full JD Text Fallback / Additional info */}
        {job.jd_text && !job.responsibilities_text && (
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-3 border-b border-slate-100 pb-2">
              Job Description
            </h2>
            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {job.jd_text}
            </div>
          </div>
        )}

        {/* Bottom Apply CTA */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            Road Express is an equal opportunity employer. All applicants will be evaluated based on qualifications and merit.
          </div>

          {isActuallyOpen ? (
            <Link
              href={`/apply/${job.id}`}
              className="w-full sm:w-auto px-8 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition shadow-sm text-center"
            >
              Apply Now
            </Link>
          ) : (
            <button
              disabled
              className="w-full sm:w-auto px-8 py-3 rounded-lg bg-slate-100 text-slate-400 font-semibold text-sm cursor-not-allowed"
            >
              Applications Closed
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
