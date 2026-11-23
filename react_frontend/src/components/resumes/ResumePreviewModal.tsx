import React, { useState, useEffect } from "react";
import {
  AlertCircle,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Maximize2,
  Minimize2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { getResumePresignedUrl } from "../../lib/api";

export interface ResumePreviewModalProps {
  resumeId?: string | null;
  candidateName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ResumePreviewModal({
  resumeId,
  candidateName,
  isOpen,
  onClose,
}: ResumePreviewModalProps) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("Candidate_Resume.pdf");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !resumeId) {
      setFileUrl(null);
      setError(null);
      setZoomLevel(100);
      return;
    }

    const loadPdfUrl = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getResumePresignedUrl(resumeId);
        if (res?.download_url) {
          setFileUrl(res.download_url);
          if (res.file_name) setFileName(res.file_name);
        } else {
          // Direct fallback to backend view stream
          setFileUrl(`/api/v1/hiring/resumes/${resumeId}/view`);
        }
      } catch (err: any) {
        // Fallback to direct view endpoint
        setFileUrl(`/api/v1/hiring/resumes/${resumeId}/view`);
      } finally {
        setLoading(false);
      }
    };

    loadPdfUrl();
  }, [isOpen, resumeId]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoomLevel((z) => Math.min(200, z + 25));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(50, z - 25));
  const handleResetZoom = () => setZoomLevel(100);

  const handleDownload = () => {
    if (fileUrl) {
      window.open(fileUrl, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs">
      <div
        className={`bg-white rounded-lg border border-slate-200 shadow-2xl flex flex-col overflow-hidden transition-all ${
          isFullscreen
            ? "w-full h-full fixed inset-0 rounded-none"
            : "w-full max-w-5xl h-[88vh]"
        }`}
      >
        {/* Top Control Bar */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-4 h-4 text-brand-500 shrink-0" />
            <div className="truncate">
              <span className="text-xs font-semibold text-slate-900 truncate block">
                {candidateName ? `${candidateName} - Resume Preview` : fileName}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                PDF Document · {zoomLevel}% Zoom
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition disabled:opacity-30 cursor-pointer"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={handleResetZoom}
              className="px-2 py-1 text-[11px] font-mono text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition cursor-pointer"
              title="Reset zoom"
            >
              {zoomLevel}%
            </button>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 200}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition disabled:opacity-30 cursor-pointer"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <span className="w-px h-4 bg-slate-200 mx-1" />

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded transition cursor-pointer"
              title="Download or open PDF in new tab"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded transition cursor-pointer"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition cursor-pointer ml-1"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Body */}
        <div className="flex-1 bg-slate-100/70 p-2 overflow-auto flex items-center justify-center relative">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-brand-500" />
              <span className="text-xs font-medium">Streaming PDF resume...</span>
            </div>
          ) : error ? (
            <div className="p-6 max-w-md bg-white border border-slate-200 rounded-lg shadow-sm text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-xs text-slate-700 font-medium">{error}</p>
              {fileUrl && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-brand-500 text-white text-xs font-medium hover:bg-brand-600"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Directly</span>
                </button>
              )}
            </div>
          ) : fileUrl ? (
            <div
              className="w-full h-full flex items-center justify-center transition-all"
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
            >
              <iframe
                src={`${fileUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full bg-white rounded border border-slate-300 shadow-sm"
                title="Resume PDF Document"
              />
            </div>
          ) : (
            <div className="text-xs text-slate-400">No PDF document available.</div>
          )}
        </div>

        {/* Bottom Note */}
        <div className="px-4 py-2 border-t border-slate-200 bg-white text-[11px] text-slate-500 flex items-center justify-between">
          <span>Road Express Document Viewer</span>
          <button
            type="button"
            onClick={handleDownload}
            className="text-brand-500 hover:text-brand-600 font-medium inline-flex items-center gap-1"
          >
            <span>Having display issues? Open in new tab</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
