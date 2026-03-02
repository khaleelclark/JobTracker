"use client";

import { useState } from "react";
import { IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { EmailLogCreateForm } from "@/components/forms/EmailLogCreateForm";
import { EmailLogsCrudTable } from "@/components/EmailLogsCrudTable";

interface ApplicationOption {
  id: string;
  companyName: string;
  roleTitle: string;
}

interface CommunicationLogRow {
  id: string;
  applicationId: string;
  channel: "email" | "linkedin";
  direction: "inbound" | "outbound";
  isHuman: boolean;
  subject: string;
  body: string;
  notes: string | null;
  createdAtIso: string;
  applicationCompanyName: string;
}

interface ApplicationCommunicationSectionProps {
  applications: ApplicationOption[];
  defaultApplicationId: string;
  communicationLogs: CommunicationLogRow[];
}

export function ApplicationCommunicationSection({
  applications,
  defaultApplicationId,
  communicationLogs,
}: ApplicationCommunicationSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="card table-shell stack-md">
      <div className="section-head">
        <h2 className="no-margin">Recent Communication</h2>
        <IconButton
          size="small"
          aria-label="Add communication log"
          title="Add communication log"
          onClick={() => setIsFormOpen((current) => !current)}
          sx={{
            borderRadius: "999px",
            border: "1px solid rgba(19, 33, 48, 0.18)",
            px: 1.1,
            py: 0.45,
            gap: 0.45,
          }}
        >
          <AddIcon sx={{ fontSize: "1.15rem" }} />
          <span style={{ fontSize: "0.85rem", lineHeight: 1.1 }}>Add Communication</span>
        </IconButton>
      </div>

      {isFormOpen ? (
        <EmailLogCreateForm
          applications={applications}
          defaultApplicationId={defaultApplicationId}
          compact
          hideHeader
          onSaved={() => setIsFormOpen(false)}
        />
      ) : null}

      <EmailLogsCrudTable applications={applications} emails={communicationLogs} />
    </div>
  );
}
