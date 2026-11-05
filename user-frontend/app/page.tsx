import Link from "next/link";
import { Briefcase, MapPin, Clock, ArrowRight } from "lucide-react";

export default function CareersHomePage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
          Drive the Future with Road Express
        </h1>
        <p className="text-slate-600 text-lg">
          Join our rapidly growing logistics and transportation network. Find your next opportunity below.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center">
        <div className="inline-flex p-3 rounded-full bg-blue-50 text-blue-600 mb-4">
          <Briefcase className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Open Positions</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-6 text-sm">
          Browse published positions, check deadlines, and submit your application online.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/track"
            className="px-6 py-3 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
          >
            Check Existing Application Status
          </Link>
        </div>
      </div>
    </main>
  );
}
