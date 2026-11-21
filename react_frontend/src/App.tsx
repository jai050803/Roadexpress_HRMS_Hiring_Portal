import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './integration/authIntegration';
import { LayoutProvider, useLayoutIntegration } from './integration/layoutIntegration';
import { HandoffProvider, EmployeeDraftPayload } from './integration/handoffIntegration';
import { configureHttp } from './integration/httpIntegration';
import { HRUser } from './lib/types';
import StatusBadge from './components/ui/StatusBadge';
import ScoreIndicator from './components/ui/ScoreIndicator';

export interface HiringPortalProps {
  embedded?: boolean;
  authToken?: string;
  authUser?: HRUser;
  apiBaseUrl?: string;
  onLogout?: () => void;
  onCandidateHired?: (payload: EmployeeDraftPayload) => void;
}

const FoundationPreview: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { embedded } = useLayoutIntegration();

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-brand-500 text-white flex items-center justify-center font-bold text-xl">
              RE
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Road Express Hiring Portal (React Edition)</h1>
              <p className="text-xs text-slate-500">
                Mode: <span className="font-mono font-medium text-brand-600">{embedded ? 'Embedded in HRMS' : 'Standalone'}</span>
              </p>
            </div>
          </div>
          {isAuthenticated && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-600">Logged in as: <strong>{user?.name || user?.email}</strong></span>
              <button
                onClick={logout}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded transition"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wider">
            Prompt 1 Deliverables: Design System & Integration Atoms
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-100 p-4 rounded bg-slate-50/50 space-y-2">
              <span className="text-xs font-medium text-slate-500 block">Status Badges</span>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="published" type="job" />
                <StatusBadge status="draft" type="job" />
                <StatusBadge status="shortlisted" />
                <StatusBadge status="interview_scheduled" />
                <StatusBadge status="hired" />
                <StatusBadge status="rejected" />
              </div>
            </div>

            <div className="border border-slate-100 p-4 rounded bg-slate-50/50 space-y-2">
              <span className="text-xs font-medium text-slate-500 block">AI Score Indicators</span>
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">High (92)</span>
                  <ScoreIndicator score={92} size="sm" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Mid (68)</span>
                  <ScoreIndicator score={68} size="sm" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-1">Large Display</span>
                  <ScoreIndicator score={88} size="lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const HiringPortal: React.FC<HiringPortalProps> = ({
  embedded = false,
  authToken,
  authUser,
  apiBaseUrl = '/api/v1/hiring',
  onLogout,
  onCandidateHired,
}) => {
  useEffect(() => {
    configureHttp({
      baseUrl: apiBaseUrl,
      getToken: () => authToken || localStorage.getItem('roadexpress_hiring_token'),
    });
  }, [apiBaseUrl, authToken]);

  return (
    <AuthProvider hostToken={authToken} hostUser={authUser} onLogout={onLogout}>
      <LayoutProvider embedded={embedded}>
        <HandoffProvider onCandidateHired={onCandidateHired}>
          <Routes>
            <Route path="/" element={<FoundationPreview />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HandoffProvider>
      </LayoutProvider>
    </AuthProvider>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <HiringPortal />
    </BrowserRouter>
  );
}
