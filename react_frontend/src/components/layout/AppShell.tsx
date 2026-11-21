import React, { useState } from "react";
import TopNav from "./TopNav";
import CommandPalette from "./CommandPalette";
import { useLayoutIntegration } from "../../integration/layoutIntegration";

export interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [cmdOpen, setCmdOpen] = useState(false);
  const { embedded } = useLayoutIntegration();

  return (
    <div className="min-h-screen bg-slate-50/60 antialiased font-sans text-slate-900 flex flex-col">
      {!embedded && <TopNav onOpenCommand={() => setCmdOpen(true)} />}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {children}
      </div>
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
