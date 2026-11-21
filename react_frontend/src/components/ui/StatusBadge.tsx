import React from "react";

interface StatusBadgeProps {
  status: string;
  type?: "job" | "application" | "source";
  className?: string;
}

export default function StatusBadge({
  status,
  type = "application",
  className = "",
}: StatusBadgeProps) {
  const norm = (status || "").toLowerCase().trim();

  let styleClasses = "bg-slate-100 text-slate-700 border-slate-200";
  let dotColor = "bg-slate-400";
  let label = status;

  if (type === "job") {
    switch (norm) {
      case "published":
        styleClasses = "bg-teal-50/80 text-teal-800 border-teal-200/70";
        dotColor = "bg-teal-600";
        label = "Published";
        break;
      case "draft":
        styleClasses = "bg-slate-100 text-slate-600 border-slate-200";
        dotColor = "bg-slate-400";
        label = "Draft";
        break;
      case "closed":
        styleClasses = "bg-stone-100 text-stone-600 border-stone-200";
        dotColor = "bg-stone-400";
        label = "Closed";
        break;
    }
  } else if (type === "source") {
    switch (norm) {
      case "portal":
        styleClasses = "bg-slate-100 text-slate-700 border-slate-200";
        dotColor = "bg-slate-500";
        label = "Careers portal";
        break;
      case "linkedin":
        styleClasses = "bg-sky-50/80 text-sky-800 border-sky-200";
        dotColor = "bg-sky-600";
        label = "LinkedIn";
        break;
      case "email_upload":
        styleClasses = "bg-amber-50/80 text-amber-800 border-amber-200";
        dotColor = "bg-amber-600";
        label = "Direct intake";
        break;
      default:
        label = status.replace(/_/g, " ");
    }
  } else {
    switch (norm) {
      case "applied":
        styleClasses = "bg-slate-100 text-slate-700 border-slate-200";
        dotColor = "bg-slate-500";
        label = "Applied";
        break;
      case "screening":
      case "screened":
        styleClasses = "bg-amber-50/80 text-amber-800 border-amber-200";
        dotColor = "bg-amber-500";
        label = "Screened";
        break;
      case "shortlisted":
        styleClasses = "bg-brand-50 text-brand-700 border-brand-200";
        dotColor = "bg-brand-500";
        label = "Shortlisted";
        break;
      case "interview_scheduled":
      case "interviewed":
      case "interview_completed":
        styleClasses = "bg-indigo-50/80 text-indigo-800 border-indigo-200";
        dotColor = "bg-indigo-500";
        label = norm === "interview_scheduled" ? "Interview Scheduled" : "Interviewed";
        break;
      case "offered":
      case "offer_extended":
        styleClasses = "bg-blue-50 text-blue-800 border-blue-200";
        dotColor = "bg-blue-600";
        label = "Offered";
        break;
      case "offer_accepted":
      case "hired":
        styleClasses = "bg-teal-50 text-teal-800 border-teal-200";
        dotColor = "bg-teal-600";
        label = norm === "hired" ? "Hired" : "Offer accepted";
        break;
      case "offer_declined":
      case "offer_lapsed":
      case "closed":
        styleClasses = "bg-stone-100 text-stone-600 border-stone-200";
        dotColor = "bg-stone-400";
        label = norm.replace(/_/g, " ");
        break;
      case "rejected":
        styleClasses = "bg-stone-100 text-stone-600 border-stone-200";
        dotColor = "bg-stone-400";
        label = "Concluded";
        break;
      default:
        label = status.replace(/_/g, " ");
        break;
    }
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-normal border ${styleClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
