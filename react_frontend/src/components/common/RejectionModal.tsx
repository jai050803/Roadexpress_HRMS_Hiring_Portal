import React, { useState } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import { RejectionReason } from "../../lib/types";

export interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: RejectionReason, remarks: string) => Promise<void>;
  candidateName?: string;
  count?: number;
  isLoading?: boolean;
}

const REJECTION_REASONS: { value: RejectionReason; label: string }[] = [
  { value: "insufficient_experience", label: "Insufficient experience for role level" },
  { value: "role_filled", label: "Position filled" },
  { value: "overqualified", label: "Overqualified for role" },
  { value: "no_response", label: "Candidate unresponsive" },
  { value: "other", label: "Other / evaluation mismatch" },
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
      setError("Select a mandatory reason to record in the rejection log.");
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
    ? `Reject ${count} candidates`
    : `Reject candidate${candidateName ? `: ${candidateName}` : ""}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-md border border-slate-200 w-full max-w-md overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2 text-slate-800">
            <AlertCircle className="w-4 h-4 text-slate-500 shrink-0" />
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 rounded bg-stone-50 border border-stone-300 text-stone-800 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Rejection reason <span className="text-brand-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as RejectionReason)}
              required
              disabled={isLoading}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-medium"
            >
              <option value="">Select reason</option>
              {REJECTION_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Internal remarks <span className="text-slate-400 font-normal">(Optional audit notes)</span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Context or notes regarding this candidate evaluation..."
              rows={3}
              disabled={isLoading}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 font-sans"
            />
          </div>

          <p className="text-[11px] text-slate-500 leading-normal">
            Status will update to <strong>Rejected</strong>. Candidate will receive the standard notification template.
          </p>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded border border-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!reason || isLoading}
              className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed rounded shadow-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm rejection</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
