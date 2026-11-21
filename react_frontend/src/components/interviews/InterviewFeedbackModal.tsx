import React, { useState } from "react";
import { AlertCircle, CheckCircle, Loader2, Star, X } from "lucide-react";
import { submitInterviewFeedback } from "../../lib/api";

export interface InterviewFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  interviewId: string;
  candidateName: string;
  jobTitle?: string;
  onSuccess: () => void;
}

export default function InterviewFeedbackModal({
  isOpen,
  onClose,
  interviewId,
  candidateName,
  jobTitle,
  onSuccess,
}: InterviewFeedbackModalProps) {
  const [technicalScore, setTechnicalScore] = useState(4);
  const [communicationScore, setCommunicationScore] = useState(4);
  const [problemSolvingScore, setProblemSolvingScore] = useState(4);
  const [cultureFitScore, setCultureFitScore] = useState(4);

  const [recommendation, setRecommendation] = useState<"strong_hire" | "hire" | "hold" | "reject">("hire");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setSubmitting(true);
      await submitInterviewFeedback(interviewId, {
        technical_score: technicalScore,
        communication_score: communicationScore,
        problem_solving_score: problemSolvingScore,
        culture_fit_score: cultureFitScore,
        recommendation,
        notes: notes.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit interview scorecard.");
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({
    value,
    onChange,
    label,
  }: {
    value: number;
    onChange: (v: number) => void;
    label: string;
  }) => (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
      <span className="text-xs font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 focus:outline-none transition cursor-pointer"
          >
            <Star
              className={`w-4 h-4 ${
                star <= value
                  ? "text-amber-400 fill-amber-400"
                  : "text-slate-300 hover:text-amber-200"
              }`}
            />
          </button>
        ))}
        <span className="text-xs font-mono font-medium text-slate-600 ml-1.5 w-6 text-right">
          {value}/5
        </span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Interview Evaluation Scorecard
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Candidate: <span className="font-semibold text-slate-800">{candidateName}</span>
              {jobTitle && <span> · {jobTitle}</span>}
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 bg-stone-50 border border-stone-200 text-stone-800 rounded font-medium">
              {error}
            </div>
          )}

          {/* Rating Rubric */}
          <div className="bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/80 space-y-1">
            <span className="text-xs font-semibold text-slate-900 block mb-2">
              Performance Criteria Rubric (1 to 5)
            </span>
            <StarRating
              label="Technical Competence & Problem Solving"
              value={technicalScore}
              onChange={setTechnicalScore}
            />
            <StarRating
              label="Communication & Clarity"
              value={communicationScore}
              onChange={setCommunicationScore}
            />
            <StarRating
              label="Analytical Thinking & Scalability"
              value={problemSolvingScore}
              onChange={setProblemSolvingScore}
            />
            <StarRating
              label="Cultural Fit & Teamwork"
              value={cultureFitScore}
              onChange={setCultureFitScore}
            />
          </div>

          {/* Final Hiring Recommendation */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Hiring Recommendation <span className="text-brand-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: "strong_hire", label: "Strong Hire", color: "border-emerald-500 bg-emerald-50 text-emerald-800" },
                { key: "hire", label: "Hire", color: "border-brand-500 bg-brand-50 text-brand-800" },
                { key: "hold", label: "Hold", color: "border-amber-500 bg-amber-50 text-amber-800" },
                { key: "reject", label: "Reject", color: "border-stone-500 bg-stone-100 text-stone-800" },
              ].map((rec) => (
                <button
                  key={rec.key}
                  type="button"
                  onClick={() => setRecommendation(rec.key as any)}
                  className={`py-2 px-2.5 rounded border text-center font-medium transition cursor-pointer text-xs ${
                    recommendation === rec.key
                      ? rec.color + " font-bold shadow-2xs"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {rec.label}
                </button>
              ))}
            </div>
          </div>

          {/* Written Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Detailed Assessment &amp; Remarks
            </label>
            <textarea
              rows={4}
              placeholder="Strengths observed, architecture decisions discussed, potential areas of growth, and hiring rationale..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 bg-white font-sans"
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
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Submit Scorecard</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
