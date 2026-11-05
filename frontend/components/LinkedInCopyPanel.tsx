"use client";

import React, { useState } from "react";
import { Check, Copy, ExternalLink, Loader2, Share2 } from "lucide-react";
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
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-sky-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
            LinkedIn Post Generator
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Mark as posted toggle */}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPosted}
              onChange={handleTogglePosted}
              disabled={isUpdating}
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition"
            />
            <span className="text-xs font-medium text-slate-700">
              {isUpdating ? "Updating..." : "Mark as Posted"}
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-2 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded">
          {error}
        </div>
      )}

      {/* Copy Text Preview Area */}
      <div className="mt-3">
        {copyText ? (
          <div className="relative group">
            <pre className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {copyText}
            </pre>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                {isPosted && postedAt
                  ? `Posted on LinkedIn: ${formatDate(postedAt)}`
                  : "Copy this text directly into your company LinkedIn update"}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded bg-slate-900 text-white hover:bg-slate-800 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>✓ Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic py-2">
            LinkedIn copy will be automatically generated once this role is published.
          </p>
        )}
      </div>
    </div>
  );
}
