import Link from "next/link";
import { Briefcase, Building2, MapPin } from "lucide-react";
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
    <div className="bg-white rounded-md border border-slate-200/90 p-5 shadow-2xs hover:border-slate-300 transition flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/80">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            {job.department}
          </span>

          {isOpen ? (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-slate-50 text-slate-700 border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-signal-published"></span>
              Accepting applications
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
              Closed
            </span>
          )}
        </div>

        <h3 className="text-base font-semibold text-slate-900 hover:text-brand-600 transition mb-2">
          <Link href={`/jobs/${job.id}`}>{job.title}</Link>
        </h3>

        <div className="flex flex-wrap gap-y-1.5 gap-x-3 text-xs text-slate-500 mb-4">
          {job.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{job.location}</span>
            </div>
          )}

          {job.work_mode && (
            <div className="flex items-center gap-1 capitalize">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span>{job.work_mode}</span>
            </div>
          )}

          {job.employment_type && (
            <span className="capitalize text-slate-500">
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

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
        <Link
          href={`/jobs/${job.id}`}
          className="text-xs font-medium text-slate-700 hover:text-slate-950 transition"
        >
          View details
        </Link>

        {isOpen ? (
          <Link
            href={`/apply/${job.id}`}
            className="px-3.5 py-1.5 rounded-md bg-brand-500 hover:bg-brand-600 text-white text-xs font-medium transition shadow-2xs text-center"
          >
            Apply
          </Link>
        ) : (
          <button
            disabled
            className="px-3.5 py-1.5 rounded-md bg-slate-100 text-slate-400 text-xs font-medium cursor-not-allowed text-center"
          >
            Closed
          </button>
        )}
      </div>
    </div>
  );
}
