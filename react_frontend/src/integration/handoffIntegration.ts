import React, { createContext, useContext } from 'react';

export interface EmployeeDraftPayload {
  candidateId: string;
  applicationId: string;
  personalInfo: {
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
  };
  employmentDetails: {
    jobTitle: string;
    department: string;
    branch?: string;
    offeredSalary?: number;
    hiredDate: string;
  };
  documents?: {
    resumeFilePath?: string;
    resumeOriginalName?: string;
  };
  screeningScore?: number;
}

interface HandoffContextType {
  onCandidateHired: (payload: EmployeeDraftPayload) => void;
  hasHostHandoff: boolean;
}

const HandoffContext = createContext<HandoffContextType>({
  onCandidateHired: () => {},
  hasHostHandoff: false,
});

export interface HandoffProviderProps {
  children: React.ReactNode;
  onCandidateHired?: (payload: EmployeeDraftPayload) => void;
}

export const HandoffProvider: React.FC<HandoffProviderProps> = ({
  children,
  onCandidateHired: hostHandoff,
}) => {
  const handleHandoff = (payload: EmployeeDraftPayload) => {
    if (typeof hostHandoff === 'function') {
      hostHandoff(payload);
    } else {
      console.log('Candidate Hired -> Default Standalone Handoff triggered:', payload);
      alert(`Candidate ${payload.personalInfo.fullName} is ready for employee onboarding in HRMS!`);
    }
  };

  return (
    <HandoffContext.Provider
      value={{
        onCandidateHired: handleHandoff,
        hasHostHandoff: typeof hostHandoff === 'function',
      }}
    >
      {children}
    </HandoffContext.Provider>
  );
};

export const useHandoff = () => useContext(HandoffContext);
