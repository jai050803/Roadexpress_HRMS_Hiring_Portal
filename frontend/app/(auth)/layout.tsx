import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
