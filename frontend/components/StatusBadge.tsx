import React from "react";

interface StatusBadgeProps {
  status: string;
  type?: "job" | "application" | "source";
  className?: string;
}

export default function StatusBadge({ status, type = "application", className = "" }: StatusBadgeProps) {
  const norm = (status || "").toLowerCase();

  let colorClasses = "bg-slate-100 text-slate-700 border-slate-300";

  if (type === "job") {
    switch (norm) {
      case "published":
        colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-300";
        break;
      case "draft":
        colorClasses = "bg-slate-100 text-slate-700 border-slate-300";
        break;
      case "closed":
        colorClasses = "bg-rose-50 text-rose-700 border-rose-300";
        break;
    }
  } else if (type === "source") {
    switch (norm) {
      case "portal":
        colorClasses = "bg-blue-50 text-blue-700 border-blue-200";
        break;
      case "linkedin":
        colorClasses = "bg-sky-50 text-sky-800 border-sky-300";
        break;
      case "email_upload":
        colorClasses = "bg-amber-50 text-amber-800 border-amber-300";
        break;
    }
  } else {
    // application status
    switch (norm) {
      case "applied":
        colorClasses = "bg-blue-50 text-blue-700 border-blue-200";
        break;
      case "screened":
        colorClasses = "bg-indigo-50 text-indigo-700 border-indigo-200";
        break;
      case "shortlisted":
        colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-300";
        break;
      case "rejected":
        colorClasses = "bg-rose-50 text-rose-700 border-rose-300";
        break;
      case "interview_scheduled":
      case "interview_completed":
        colorClasses = "bg-purple-50 text-purple-700 border-purple-300";
        break;
      case "offer_extended":
      case "offer_accepted":
        colorClasses = "bg-amber-50 text-amber-700 border-amber-300";
        break;
      case "offer_declined":
      case "withdrawn":
        colorClasses = "bg-zinc-100 text-zinc-600 border-zinc-300";
        break;
    }
  }

  // Format label text
  let label = status;
  if (norm === "email_upload") label = "Email Upload";
  else if (norm === "portal") label = "Portal";
  else if (norm === "linkedin") label = "LinkedIn";
  else if (type === "application") {
    label = status.replace(/_/g, " ");
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border uppercase tracking-wider ${colorClasses} ${className}`}
    >
      {label}
    </span>
  );
}
