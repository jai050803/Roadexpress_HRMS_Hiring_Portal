import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './integration/authIntegration';
import { LayoutProvider } from './integration/layoutIntegration';
import { HandoffProvider, EmployeeDraftPayload } from './integration/handoffIntegration';
import { configureHttp } from './integration/httpIntegration';
import { HRUser } from './lib/types';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import CreateJobPage from './pages/CreateJob';
import JobDetail from './pages/JobDetail';
import Candidates from './pages/Candidates';
import CandidateDossier from './pages/CandidateDossier';
import UploadResume from './pages/UploadResume';
import Pipeline from './pages/Pipeline';
import Interviews from './pages/Interviews';
import CVBank from './pages/CVBank';
import LoginPage from './pages/Login';
import AppShell from './components/layout/AppShell';
import Header from './components/layout/Header';

export interface HiringPortalProps {
  embedded?: boolean;
  authToken?: string;
  authUser?: HRUser;
  apiBaseUrl?: string;
  onLogout?: () => void;
  onCandidateHired?: (payload: EmployeeDraftPayload) => void;
}

const PlaceholderPage: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <AppShell>
    <Header title={title} breadcrumbs={[{ label: "Overview", href: "/dashboard" }, { label: title }]} />
    <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-lg border border-slate-200 p-8 text-center space-y-3 shadow-2xs">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">{subtitle}</p>
      </div>
    </main>
  </AppShell>
);

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
      onUnauthorized: () => {
        if (!embedded && !window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      },
    });
  }, [apiBaseUrl, authToken, embedded]);

  return (
    <AuthProvider hostToken={authToken} hostUser={authUser} onLogout={onLogout}>
      <LayoutProvider embedded={embedded}>
        <HandoffProvider onCandidateHired={onCandidateHired}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/jobs/new" element={<CreateJobPage />} />
            <Route path="/jobs/create" element={<Navigate to="/jobs/new" replace />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/pipeline/:jobId" element={<Pipeline />} />
            <Route path="/candidates" element={<Candidates />} />
            <Route path="/candidates/:id" element={<CandidateDossier />} />
            <Route path="/upload-cv" element={<UploadResume />} />
            <Route path="/interviews" element={<Interviews />} />
            <Route path="/cv-bank" element={<CVBank />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
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
