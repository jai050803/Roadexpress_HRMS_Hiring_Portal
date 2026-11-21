import React from "react";
import { CheckCircle2, Clock, XCircle, ArrowRight, Shield } from "lucide-react";
import { StatusHistoryItem } from "../../lib/types";
import StatusBadge from "./StatusBadge";

interface StatusTimelineProps {
  history: StatusHistoryItem[];
  className?: string;
}

export default function StatusTimeline({ history, className = "" }: StatusTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <p className="text-xs text-slate-400 italic py-2">No status history recorded yet.</p>
    );
  }

  const sorted = [...history].sort(
    (a, b) => new Date(a.changed_at || a.created_at || '').getTime() - new Date(b.changed_at || b.created_at || '').getTime()
  );

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      return new Date(isoString).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className={`relative pl-4 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 ${className}`}>
      {sorted.map((item, idx) => {
        const fromStatus = item.from_status || item.old_status;
        const toStatus = item.to_status || item.new_status || 'UNKNOWN';
        const changedAt = item.changed_at || item.created_at || '';

        return (
          <div key={item.id || idx} className="relative flex items-start gap-3">
            <div className="absolute -left-4 mt-0.5 w-4 h-4 rounded-full bg-white border-2 border-slate-400 flex items-center justify-center shrink-0 z-10">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-3 w-full">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  {fromStatus ? (
                    <>
                      <StatusBadge status={fromStatus} />
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </>
                  ) : (
                    <span className="text-[11px] text-slate-400 font-mono">INITIAL →</span>
                  )}
                  <StatusBadge status={toStatus} />
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  {formatDate(changedAt)}
                </span>
              </div>

              {item.reason && (
                <div className="text-xs text-rose-800 font-medium mt-1">
                  Reason: <span className="font-mono">{item.reason}</span>
                </div>
              )}
              {item.remarks && (
                <p className="text-xs text-slate-600 mt-1 italic bg-white p-2 rounded border border-slate-100">
                  "{item.remarks}"
                </p>
              )}

              <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>
                  {item.changed_by_name
                    ? `Action by ${item.changed_by_name}`
                    : item.changed_by_type === "system" || !item.changed_by
                    ? "Automated System Gate"
                    : `Action by HR User (${item.changed_by.slice(0, 8)}...)`}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
