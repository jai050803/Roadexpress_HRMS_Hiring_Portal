"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  FileUp,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Shield,
  Users,
} from "lucide-react";
import { getMe, logoutHR } from "@/lib/api";
import { HRUser } from "@/lib/types";

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<HRUser | null>(null);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {
        // Not authenticated or error
      });
  }, []);

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Job Roles", href: "/jobs", icon: Briefcase },
    { label: "Create Role", href: "/jobs/new", icon: PlusCircle },
    { label: "Upload Emailed CV", href: "/upload-cv", icon: FileUp },
  ];

  return (
    <aside className="w-60 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-14 px-4 flex items-center gap-3 border-b border-slate-800 bg-slate-950">
        <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs tracking-wider">
          RE
        </div>
        <div>
          <span className="font-bold text-sm tracking-tight text-white block leading-tight">
            Road Express
          </span>
          <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
            HRMS Portal
          </span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Recruitment
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition ${
                isActive
                  ? "bg-blue-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Profile & Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/50">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="truncate pr-2">
            <span className="text-xs font-semibold text-white block truncate">
              {user?.name || "HR Admin"}
            </span>
            <span className="text-[10px] text-slate-400 font-mono block truncate">
              {user?.email || "admin@roadexpress.in"}
            </span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Active session" />
        </div>

        <button
          type="button"
          onClick={() => logoutHR()}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 text-xs text-rose-400 hover:text-white hover:bg-rose-950/50 rounded border border-rose-900/30 transition font-medium"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
