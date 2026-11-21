import React, { useState } from "react";
import { AlertCircle, Loader2, X } from "lucide-react";
import { cancelInterview } from "../../lib/api";

export interface CancelInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  interviewId: string;
  candidateName: string;
  onSuccess: () => void;
}

export default function CancelInterviewModal({
  isOpen,
  onClose,
  interviewId,
  candidateName,
  onSuccess,
}: CancelInterviewModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError("Please provide a reason for cancelling the interview.");
      return;
    }

    try {
      setSubmitting(true);
      await cancelInterview(interviewId, reason.trim());
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to cancel interview.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-stone-600" />
            <h2 className="text-sm font-semibold text-slate-900">Cancel Interview</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">
            Are you sure you want to cancel the scheduled interview with{" "}
            <strong className="text-slate-900">{candidateName}</strong>?
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Cancellation Reason <span className="text-brand-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Candidate requested cancellation, panel unavailable, or role on hold"
              rows={3}
              required
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 bg-white"
            />
          </div>

          {error && (
            <div className="p-3 bg-stone-50 border border-stone-200 text-stone-800 rounded font-medium text-xs">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-2 text-xs font-medium rounded text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition cursor-pointer"
            >
              Keep Scheduled
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded bg-stone-900 hover:bg-stone-800 text-white transition shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Cancellation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
