import Link from "next/link";
import { ArrowRight, ShieldCheck, Briefcase, Users, Calendar } from "lucide-react";

export default function HRHomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-b from-slate-100 to-slate-200">
      <div className="w-full max-w-3xl bg-white p-8 rounded-xl shadow-lg border border-slate-200 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold mb-6">
          <ShieldCheck className="w-4 h-4" /> Internal HR System
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
          Road Express HRMS Portal
        </h1>
        <p className="text-slate-600 mb-8 max-w-xl mx-auto">
          Manage recruitment pipelines, job postings, candidate evaluations, CV bank, and interview schedules.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
          <div className="p-4 border rounded-lg bg-slate-50">
            <Briefcase className="w-6 h-6 text-blue-600 mb-2" />
            <h3 className="font-semibold text-slate-800">Job Roles</h3>
            <p className="text-xs text-slate-500">Draft, publish, and track applications caps.</p>
          </div>
          <div className="p-4 border rounded-lg bg-slate-50">
            <Users className="w-6 h-6 text-green-600 mb-2" />
            <h3 className="font-semibold text-slate-800">Pipeline & CV Bank</h3>
            <p className="text-xs text-slate-500">Review AI scores, shortlist, and search talent.</p>
          </div>
          <div className="p-4 border rounded-lg bg-slate-50">
            <Calendar className="w-6 h-6 text-purple-600 mb-2" />
            <h3 className="font-semibold text-slate-800">Interviews</h3>
            <p className="text-xs text-slate-500">Google Meet integration & automated reminders.</p>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
          >
            Enter HR Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
