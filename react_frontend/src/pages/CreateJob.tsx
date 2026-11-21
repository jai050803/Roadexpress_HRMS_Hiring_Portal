import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Header from "../components/layout/Header";
import CreateJobModal from "../components/jobs/CreateJobModal";
import { JobRole } from "../lib/types";

export default function CreateJobPage() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(true);

  const handleCreated = (job: JobRole) => {
    navigate(`/jobs/${job.id}`);
  };

  const handleClose = () => {
    navigate("/jobs");
  };

  return (
    <AppShell>
      <Header
        title="Create Job Opening"
        breadcrumbs={[
          { label: "Overview", href: "/dashboard" },
          { label: "Job roles", href: "/jobs" },
          { label: "New role" },
        ]}
      />
      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <CreateJobModal
          isOpen={modalOpen}
          onClose={handleClose}
          onCreated={handleCreated}
        />
      </main>
    </AppShell>
  );
}
