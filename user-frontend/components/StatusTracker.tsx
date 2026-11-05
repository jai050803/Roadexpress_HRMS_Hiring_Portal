import { CheckCircle2, Clock, XCircle } from "lucide-react";

interface StatusTrackerProps {
  statusStage: number; // 1: Applied, 2: Under Review, 3: Shortlisted, 4: Terminal
  statusLabel: string;
}

const STAGES = [
  { stage: 1, label: "Application Received" },
  { stage: 2, label: "Under Review" },
  { stage: 3, label: "Shortlisted" },
];

export default function StatusTracker({ statusStage, statusLabel }: StatusTrackerProps) {
  const isRejected = statusLabel.toLowerCase().includes("not selected") || statusStage === 4;

  return (
    <div className="w-full bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100">
        <div>
          <span className="text-xs uppercase font-bold tracking-wider text-slate-400 block">
            Current Status
          </span>
          <span
            className={`text-lg sm:text-xl font-bold inline-flex items-center gap-2 mt-1 ${
              isRejected
                ? "text-red-700"
                : statusStage === 3
                ? "text-emerald-700"
                : "text-blue-700"
            }`}
          >
            {isRejected ? (
              <XCircle className="w-5 h-5 text-red-600" />
            ) : statusStage === 3 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <Clock className="w-5 h-5 text-blue-600" />
            )}
            {statusLabel}
          </span>
        </div>

        <div className="text-xs text-slate-500">
          Last updated via Road Express Hiring System
        </div>
      </div>

      {isRejected ? (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
          <p className="font-semibold mb-1">Application Concluded</p>
          <p className="text-xs leading-relaxed text-red-700">
            Thank you for your time and interest in Road Express. While we are unable to offer you a position for this specific vacancy, our team has archived your details in our talent network for upcoming opportunities.
          </p>
        </div>
      ) : (
        <div>
          {/* Progress Bar */}
          <div className="relative mb-6">
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-100">
              <div
                style={{
                  width: `${Math.min(100, ((statusStage - 1) / (STAGES.length - 1)) * 100)}%`,
                }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"
              />
            </div>

            <div className="grid grid-cols-3 text-center">
              {STAGES.map((s) => {
                const isPassed = statusStage >= s.stage;
                const isCurrent = statusStage === s.stage;

                return (
                  <div key={s.stage} className="flex flex-col items-center">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all ${
                        isPassed
                          ? "bg-blue-600 text-white shadow"
                          : "bg-slate-200 text-slate-500"
                      } ${isCurrent ? "ring-4 ring-blue-100" : ""}`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : s.stage}
                    </div>
                    <span
                      className={`text-xs ${
                        isCurrent
                          ? "font-bold text-slate-900"
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
