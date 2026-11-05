import Link from "next/link";
import { Briefcase, Building2, Calendar, MapPin } from "lucide-react";
import { JobSummary } from "@/lib/api";
import DeadlineCountdown from "./DeadlineCountdown";

interface JobCardProps {
  job: JobSummary;
}

export default function JobCard({ job }: JobCardProps) {
  const isDeadlinePassed =
    job.application_deadline && new Date(job.application_deadline).getTime() < Date.now();
  const isOpen = job.applications_still_open && !isDeadlinePassed;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Building2 className="w-3.5 h-3.5" />
            {job.department}
          </span>

          {isOpen ? (
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Actively Hiring
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              Closed
            </span>
          )}
        </div>

        <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-blue-600 transition mb-3">
          <Link href={`/jobs/${job.id}`}>{job.title}</Link>
        </h3>

        <div className="flex flex-wrap gap-y-2 gap-x-4 text-xs text-slate-600 mb-4">
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
        </div>

        {job.application_deadline && isOpen && (
          <div className="mb-4">
            <DeadlineCountdown deadline={job.application_deadline} compact />
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
        <Link
          href={`/jobs/${job.id}`}
          className="text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 transition underline underline-offset-4"
        >
          View Job Details
        </Link>

        {isOpen ? (
          <Link
            href={`/apply/${job.id}`}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold transition shadow-sm text-center"
          >
            Apply Now
          </Link>
        ) : (
          <button
            disabled
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-400 text-xs sm:text-sm font-semibold cursor-not-allowed text-center"
          >
            Closed
          </button>
        )}
      </div>
    </div>
  );
}
