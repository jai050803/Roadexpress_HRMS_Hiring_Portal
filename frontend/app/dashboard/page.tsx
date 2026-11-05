import Link from "next/link";
import { Briefcase, Users, FileText, CheckCircle2, Clock } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
            RE
          </div>
          <span className="font-bold text-xl text-slate-800">Road Express HRMS</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-600">
          <span>Logged in as <strong>HR Admin</strong></span>
        </div>
      </header>

      <div className="flex-1 p-8 max-w-7xl mx-auto w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Recruitment Overview</h1>
            <p className="text-slate-500 text-sm">Welcome back to the Road Express hiring pipeline dashboard.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/jobs/create"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
            >
              + Create Job Role
            </Link>
            <Link
              href="/upload-cv"
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300 transition"
            >
              Upload Emailed CV
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-sm font-medium">Open Roles</span>
              <Briefcase className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-800">--</div>
            <span className="text-xs text-slate-400">Published and active</span>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-sm font-medium">Total Applications</span>
              <Users className="w-5 h-5 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-slate-800">--</div>
            <span className="text-xs text-slate-400">Across all roles</span>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-sm font-medium">Pending Review</span>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-800">--</div>
            <span className="text-xs text-slate-400">Screened candidates</span>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-sm font-medium">Shortlisted</span>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-800">--</div>
            <span className="text-xs text-slate-400">Ready for interview</span>
          </div>
        </div>
      </div>
    </div>
  );
}
