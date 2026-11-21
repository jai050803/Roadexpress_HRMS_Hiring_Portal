import React, { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { rescheduleInterview } from "../../lib/api";

export interface RescheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  interviewId: string;
  candidateName: string;
  initialScheduledAt?: string;
  initialMeetingLink?: string;
  onSuccess: () => void;
}

export default function RescheduleInterviewModal({
  isOpen,
  onClose,
  interviewId,
  candidateName,
  initialScheduledAt,
  initialMeetingLink,
  onSuccess,
}: RescheduleInterviewModalProps) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialScheduledAt) {
        try {
          const d = new Date(initialScheduledAt);
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const h = String(d.getHours()).padStart(2, "0");
          const min = String(d.getMinutes()).padStart(2, "0");
          setScheduledAt(`${y}-${m}-${day}T${h}:${min}`);
        } catch {
          setScheduledAt("");
        }
      }
      setMeetingLink(initialMeetingLink || "");
    }
  }, [isOpen, initialScheduledAt, initialMeetingLink]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!scheduledAt) {
      setError("Please select a new date and time.");
      return;
    }

    try {
      setSubmitting(true);
      await rescheduleInterview(interviewId, {
        scheduled_at: new Date(scheduledAt).toISOString(),
        meeting_link: meetingLink.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to reschedule interview.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-md bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Reschedule Interview</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Candidate: <span className="font-medium text-slate-700">{candidateName}</span>
            </p>
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
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              New Date &amp; Time <span className="text-brand-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              required
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 font-tabular bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Updated Meeting Link <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="url"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              placeholder="https://meet.google.com/..."
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 bg-white"
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded bg-brand-500 hover:bg-brand-600 text-white transition shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Reschedule</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
