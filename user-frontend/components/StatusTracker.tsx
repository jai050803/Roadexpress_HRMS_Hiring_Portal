import { CheckCircle, Clock, XCircle } from "lucide-react";

interface StatusTrackerProps {
  statusStage: number; // 1: Applied, 2: Under Review, 3: Shortlisted, 4: Terminal/Offer
  statusLabel: string;
}

const STAGES = [
  { stage: 1, label: "Application received" },
  { stage: 2, label: "Under review" },
  { stage: 3, label: "Shortlisted" },
  { stage: 4, label: "Offer outcome" },
];

export default function StatusTracker({ statusStage, statusLabel }: StatusTrackerProps) {
  const normLabel = (statusLabel || "").toLowerCase().trim();
  const isOfferAccepted = normLabel.includes("welcome to road express") || normLabel.includes("offer accepted");
  const isRejected = normLabel.includes("not selected") || (statusStage === 4 && !isOfferAccepted);

  return (
    <div className="w-full bg-white rounded-md border border-slate-200/90 p-6 shadow-2xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100">
        <div>
          <span className="text-xs text-slate-500 block mb-1">
            Current status
          </span>
          <span
            className={`text-lg font-semibold inline-flex items-center gap-2 ${
              isOfferAccepted
                ? "text-emerald-700"
                : isRejected
                ? "text-stone-700"
                : statusStage === 3
                ? "text-brand-500"
                : "text-slate-800"
            }`}
          >
            {isOfferAccepted ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : isRejected ? (
              <XCircle className="w-5 h-5 text-stone-500" />
            ) : statusStage === 3 ? (
              <CheckCircle className="w-5 h-5 text-brand-500" />
            ) : (
              <Clock className="w-5 h-5 text-signal-screened" />
            )}
            {isOfferAccepted
              ? "Welcome to Road Express (Step 4/4)"
              : isRejected
              ? `${statusLabel} (Step 4/4)`
              : statusLabel}
          </span>
        </div>

        <div className="text-xs text-slate-400">
          Updated via Road Express recruitment system
        </div>
      </div>

      {isOfferAccepted ? (
        <div className="space-y-6">
          {/* Progress Bar 100% */}
          <div className="relative mb-4">
            <div className="overflow-hidden h-1.5 mb-4 flex rounded-full bg-slate-100">
              <div
                style={{ width: "100%" }}
                className="shadow-none flex flex-col justify-center bg-emerald-600 transition-all duration-500"
              />
            </div>

            <div className="grid grid-cols-4 text-center">
              {[
                { stage: 1, label: "Application received" },
                { stage: 2, label: "Under review" },
                { stage: 3, label: "Shortlisted" },
                { stage: 4, label: "Welcome" },
              ].map((s) => (
                <div key={s.stage} className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1 transition-all bg-emerald-600 text-white">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-950">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
            <p className="font-semibold mb-1 text-emerald-900">Welcome to Road Express</p>
            <p className="leading-relaxed text-emerald-800">
              Your offer has been confirmed. HR will be in touch.
            </p>
          </div>
        </div>
      ) : isRejected ? (
        <div className="p-4 rounded-md bg-stone-50 border border-stone-200 text-xs text-stone-800">
          <p className="font-semibold mb-1 text-slate-900">Application concluded</p>
          <p className="leading-relaxed text-slate-600">
            Thank you for your interest in Road Express. While we are unable to progress your application for this specific vacancy, your profile has been retained in our candidate talent bank for upcoming corporate logistics requirements.
          </p>
        </div>
      ) : (
        <div>
          {/* Progress Bar */}
          <div className="relative mb-4">
            <div className="overflow-hidden h-1.5 mb-4 flex rounded-full bg-slate-100">
              <div
                style={{
                  width: `${Math.min(100, ((statusStage - 1) / (STAGES.length - 1)) * 100)}%`,
                }}
                className="shadow-none flex flex-col justify-center bg-brand-500 transition-all duration-500"
              />
            </div>

            <div className="grid grid-cols-4 text-center">
              {STAGES.map((s) => {
                const isPassed = statusStage >= s.stage;
                const isCurrent = statusStage === s.stage;

                return (
                  <div key={s.stage} className="flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1 transition-all ${
                        isCurrent
                          ? "bg-brand-500 text-white ring-2 ring-brand-100"
                          : isPassed
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isPassed ? <CheckCircle className="w-3.5 h-3.5" /> : s.stage}
                    </div>
                    <span
                      className={`text-xs ${
                        isCurrent
                          ? "font-semibold text-slate-950"
                          : isPassed
                          ? "font-medium text-slate-700"
                          : "text-slate-400"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
