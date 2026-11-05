import Link from "next/link";
import { Boxes } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/jobs" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm group-hover:bg-blue-500 transition">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-white tracking-tight">ROAD EXPRESS</span>
            <span className="text-xs text-blue-400 font-semibold block uppercase tracking-wider">Careers Portal</span>
          </div>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6 text-sm font-medium">
          <Link
            href="/jobs"
            className="text-slate-300 hover:text-white transition px-2 py-1"
          >
            Open Roles
          </Link>
          <Link
            href="/track"
            className="px-3.5 py-1.5 rounded-md bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700 transition text-xs sm:text-sm font-semibold"
          >
            Track Application
          </Link>
        </div>
      </div>
    </nav>
  );
}
