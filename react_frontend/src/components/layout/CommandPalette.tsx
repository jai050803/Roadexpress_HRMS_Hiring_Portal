import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Calendar,
  FileUp,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Search,
  Users,
  X,
} from "lucide-react";
import { listAllJobs, logoutHR } from "../../lib/api";
import { JobRole } from "../../lib/types";

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [jobs, setJobs] = useState<JobRole[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      listAllJobs()
        .then((res) => setJobs(res || []))
        .catch(() => {});
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const staticActions = [
    {
      id: "nav-dash",
      title: "Recruitment Dashboard",
      subtitle: "Overview of open roles and activity",
      icon: LayoutDashboard,
      action: () => navigate("/dashboard"),
    },
    {
      id: "nav-interviews",
      title: "Interviews Workspace",
      subtitle: "Weekly calendar, scheduled & completed interviews",
      icon: Calendar,
      action: () => navigate("/interviews"),
    },
    {
      id: "nav-cvbank",
      title: "CV Bank",
      subtitle: "Search, filter, and export talent pool",
      icon: Users,
      action: () => navigate("/cv-bank"),
    },
    {
      id: "nav-jobs",
      title: "All Job Postings",
      subtitle: "View published, draft, and closed roles",
      icon: Briefcase,
      action: () => navigate("/jobs"),
    },
    {
      id: "action-create",
      title: "Create New Job Role",
      subtitle: "Draft a new role and generate JD",
      icon: PlusCircle,
      action: () => navigate("/jobs/new"),
    },
    {
      id: "action-upload",
      title: "Upload Emailed CV",
      subtitle: "Add direct applicant to a role",
      icon: FileUp,
      action: () => navigate("/upload-cv"),
    },
    {
      id: "action-logout",
      title: "Log out",
      subtitle: "End current recruitment session",
      icon: LogOut,
      action: () => logoutHR(),
    },
  ];

  const jobActions = jobs.map((j) => ({
    id: `job-${j.id}`,
    title: j.title,
    subtitle: `${j.department} • ${j.applications_count || 0} applicants • ${j.status}`,
    icon: Briefcase,
    action: () => navigate(`/pipeline/${j.id}`),
  }));

  const allItems = [
    ...jobActions,
    ...staticActions,
  ].filter((item) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      item.subtitle.toLowerCase().includes(q)
    );
  });

  const handleSelect = (idx: number) => {
    const item = allItems[idx];
    if (item) {
      item.action();
      onClose();
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % (allItems.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/40 backdrop-blur-xs transition-opacity">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-xl bg-white rounded-lg border border-slate-200 shadow-xl overflow-hidden z-10 flex flex-col max-h-[75vh]">
        <div className="flex items-center px-3.5 border-b border-slate-200">
          <Search className="w-4 h-4 text-slate-400 shrink-0 mr-2.5" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a role name, department, or action..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            className="w-full py-3 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent border-0 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition cursor-pointer"
            aria-label="Close command palette"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-1.5 space-y-0.5 divide-y divide-slate-100/60">
          {allItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No matching job roles or actions found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            allItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(idx)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-2 rounded text-xs flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? "bg-slate-100 text-slate-900 font-medium"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-brand-500" : "text-slate-400"}`} />
                    <div className="truncate">
                      <span className="block text-slate-900 truncate">{item.title}</span>
                      <span className="block text-[11px] text-slate-500 truncate">{item.subtitle}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">
                      Jump
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="px-3.5 py-2 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 text-[10px]">↑</kbd> <kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 text-[10px]">↓</kbd> navigate</span>
            <span><kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 text-[10px]">↵</kbd> select</span>
            <span><kbd className="px-1 py-0.5 rounded bg-white border border-slate-200 text-[10px]">esc</kbd> close</span>
          </div>
          <span className="text-slate-400">Road Express Command</span>
        </div>
      </div>
    </div>
  );
}
