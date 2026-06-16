"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
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
    <Paper sx={{ transition: "box-shadow 220ms ease, transform 220ms ease", "&:hover": { boxShadow: "0 24px 56px rgba(13, 34, 66, 0.15)", transform: "translateY(-2px)" } }}>
      <Stack spacing={1.5}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography variant="h2">Recent Communication</Typography>
        <Button onClick={() => setIsFormOpen((current) => !current)}>+ Add Communication</Button>
      </Box>

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
      </Stack>
    </Paper>
  );
}
