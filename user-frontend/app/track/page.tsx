import Link from "next/link";
import { Search, ArrowLeft } from "lucide-react";

export default function TrackApplicationPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to open roles
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Track Your Application</h1>
        <p className="text-sm text-slate-500 mb-6">
          Enter your email address and application reference number to check your status.
        </p>

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              placeholder="name@example.com"
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              placeholder="APP-20261105-0042"
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
            />
          </div>

          <button
            type="button"
            className="w-full py-3 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" /> Check Status
          </button>
        </form>
      </div>
    </div>
  );
}
