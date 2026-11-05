"use client";

import { useRef, useState, DragEvent, ChangeEvent } from "react";
import { AlertCircle, FileCheck, FileText, Upload, X } from "lucide-react";

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
      const msg = "Invalid file type. Please upload a PDF document (.pdf only).";
      setInternalError(msg);
      setSelectedFile(null);
      onFileSelect(null);
      return;
    }

    // 2. Validate Size
    const maxSizeBytes = maxSizeMb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      const msg = `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is ${maxSizeMb}MB.`;
      setInternalError(msg);
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
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
            isDragging
              ? "border-blue-500 bg-blue-50/50"
              : activeError
              ? "border-red-300 bg-red-50/20 hover:border-red-400"
              : "border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50"
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Upload className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800 mb-1">
            Click to upload or drag & drop your resume
          </p>
          <p className="text-xs text-slate-500">PDF only (max {maxSizeMb}MB)</p>
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-500">
                {(selectedFile.size / 1024).toFixed(0)} KB • PDF Document
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRemove}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
            title="Remove file"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {activeError && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{activeError}</span>
        </div>
      )}
    </div>
  );
}
