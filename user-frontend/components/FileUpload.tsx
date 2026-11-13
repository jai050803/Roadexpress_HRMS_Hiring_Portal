"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";
import { AlertCircle, FileCheck, Upload, X } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  error?: string;
  maxSizeMb?: number;
}

export default function FileUpload({
  onFileSelect,
  error: externalError,
  maxSizeMb = 5,
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (file: File) => {
    setInternalError(null);

    // 1. Validate PDF format
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      setInternalError("File must be a PDF under 5MB");
      setSelectedFile(null);
      onFileSelect(null);
      return;
    }

    // 2. Validate Size
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setInternalError("File must be a PDF under 5MB");
      setSelectedFile(null);
      onFileSelect(null);
      return;
    }

    if (file.size === 0) {
      setInternalError("The selected file is empty. Please upload a valid resume.");
      setSelectedFile(null);
      onFileSelect(null);
      return;
    }

    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    setInternalError(null);
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const activeError = externalError || internalError;

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleInputChange}
      />

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border border-dashed rounded-md p-6 text-center cursor-pointer transition ${
            isDragging
              ? "border-brand-500 bg-brand-50/30"
              : activeError
              ? "border-stone-300 bg-stone-50/50"
              : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
          }`}
        >
          <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-2.5">
            <Upload className="w-5 h-5" />
          </div>
          <p className="text-xs font-medium text-slate-800 mb-0.5">
            Click to upload or drag and drop your resume
          </p>
          <p className="text-[11px] text-slate-500">PDF document only (max 5MB)</p>
        </div>
      ) : (
        <div className="p-3.5 rounded-md border border-slate-200 bg-white shadow-2xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 text-xs font-semibold">
              PDF
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-slate-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-[11px] text-slate-500 font-tabular">
                {(selectedFile.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
            title="Remove file"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeError && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-stone-700 font-medium">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-brand-500" />
          <span>{activeError}</span>
        </div>
      )}
    </div>
  );
}
