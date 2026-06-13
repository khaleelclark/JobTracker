"use client";

import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { InterviewCreateForm } from "@/components/forms/InterviewCreateForm";
import { InterviewsCrudTable, type InterviewRow } from "@/components/InterviewsCrudTable";

interface ApplicationOption {
  id: string;
  companyName: string;
  roleTitle: string;
}

interface InterviewsSectionProps {
  applications: ApplicationOption[];
  interviews: InterviewRow[];
  defaultApplicationId?: string;
}

export function InterviewsSection({ applications, interviews, defaultApplicationId }: InterviewsSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);

  return (
    <div className="card table-shell stack-md">
      <div className="section-head">
        <h2 className="no-margin">Interview Log</h2>
        <IconButton
          size="small"
          aria-label="Add interview"
          title="Add interview"
          onClick={() => setIsFormOpen((v) => !v)}
          sx={{
            borderRadius: "999px",
            border: "1px solid rgba(19, 33, 48, 0.18)",
            px: 1.1,
            py: 0.45,
            gap: 0.45,
          }}
        >
          <AddIcon sx={{ fontSize: "1.15rem" }} />
          <span style={{ fontSize: "0.85rem", lineHeight: 1.1 }}>Add Interview</span>
        </IconButton>
      </div>

      <Dialog
        open={isFormOpen}
        onClose={(_event, reason) => {
          if (reason === "backdropClick") return;
          setIsFormOpen(false);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          Log Interview
          <IconButton size="small" aria-label="Close" onClick={() => setIsFormOpen(false)}>
            <CloseIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <InterviewCreateForm
            applications={applications}
            defaultApplicationId={defaultApplicationId}
            hideHeader
            onSaved={() => setIsFormOpen(false)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsFormOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <InterviewsCrudTable interviews={interviews} applications={applications} />
    </div>
  );
}
