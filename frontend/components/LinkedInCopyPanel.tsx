"use client";

import React, { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { markLinkedinPosted } from "@/lib/api";

interface LinkedInCopyPanelProps {
  jobId: string;
  initialPosted: boolean;
  initialPostedAt?: string;
  copyText?: string;
  onPostedChange?: (posted: boolean) => void;
}

export default function LinkedInCopyPanel({
  jobId,
  initialPosted,
  initialPostedAt,
  copyText = "",
  onPostedChange,
}: LinkedInCopyPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isPosted, setIsPosted] = useState(initialPosted);
  const [postedAt, setPostedAt] = useState<string | undefined>(initialPostedAt);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCopy = () => {
    if (!copyText) return;
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTogglePosted = async () => {
    try {
      setIsUpdating(true);
      setError(null);
      const updated = await markLinkedinPosted(jobId);
      setIsPosted(updated.linkedin_posted);
      setPostedAt(updated.linkedin_posted_at);
      if (onPostedChange) onPostedChange(updated.linkedin_posted);
    } catch (err: any) {
      setError(err.message || "Failed to update LinkedIn posted status.");
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "";
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
    <div className="bg-white rounded-md border border-slate-200/90 p-4 shadow-2xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-semibold text-slate-900 tracking-tight">
            LinkedIn post copy
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPosted}
              onChange={handleTogglePosted}
              disabled={isUpdating}
              className="w-4 h-4 rounded text-brand-500 focus:ring-brand-500 border-slate-300 transition"
            />
            <span className="text-xs font-medium text-slate-700">
              {isUpdating ? "Updating..." : "Mark as posted"}
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-2 text-xs bg-stone-50 border border-stone-200 text-stone-700 rounded-md">
          {error}
        </div>
      )}

      {/* Copy Text Preview Area */}
      <div className="mt-3">
        {copyText ? (
          <div className="relative group">
            <pre className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-md text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {copyText}
            </pre>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {isPosted && postedAt
                  ? `Posted on LinkedIn: ${formatDate(postedAt)}`
                  : "Copy text directly into company LinkedIn update"}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-signal-published" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic py-2">
            LinkedIn copy will be generated when this role is published.
          </p>
        )}
      </div>
    </div>
  );
}
