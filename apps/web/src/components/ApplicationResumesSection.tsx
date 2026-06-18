"use client";

import { useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Stack, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { ResumeCreateForm } from "@/components/forms/ResumeCreateForm";
import { ApplicationResumeLinksManager } from "@/components/ApplicationResumeLinksManager";

interface ResumeOption {
  id: string;
  name: string;
}

interface LinkedResumeRow {
  resumeId: string;
  name: string;
}

interface ApplicationResumesSectionProps {
  applicationId: string;
  companyName: string;
  roleTitle: string;
  linkedResumes: LinkedResumeRow[];
  allResumes: ResumeOption[];
}

export function ApplicationResumesSection({
  applicationId,
  companyName,
  roleTitle,
  linkedResumes,
  allResumes,
}: ApplicationResumesSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <Paper sx={{ transition: "box-shadow 220ms ease, transform 220ms ease", "&:hover": { boxShadow: "0 24px 56px rgba(13, 34, 66, 0.15)", transform: "translateY(-2px)" } }}>
      <Stack spacing={1.5}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Typography variant="h2">Resumes</Typography>
          <Button onClick={() => setIsAddOpen(true)}>+ Add Resume</Button>
        </Box>

        <ApplicationResumeLinksManager
          key={linkedResumes.map(r => r.resumeId).sort().join(",")}
          applicationId={applicationId}
          linkedResumes={linkedResumes}
          allResumes={allResumes}
        />
      </Stack>

      <Dialog
        open={isAddOpen}
        onClose={(_event, reason) => {
          if (reason === "backdropClick") return;
          setIsAddOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          Add Resume
          <IconButton size="small" aria-label="Close" onClick={() => setIsAddOpen(false)}>
            <CloseIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <ResumeCreateForm
            applications={[]}
            defaultApplication={{ id: applicationId, companyName, roleTitle }}
            hideHeader
            onSaved={() => setIsAddOpen(false)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
