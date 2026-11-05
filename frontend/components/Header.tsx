import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface HeaderProps {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

export default function Header({ title, breadcrumbs, actions }: HeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-[11px] text-slate-400 mb-0.5">
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-300" />}
                {bc.href ? (
                  <Link href={bc.href} className="hover:text-slate-700 transition">
                    {bc.label}
                  </Link>
                ) : (
                  <span className="text-slate-600 font-medium">{bc.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        )}
        <h1 className="text-base font-bold text-slate-900 tracking-tight leading-none">
          {title}
        </h1>
      </div>

      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
