"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  Mail,
  Phone,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { ApplicationListItem, RejectionReason } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import RejectionModal from "./RejectionModal";

interface CandidateTableProps {
  candidates: ApplicationListItem[];
  onShortlist: (id: string, currentStatus?: string) => Promise<void>;
  onReject: (id: string, reason: RejectionReason, remarks: string) => Promise<void>;
  onBulkShortlist: (ids: string[]) => Promise<void>;
  onBulkReject: (ids: string[], reason: RejectionReason, remarks: string) => Promise<void>;
  isLoading?: boolean;
}

export default function CandidateTable({
  candidates,
  onShortlist,
  onReject,
  onBulkShortlist,
  onBulkReject,
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

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="relative">
      {/* Table Container */}
      <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3 w-8">
                <input
                  type="checkbox"
                  checked={candidates.length > 0 && selectedIds.size === candidates.length}
                  onChange={toggleSelectAll}
                  disabled={candidates.length === 0}
                  className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                />
              </th>
              <th className="py-2.5 px-3">Candidate</th>
              <th className="py-2.5 px-3">Reference</th>
              <th className="py-2.5 px-3">Applied</th>
              <th className="py-2.5 px-3">Source</th>
              <th className="py-2.5 px-3">AI Score</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                  {isLoading ? "Loading candidates..." : "No candidates found matching the selected filter."}
                </td>
              </tr>
            ) : (
              candidates.map((c) => {
                const isSelected = selectedIds.has(c.id);
                const isTerminal = c.current_status === "REJECTED" || c.current_status === "OFFER_ACCEPTED";

                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-50 transition ${
                      isSelected ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectRow(c.id)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Candidate Name & Contact */}
                    <td className="py-2.5 px-3">
                      <Link
                        href={`/candidates/${c.id}`}
                        className="font-semibold text-slate-900 hover:text-blue-600 block"
                      >
                        {c.candidate_name}
                      </Link>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{c.candidate_email}</span>
                        {c.candidate_phone && <span>• {c.candidate_phone}</span>}
                      </div>
                    </td>

                    {/* Reference Number */}
                    <td className="py-2.5 px-3 font-mono text-slate-600 font-medium">
                      {c.reference_number}
                    </td>

                    {/* Applied Date */}
                    <td className="py-2.5 px-3 text-slate-600">
                      {formatDate(c.applied_at)}
                    </td>

                    {/* Source */}
                    <td className="py-2.5 px-3">
                      <StatusBadge status={c.source} type="source" />
                    </td>

                    {/* AI Score */}
                    <td className="py-2.5 px-3">
                      {c.screening_score !== null && c.screening_score !== undefined ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                            <div
                              className={`h-full ${
                                c.screening_score >= 70
                                  ? "bg-emerald-500"
                                  : c.screening_score >= 40
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, c.screening_score))}%` }}
                            />
                          </div>
                          <span
                            className={`font-mono font-bold text-[11px] ${
                              c.screening_score >= 70
                                ? "text-emerald-700"
                                : c.screening_score >= 40
                                ? "text-amber-700"
                                : "text-rose-700"
                            }`}
                          >
                            {c.screening_score}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[11px] italic">Pending</span>
                      )}
                    </td>

                    {/* Current Status */}
                    <td className="py-2.5 px-3">
                      <StatusBadge status={c.current_status} type="application" />
                    </td>

                    {/* Row Actions */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <Link
                          href={`/candidates/${c.id}`}
                          title="View Profile"
                          className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        {!isTerminal && c.current_status !== "SHORTLISTED" && (
                          <button
                            type="button"
                            onClick={() => onShortlist(c.id, c.current_status)}
                            title={c.current_status === "APPLIED" ? "Screen & Shortlist" : "Shortlist"}
                            className="p-1 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded transition"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {!isTerminal && (
                          <button
                            type="button"
                            onClick={() => handleOpenSingleReject(c.id, c.candidate_name)}
                            title="Reject"
                            className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-lg px-5 py-3 shadow-2xl flex items-center gap-4 border border-slate-700 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700 text-xs font-semibold">
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
              {selectedIds.size}
            </span>
            <span>selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkShortlistClick}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Shortlist Selected</span>
            </button>

            <button
              type="button"
              onClick={handleOpenBulkReject}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 transition"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Reject Selected</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-slate-400 hover:text-white p-1 rounded transition ml-2"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={rejectModalState.isOpen}
        onClose={() => setRejectModalState({ isOpen: false, isBulk: false })}
        onConfirm={handleConfirmRejection}
        candidateName={rejectModalState.targetName}
        count={rejectModalState.isBulk ? selectedIds.size : 1}
        isLoading={actionLoading}
      />
    </div>
  );
}
