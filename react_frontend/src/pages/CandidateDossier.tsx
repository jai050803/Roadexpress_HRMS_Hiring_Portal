import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Header from "../components/layout/Header";
import CandidateProfileDrawer from "../components/candidates/CandidateProfileDrawer";

export default function CandidateDossier() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    navigate(-1);
  };

  return (
    <AppShell>
      <Header
        title="Candidate Dossier"
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Candidates", href: "/candidates" },
          { label: "Dossier" },
        ]}
      />
      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <CandidateProfileDrawer
          applicationId={id}
          isOpen={isOpen}
          onClose={handleClose}
          onStatusUpdated={() => {}}
        />
      </main>
    </AppShell>
  );
}
