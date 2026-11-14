"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  Calendar,
  FileUp,
  LayoutDashboard,
  LogOut,
  Menu,
  PlusCircle,
  Search,
  Users,
  X,
} from "lucide-react";
import { getMe, logoutHR } from "@/lib/api";
import { HRUser } from "@/lib/types";

interface TopNavProps {
  onOpenCommand: () => void;
}

export default function TopNav({ onOpenCommand }: TopNavProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<HRUser | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {});
  }, []);

  const modules = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Postings & Pipeline", href: "/jobs", icon: Briefcase },
    { label: "Interviews", href: "/interviews", icon: Calendar },
    { label: "CV Bank", href: "/cv-bank", icon: Users },
    { label: "Upload Emailed CV", href: "/upload-cv", icon: FileUp },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        {/* Brand Section */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0 group">
            {/* Minimalist Brand Glyph (vertical freight bar in brand orange) */}
            <div className="w-1.5 h-5 bg-brand-500 rounded-xs transition-colors group-hover:bg-brand-600" />
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-slate-900">
                Road Express
              </span>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                HRMS
              </span>
            </div>
          </Link>

          {/* Desktop Module Switcher */}
          <nav className="hidden md:flex items-center gap-1">
            {modules.map((m) => {
              const Icon = m.icon;
              const isActive =
                pathname === m.href ||
                (m.href !== "/dashboard" && pathname.startsWith(m.href)) ||
                (m.href === "/jobs" && pathname.startsWith("/pipeline"));

              return (
                <Link
                  key={m.href}
                  href={m.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition relative ${
                    isActive
                      ? "text-slate-900 font-semibold bg-slate-100"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive ? "text-brand-500" : "text-slate-400"
                    }`}
                  />
                  <span>{m.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-brand-500 rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Center / Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Jump Command Trigger */}
          <button
            type="button"
            onClick={onOpenCommand}
            className="flex items-center gap-2 px-2.5 py-1.5 text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition font-normal"
            title="Open command palette (Ctrl+K or ⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Jump to role...</span>
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded">
              ⌘K
            </kbd>
          </button>

          {/* New Role Shortcut */}
          <Link
            href="/jobs/new"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-brand-500 hover:bg-brand-600 text-white transition shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Create role</span>
          </Link>

          {/* User profile & Logout */}
          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200">
            <div className="hidden lg:block text-right">
              <span className="block text-xs font-medium text-slate-900 leading-tight">
                {user?.name || "HR Admin"}
              </span>
              <span className="block text-[11px] text-slate-500">
                {user?.email || "admin@roadexpress.com"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => logoutHR()}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
              title="Sign out of HR portal"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile menu toggle button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 rounded"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {modules.map((m) => {
            const Icon = m.icon;
            const isActive =
              pathname === m.href ||
              (m.href !== "/dashboard" && pathname.startsWith(m.href)) ||
              (m.href === "/jobs" && pathname.startsWith("/pipeline"));

            return (
              <Link
                key={m.href}
                href={m.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded ${
                  isActive
                    ? "bg-slate-100 text-slate-900 font-semibold text-brand-600"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4 text-slate-400" />
                <span>{m.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/jobs/new"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs text-brand-600 font-semibold"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Create role</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
