"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  Check,
  Eye,
  Mail,
  Phone,
  X,
} from "lucide-react";
import { ApplicationListItem, RejectionReason } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import ScoreIndicator from "./ScoreIndicator";
import FloatingToolbar from "./FloatingToolbar";
import RejectionModal from "./RejectionModal";

interface CandidateTableProps {
  candidates: ApplicationListItem[];
  onShortlist: (id: string, currentStatus?: string) => Promise<void>;
  onReject: (id: string, reason: RejectionReason, remarks: string) => Promise<void>;
  onBulkShortlist: (ids: string[]) => Promise<void>;
  onBulkReject: (ids: string[], reason: RejectionReason, remarks: string) => Promise<void>;
  onCompleteInterview?: (applicationId: string, interviewId: string) => Promise<void>;
  onNoShowInterview?: (applicationId: string, interviewId: string) => Promise<void>;
  onMakeOffer?: (applicationId: string) => Promise<void>;
  isLoading?: boolean;
}

export default function CandidateTable({
  candidates,
  onShortlist,
  onReject,
  onBulkShortlist,
  onBulkReject,
  onCompleteInterview,
  onNoShowInterview,
  onMakeOffer,
  isLoading = false,
}: CandidateTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rejectModalState, setRejectModalState] = useState<{
    isOpen: boolean;
    isBulk: boolean;
    targetId?: string;
    targetName?: string;
  }>({
    isOpen: false,
    isBulk: false,
  });
  const [actionLoading, setActionLoading] = useState(false);

  const toggleSelectAll = () => {
    if (selectedIds.size === candidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(candidates.map((c) => c.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleOpenSingleReject = (id: string, name: string) => {
    setRejectModalState({
      isOpen: true,
      isBulk: false,
      targetId: id,
      targetName: name,
    });
  };

  const handleOpenBulkReject = () => {
    setRejectModalState({
      isOpen: true,
      isBulk: true,
    });
  };

  const handleConfirmRejection = async (reason: RejectionReason, remarks: string) => {
    setActionLoading(true);
    try {
      if (rejectModalState.isBulk) {
        await onBulkReject(Array.from(selectedIds), reason, remarks);
        setSelectedIds(new Set());
      } else if (rejectModalState.targetId) {
        await onReject(rejectModalState.targetId, reason, remarks);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkShortlistClick = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    try {
      await onBulkShortlist(Array.from(selectedIds));
      setSelectedIds(new Set());
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });
    } catch {
      return isoString;
    }
  };

  const formatInterviewDetails = (interview?: {
    scheduled_at: string;
    duration_minutes: number;
    mode: string;
  } | null) => {
    if (!interview?.scheduled_at) return null;
    try {
      const d = new Date(interview.scheduled_at);
      const dateStr = d.toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
      const timeStr = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const durStr = `${interview.duration_minutes || 60} min`;
      const modeLabel =
        interview.mode === "in_person"
          ? "In Person"
          : interview.mode === "phone"
          ? "Phone"
          : "Video";
      return `${dateStr} · ${timeStr} · ${durStr} · ${modeLabel}`;
    } catch {
      return null;
    }
  };

  return (
    <div className="relative">
      <div className="overflow-x-auto bg-white rounded-md border border-slate-200/90 shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200/80 text-slate-600 font-medium text-xs">
              <th className="py-3 px-3.5 w-9">
                <input
                  type="checkbox"
                  checked={candidates.length > 0 && selectedIds.size === candidates.length}
                  onChange={toggleSelectAll}
                  aria-label="Select all candidates"
                  className="w-3.5 h-3.5 rounded border-slate-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                />
              </th>
              <th className="py-3 px-3.5 font-medium">Candidate</th>
              <th className="py-3 px-3.5 font-medium w-36">Match evaluation</th>
              <th className="py-3 px-3.5 font-medium">Verified competencies</th>
              <th className="py-3 px-3.5 font-medium w-28">Stage</th>
              <th className="py-3 px-3.5 font-medium w-24">Applied</th>
              <th className="py-3 px-3.5 text-right font-medium w-44">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-slate-400">
                  {isLoading ? "Loading candidates..." : "No candidates found matching the selected filter."}
                </td>
              </tr>
            ) : (
              candidates.map((c) => {
                const isSelected = selectedIds.has(c.id);
                const isHardFail = c.hard_filter_passed === false;
                const isTerminal = c.current_status === "REJECTED" || c.current_status === "OFFER_ACCEPTED";

                return (
                  <tr
                    key={c.id}
                    className={`transition-colors ${
                      isSelected
                        ? "bg-brand-50/40"
                        : isHardFail
                        ? "bg-stone-50/50 hover:bg-stone-100/50"
                        : "hover:bg-slate-50/70"
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(c.id)}
                        aria-label={`Select ${c.candidate_name}`}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                      />
                    </td>

                    {/* Candidate Identity (Clean typography, no middle dots) */}
                    <td className="py-3 px-3.5">
                      <Link
                        href={`/candidates/${c.id}`}
                        className="font-medium text-slate-900 hover:text-brand-600 block transition text-xs leading-snug"
                      >
                        {c.candidate_name}
                      </Link>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{c.candidate_email}</span>
                        {c.candidate_phone && (
                          <>
                            <span className="text-slate-300">/</span>
                            <span>{c.candidate_phone}</span>
                          </>
                        )}
                      </div>
                    </td>

                    {/* Match Evaluation (Score + criteria verdict combined, NO boxes) */}
                    <td className="py-3 px-3.5">
                      <div className="space-y-1">
                        <ScoreIndicator score={c.screening_score} size="sm" />
                        <div className="text-[11px] leading-tight">
                          {isHardFail ? (
                            <span className="text-stone-600 font-medium">Experience gap</span>
                          ) : c.hard_filter_passed === true ? (
                            <span className="text-slate-500">Criteria met</span>
                          ) : (
                            <span className="text-slate-400">Pending review</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Skills: Clean plain typography (NO colored boxes or pills) */}
                    <td className="py-3 px-3.5 max-w-md lg:max-w-xl">
                      {c.matched_skills && c.matched_skills.length > 0 ? (
                        <div className="text-xs text-slate-700 leading-relaxed font-sans">
                          <span>{c.matched_skills.slice(0, 6).join(", ")}</span>
                          {c.matched_skills.length > 6 && (
                            <span className="text-slate-400 font-tabular ml-1">
                              +{c.matched_skills.length - 6} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Awaiting parse</span>
                      )}
                    </td>

                    {/* Stage Status */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <StatusBadge status={c.current_status} type="application" />
                      {c.current_status === "INTERVIEW_SCHEDULED" && c.upcoming_interview && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1 font-medium">
                          <CalendarClock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatInterviewDetails(c.upcoming_interview)}</span>
                        </div>
                      )}
                    </td>

                    {/* Applied Date */}
                    <td className="py-3 px-3.5 text-slate-500 whitespace-nowrap font-tabular text-xs">
                      {formatDate(c.applied_at)}
                    </td>

                    {/* Quick Row Actions */}
                    <td className="py-3 px-3.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {c.current_status === "INTERVIEW_SCHEDULED" ? (
                          <>
                            {c.upcoming_interview?.id && onCompleteInterview && (
                              <button
                                type="button"
                                onClick={() => onCompleteInterview(c.id, c.upcoming_interview!.id)}
                                className="px-2 py-1 text-[11px] font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:text-brand-600 hover:border-brand-300 transition"
                                title="Mark interview completed"
                              >
                                Mark Done
                              </button>
                            )}
                            {c.upcoming_interview?.id && onNoShowInterview && (
                              <button
                                type="button"
                                onClick={() => onNoShowInterview(c.id, c.upcoming_interview!.id)}
                                className="px-2 py-1 text-[11px] font-medium rounded-md text-slate-500 hover:text-stone-800 hover:bg-slate-100 transition"
                                title="Mark candidate as no show"
                              >
                                No Show
                              </button>
                            )}
                          </>
                        ) : c.current_status === "INTERVIEWED" ? (
                          <>
                            {onMakeOffer && (
                              <button
                                type="button"
                                onClick={() => onMakeOffer(c.id)}
                                className="px-2 py-1 text-[11px] font-medium rounded-md bg-brand-500 text-white hover:bg-brand-600 transition shadow-2xs"
                                title="Extend offer to candidate"
                              >
                                Make Offer
                              </button>
                            )}
                            {!isTerminal && (
                              <button
                                type="button"
                                onClick={() => handleOpenSingleReject(c.id, c.candidate_name)}
                                className="px-2 py-1 text-[11px] font-medium rounded-md text-slate-500 hover:text-stone-800 hover:bg-slate-100 transition"
                                title="Reject candidate"
                              >
                                Reject
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {!isTerminal && c.current_status !== "SHORTLISTED" && (
                              <button
                                type="button"
                                onClick={() => onShortlist(c.id, c.current_status)}
                                className="px-2 py-1 text-[11px] font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:text-brand-600 hover:border-brand-300 transition"
                                title="Shortlist for interview"
                              >
                                Shortlist
                              </button>
                            )}

                            {!isTerminal && (
                              <button
                                type="button"
                                onClick={() => handleOpenSingleReject(c.id, c.candidate_name)}
                                className="px-2 py-1 text-[11px] font-medium rounded-md text-slate-500 hover:text-stone-800 hover:bg-slate-100 transition"
                                title="Reject candidate"
                              >
                                Reject
                              </button>
                            )}
                          </>
                        )}

                        <Link
                          href={`/candidates/${c.id}`}
                          className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded transition"
                          title="Open full dossier"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Action Bar */}
      <FloatingToolbar
        selectedCount={selectedIds.size}
        onShortlist={handleBulkShortlistClick}
        onReject={handleOpenBulkReject}
        onClearSelection={() => setSelectedIds(new Set())}
        isLoading={actionLoading}
      />

      {/* Rejection Reason Modal */}
      <RejectionModal
        isOpen={rejectModalState.isOpen}
        onClose={() => setRejectModalState({ isOpen: false, isBulk: false })}
        onConfirm={handleConfirmRejection}
        candidateName={rejectModalState.targetName}
        count={rejectModalState.isBulk ? selectedIds.size : undefined}
        isLoading={actionLoading}
      />
    </div>
  );
}
