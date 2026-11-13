import React from "react";

interface ScoreIndicatorProps {
  score?: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function ScoreIndicator({
  score,
  size = "md",
  className = "",
}: ScoreIndicatorProps) {
  if (score === null || score === undefined) {
    return (
      <span className={`text-slate-400 text-xs font-normal ${className}`}>
        Pending
      </span>
    );
  }

  const clamped = Math.min(100, Math.max(0, score));

  // Restrained track coloring: brand freight accent for top tiers (>=75), neutral slate for others
  const barColor = clamped >= 75 ? "bg-brand-500" : "bg-slate-400";

  if (size === "sm") {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <span className="text-xs font-medium text-slate-800 tabular-nums">
          {clamped}
        </span>
        <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-300`}
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
    );
  }

  if (size === "lg") {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-semibold text-slate-900 tabular-nums tracking-tight">
            {clamped}
          </span>
          <span className="text-xs text-slate-400">/ 100</span>
        </div>
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} transition-all duration-300`}
            style={{ width: `${clamped}%` }}
          />
        </div>
      </div>
    );
  }

  // Default "md" size for tables
  return (
    <div className={`inline-flex flex-col gap-1 min-w-[64px] ${className}`}>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-slate-900 tabular-nums">
          {clamped}
        </span>
        <span className="text-[10px] text-slate-400">/ 100</span>
      </div>
      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
