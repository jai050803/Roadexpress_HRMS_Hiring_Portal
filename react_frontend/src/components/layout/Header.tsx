import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface HeaderProps {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}

export default function Header({ title, breadcrumbs, actions }: HeaderProps) {
  return (
    <div className="border-b border-slate-200/80 bg-white/70 backdrop-blur-xs">
      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1" aria-label="Breadcrumb">
                {breadcrumbs.map((bc, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
                    {bc.href ? (
                      <Link to={bc.href} className="hover:text-slate-700 transition">
                        {bc.label}
                      </Link>
                    ) : (
                      <span className="text-slate-600 font-medium">{bc.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 tracking-tight">
              {title}
            </h1>
          </div>

          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
