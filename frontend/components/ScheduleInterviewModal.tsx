"use client";

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
import { listApplications, listHRUsers, scheduleInterview } from "@/lib/api";
import { ApplicationListItem, HRUserSimple } from "@/lib/types";

interface ScheduleInterviewModalProps {
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
  const [interviewerIds, setInterviewerIds] = useState<string[]>([]);
  const [hrUsers, setHrUsers] = useState<HRUserSimple[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Compute minimum datetime (now + 5 min in local timezone for datetime-local input)
  const getMinDateTime = () => {
    const now = new Date(Date.now() + 5 * 60 * 1000);
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

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
        listApplications({ status: "SHORTLISTED", limit: 100 })
          .then((res) => {
            setShortlistedApps(res.items || []);
          })
          .catch(() => {})
          .finally(() => setLoadingApps(false));
      }

      // Pre-set default time to tomorrow at 10:00 AM if empty
      if (!scheduledAt) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        const y = tomorrow.getFullYear();
        const m = String(tomorrow.getMonth() + 1).padStart(2, "0");
        const d = String(tomorrow.getDate()).padStart(2, "0");
        setScheduledAt(`${y}-${m}-${d}T10:00`);
      }

      // Load HR users
      setLoadingUsers(true);
      listHRUsers()
        .then((users) => setHrUsers(users))
        .catch(() => {})
        .finally(() => setLoadingUsers(false));
    }
  }, [isOpen, applicationId, candidateName, candidatePhone]);

  if (!isOpen) return null;

  const toggleInterviewer = (id: string) => {
    if (interviewerIds.includes(id)) {
      setInterviewerIds(interviewerIds.filter((item) => item !== id));
    } else {
      setInterviewerIds([...interviewerIds, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const effectiveAppId = applicationId || selectedAppId;
    const effectiveCandidateName = candidateName || selectedCandidateName || "Candidate";

    if (!effectiveAppId) {
      setError("Please select a candidate to schedule an interview for.");
      return;
    }

    if (!scheduledAt) {
      setError("Please select a date and time for the interview.");
      return;
    }

    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      setError("Interview scheduled time must be in the future.");
      return;
    }

    if (mode === "video" && !meetingLink.trim()) {
      setError("Please provide a meeting link for the video interview.");
      return;
    }

    if (mode === "in_person" && !location.trim()) {
      setError("Please provide a physical address or room for in-person interview.");
      return;
    }

    try {
      setSubmitting(true);
      await scheduleInterview({
        application_id: effectiveAppId,
        scheduled_at: scheduledDate.toISOString(),
        duration_minutes: durationMinutes,
        mode,
        meeting_link: mode === "video" ? meetingLink.trim() : undefined,
        location: mode === "in_person" ? location.trim() : undefined,
        hr_notes: hrNotes.trim() || undefined,
        interviewer_ids: interviewerIds.length > 0 ? interviewerIds : undefined,
      });

      onSuccess(effectiveCandidateName);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to schedule interview. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-lg bg-white rounded-lg border border-slate-200/90 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 id="schedule-modal-title" className="text-sm font-semibold text-slate-900">
              Schedule Interview
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Candidate:{" "}
              <span className="font-medium text-slate-700">
                {candidateName || selectedCandidateName || (shortlistedApps.length > 0 ? "Select from list" : "Shortlisted candidate")}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body (Max 6 fields) */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Optional Application Selector (When opening from global Interviews page) */}
          {!applicationId && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Select Shortlisted Candidate <span className="text-rose-500">*</span>
              </label>
              {loadingApps ? (
                <div className="flex items-center gap-2 text-slate-500 py-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading shortlisted candidates...</span>
                </div>
              ) : shortlistedApps.length === 0 ? (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-xs">
                  No shortlisted candidates are currently awaiting interview scheduling.
                </div>
              ) : (
                <select
                  value={selectedAppId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSelectedAppId(id);
                    const app = shortlistedApps.find((a) => a.id === id);
                    if (app) {
                      setSelectedCandidateName(app.candidate_name);
                      setSelectedCandidatePhone(app.candidate_phone || "");
                    }
                  }}
                  required
                  className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                >
                  <option value="">-- Choose candidate application --</option>
                  {shortlistedApps.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.candidate_name} ({app.job_title}) — Ref: {app.reference_number}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          {/* Field 1: Date & Time Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Date &amp; Time <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={scheduledAt}
                min={getMinDateTime()}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              />
            </div>
          </div>

          {/* Field 2: Duration Dropdown */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Duration <span className="text-rose-500">*</span>
            </label>
            <select
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 bg-white focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            >
              <option value={30}>30 min</option>
              <option value={45}>45 min</option>
              <option value={60}>60 min (Default)</option>
              <option value={90}>90 min</option>
              <option value={120}>2 hours</option>
            </select>
          </div>

          {/* Field 3: Mode Segmented Buttons */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Interview Mode <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode("phone")}
                className={`py-2 px-3 rounded-md text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                  mode === "phone"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Phone</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("video")}
                className={`py-2 px-3 rounded-md text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                  mode === "video"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video</span>
              </button>

              <button
                type="button"
                onClick={() => setMode("in_person")}
                className={`py-2 px-3 rounded-md text-xs font-medium border flex items-center justify-center gap-1.5 transition ${
                  mode === "in_person"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>In Person</span>
              </button>
            </div>
          </div>

          {/* Field 4 (Conditional): Meeting link / Location / Phone Note */}
          {mode === "video" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Meeting Link <span className="text-rose-500">*</span>
              </label>
              <input
                type="url"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
                required
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              />
            </div>
          )}

          {mode === "in_person" && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Location / Room <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Conference Room B, HQ Gurgaon"
                required
                className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
              />
            </div>
          )}

          {mode === "phone" && (
            <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-md text-slate-600 leading-relaxed">
              <span>We will call the candidate at their registered number</span>
              {(candidatePhone || selectedCandidatePhone) ? (
                <strong className="text-slate-900 ml-1">({candidatePhone || selectedCandidatePhone})</strong>
              ) : (
                "."
              )}
            </div>
          )}

          {/* Field 5: HR Notes (Optional) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              HR Notes <span className="text-slate-400 font-normal">(Optional · panel only)</span>
            </label>
            <textarea
              value={hrNotes}
              onChange={(e) => setHrNotes(e.target.value)}
              placeholder="Pre-interview notes visible to panel only"
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-md border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 bg-white"
            />
          </div>

          {/* Field 6: Interviewer(s) (Optional multi-select) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Interviewer(s) <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              {loadingUsers && (
                <span className="text-[11px] text-slate-400">Loading panelists...</span>
              )}
            </div>

            {hrUsers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-md">
                {hrUsers.map((u) => {
                  const isSelected = interviewerIds.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleInterviewer(u.id)}
                      className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                        isSelected
                          ? "bg-slate-900 text-white"
                          : "bg-white text-slate-700 border border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {u.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 italic">
                {loadingUsers ? "Loading HR users..." : "No additional HR users found."}
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-stone-50 border border-stone-200 text-stone-800 rounded-md font-medium text-xs">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-2 text-xs font-medium rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-md bg-brand-500 hover:bg-brand-600 text-white transition shadow-2xs disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm &amp; Schedule</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
