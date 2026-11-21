import React, { useEffect, useState } from "react";
import {
  Calendar,
  Clock,
  Loader2,
  MapPin,
  Phone,
  Video,
  X,
} from "lucide-react";
import { listApplications, listHRUsers, scheduleInterview } from "../../lib/api";
import { ApplicationListItem, HRUserSimple, InterviewItem } from "../../lib/types";

export interface ScheduleInterviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId?: string;
  candidateName?: string;
  candidatePhone?: string;
  onSuccess: (candidateName: string) => void;
}

export default function ScheduleInterviewModal({
  isOpen,
  onClose,
  applicationId,
  candidateName,
  candidatePhone,
  onSuccess,
}: ScheduleInterviewModalProps) {
  const [selectedAppId, setSelectedAppId] = useState(applicationId || "");
  const [selectedCandidateName, setSelectedCandidateName] = useState(candidateName || "");
  const [selectedCandidatePhone, setSelectedCandidatePhone] = useState(candidatePhone || "");
  const [shortlistedApps, setShortlistedApps] = useState<ApplicationListItem[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);

  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [mode, setMode] = useState<"phone" | "video" | "in_person">("video");
  const [meetingLink, setMeetingLink] = useState("");
  const [location, setLocation] = useState("");
  const [hrNotes, setHrNotes] = useState("");
  const [roundNumber, setRoundNumber] = useState(1);
  const [interviewerIds, setInterviewerIds] = useState<string[]>([]);
  const [hrUsers, setHrUsers] = useState<HRUserSimple[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (applicationId) {
        setSelectedAppId(applicationId);
        setSelectedCandidateName(candidateName || "");
        setSelectedCandidatePhone(candidatePhone || "");
      } else {
        setSelectedAppId("");
        setSelectedCandidateName("");
        setSelectedCandidatePhone("");
        setLoadingApps(true);
        listApplications({ status: "SHORTLISTED", limit: 50 })
          .then((res) => setShortlistedApps(res.items || []))
          .catch(() => {})
          .finally(() => setLoadingApps(false));
      }

      if (!scheduledAt) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        const y = tomorrow.getFullYear();
        const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
        const d = String(tomorrow.getDate()).padStart(2, "0");
        setScheduledAt(`${y}-${m}-${d}T10:00`);
      }

      listHRUsers()
        .then((users) => setHrUsers(users || []))
        .catch(() => {});
    }
  }, [isOpen, applicationId, candidateName, candidatePhone]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const effectiveAppId = applicationId || selectedAppId;
    const effectiveName = candidateName || selectedCandidateName || "Candidate";

    if (!effectiveAppId) {
      setError("Please select a candidate for the interview.");
      return;
    }
    if (!scheduledAt) {
      setError("Please select a date and time.");
      return;
    }

    try {
      setSubmitting(true);
      await scheduleInterview({
        application_id: effectiveAppId,
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_minutes: Number(durationMinutes),
        round_number: Number(roundNumber),
        mode,
        meeting_link: meetingLink.trim() || undefined,
        location: location.trim() || undefined,
        notes: hrNotes.trim() || undefined,
        interviewer_ids: interviewerIds.length > 0 ? interviewerIds : undefined,
      });

      onSuccess(effectiveName);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to schedule interview.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-slate-900">Schedule Interview</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-stone-50 border border-stone-200 text-stone-800 rounded font-medium">
              {error}
            </div>
          )}

          {!applicationId && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Candidate <span className="text-brand-500">*</span>
              </label>
              {loadingApps ? (
                <div className="text-slate-400 py-1 flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading candidates...
                </div>
              ) : shortlistedApps.length === 0 ? (
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded">
                  No shortlisted candidates awaiting scheduling.
                </div>
              ) : (
                <select
                  value={selectedAppId}
                  onChange={(e) => {
                    setSelectedAppId(e.target.value);
                    const found = shortlistedApps.find((a) => a.id === e.target.value);
                    if (found) setSelectedCandidateName(found.candidate_name);
                  }}
                  required
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 bg-white text-slate-900 font-medium"
                >
                  <option value="">Select Candidate</option>
                  {shortlistedApps.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.candidate_name} — {a.job_title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {applicationId && (
            <div className="p-3 bg-slate-50 rounded border border-slate-200/80">
              <span className="text-[11px] text-slate-500 block">Candidate:</span>
              <span className="text-xs font-semibold text-slate-900">{candidateName}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Date &amp; Time <span className="text-brand-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 font-tabular bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Duration (Minutes)
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 bg-white"
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
                <option value={90}>90 min</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Interview Mode
              </label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as any)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 bg-white capitalize"
              >
                <option value="video">Google Meet / Video</option>
                <option value="phone">Phone Screen</option>
                <option value="in_person">In Person / On-site</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Round Number
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={roundNumber}
                onChange={(e) => setRoundNumber(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 font-tabular bg-white"
              />
            </div>
          </div>

          {mode === "video" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Meeting Link (Google Meet / Zoom)
              </label>
              <input
                type="url"
                placeholder="https://meet.google.com/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 bg-white"
              />
            </div>
          )}

          {mode === "in_person" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Office Location / Conference Room
              </label>
              <input
                type="text"
                placeholder="e.g. Bangalore HQ — Meeting Room 3A"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 bg-white"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Internal Recruiter Notes <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Focus areas, coding challenge prep, or interviewer briefing..."
              value={hrNotes}
              onChange={(e) => setHrNotes(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 bg-white font-sans"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-1.5 rounded text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium bg-brand-500 hover:bg-brand-600 text-white transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Schedule</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
