"use client";

import React from "react";
import { CheckCircle2, Loader2, X, XCircle } from "lucide-react";

interface FloatingToolbarProps {
  selectedCount: number;
  onShortlist?: () => void;
  onReject?: () => void;
  onClear?: () => void;
  onClearSelection?: () => void;
  isLoading?: boolean;
}

export default function FloatingToolbar({
  selectedCount,
  onShortlist,
  onReject,
  onClear,
  onClearSelection,
  isLoading = false,
}: FloatingToolbarProps) {
  if (selectedCount === 0) return null;
  const handleClear = onClear || onClearSelection || (() => {});

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 bg-slate-900 text-white rounded-lg shadow-xl border border-slate-800 transition-all">
      <div className="flex items-center gap-2 pr-3 border-r border-slate-700 text-xs">
        <span className="w-5 h-5 rounded-full bg-brand-500 text-white font-medium flex items-center justify-center text-[11px] tabular-nums">
          {selectedCount}
        </span>
        <span className="font-medium text-slate-200">
          {selectedCount === 1 ? "candidate selected" : "candidates selected"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {onShortlist && (
          <button
            type="button"
            onClick={onShortlist}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>Shortlist</span>
          </button>
        )}

        {onReject && (
          <button
            type="button"
            onClick={onReject}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded bg-white/10 hover:bg-rose-950/60 text-slate-200 hover:text-rose-200 transition disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Reject</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleClear}
          className="p-1 text-slate-400 hover:text-white rounded transition ml-1"
          title="Clear selection"
          aria-label="Clear selection"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
