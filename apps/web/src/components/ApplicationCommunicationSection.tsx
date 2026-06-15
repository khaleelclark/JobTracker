"use client";

import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { EmailLogCreateForm } from "@/components/forms/EmailLogCreateForm";
import { EmailLogsCrudTable } from "@/components/EmailLogsCrudTable";

interface ApplicationOption {
  id: string;
  companyName: string;
  roleTitle: string;
}

interface CommunicationLogRow {
  id: string;
  applicationId: string | null;
  companyName: string;
  channel: "email" | "linkedin";
  direction: "inbound" | "outbound";
  isHuman: boolean;
  subject: string;
  body: string;
  notes: string | null;
  createdAtIso: string;
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
        <Button onClick={() => setIsFormOpen((current) => !current)}>+ Add Communication</Button>
      </div>

      {isFormOpen ? (
        <Dialog
          open={isFormOpen}
          onClose={(_event, reason) => {
            if (reason === "backdropClick") {
              return;
            }
            setIsFormOpen(false);
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
            Add Communication
            <IconButton
              size="small"
              aria-label="Close add communication dialog"
              title="Close"
              onClick={() => setIsFormOpen(false)}
            >
              <CloseIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <EmailLogCreateForm
              applications={applications}
              defaultApplicationId={defaultApplicationId}
              compact
              hideHeader
              onSaved={() => setIsFormOpen(false)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsFormOpen(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>
      ) : null}

      <EmailLogsCrudTable applications={applications} emails={communicationLogs} />
    </div>
  );
}
