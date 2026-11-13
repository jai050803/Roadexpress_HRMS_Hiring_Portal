import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-charcoal-900 border-b border-charcoal-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-md bg-brand-500 flex items-center justify-center text-white font-semibold text-xs shadow-2xs group-hover:bg-brand-600 transition">
            RF
          </div>
          <div>
            <span className="font-semibold text-base text-white tracking-tight">ROAD EXPRESS</span>
            <span className="text-[11px] text-slate-400 font-medium block">Freight Careers</span>
          </div>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6 text-xs font-medium">
          <Link
            href="/#open-roles"
            className="text-slate-300 hover:text-white transition px-2 py-1"
          >
            Open roles
          </Link>
          <Link
            href="/track"
            className="px-3.5 py-1.5 rounded-md bg-charcoal-800 text-slate-200 hover:bg-charcoal-700 hover:text-white border border-charcoal-700 transition text-xs font-medium"
          >
            Track application
          </Link>
        </div>
      </div>
    </nav>
  );
}
