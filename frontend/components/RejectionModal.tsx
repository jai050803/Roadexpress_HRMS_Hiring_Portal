"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { RejectionReason } from "@/lib/types";

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: RejectionReason, remarks: string) => Promise<void>;
  candidateName?: string;
  count?: number;
  isLoading?: boolean;
}

const REJECTION_REASONS: { value: RejectionReason; label: string }[] = [
  { value: "insufficient_experience", label: "Insufficient Experience" },
  { value: "role_filled", label: "Role Already Filled" },
  { value: "overqualified", label: "Overqualified for Role" },
  { value: "no_response", label: "No Response from Candidate" },
  { value: "other", label: "Other" },
];

export default function RejectionModal({
  isOpen,
  onClose,
  onConfirm,
  candidateName,
  count,
  isLoading = false,
}: RejectionModalProps) {
  const [reason, setReason] = useState<RejectionReason | "">("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError("Please select a rejection reason.");
      return;
    }
    setError(null);
    try {
      await onConfirm(reason as RejectionReason, remarks.trim());
      setReason("");
      setRemarks("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit rejection.");
    }
  };

  const title = count && count > 1
    ? `Reject ${count} Candidates`
    : `Reject Candidate${candidateName ? `: ${candidateName}` : ""}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <h3 className="text-sm font-bold tracking-tight text-slate-900">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Rejection Reason <span className="text-rose-600">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as RejectionReason)}
              required
              disabled={isLoading}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
            >
              <option value="">-- Select a mandatory reason --</option>
              {REJECTION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Internal Remarks <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Internal HR evaluation notes (not shared with candidate)..."
              rows={3}
              disabled={isLoading}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-500 font-sans"
            />
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            This action will move the candidate to the <strong>REJECTED</strong> status and trigger an automated rejection notification.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded border border-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason || isLoading}
              className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded shadow-sm flex items-center gap-1.5 transition"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Rejection</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
