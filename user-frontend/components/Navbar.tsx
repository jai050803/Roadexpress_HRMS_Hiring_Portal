import Link from "next/link";
import { Truck } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight">ROAD EXPRESS</span>
            <span className="text-xs text-blue-600 font-semibold block uppercase tracking-wider">Careers</span>
          </div>
        </Link>

        <div className="flex items-center gap-6 text-sm font-medium">
          <Link href="/" className="text-slate-600 hover:text-blue-600 transition">
            Explore Jobs
          </Link>
          <Link
            href="/track"
            className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
          >
            Track Application
          </Link>
        </div>
      </div>
    </nav>
  );
}
