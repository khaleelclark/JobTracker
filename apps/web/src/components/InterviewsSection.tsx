"use client";

import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { InterviewCreateForm } from "@/components/forms/InterviewCreateForm";
import { ReflectionCreateForm } from "@/components/forms/ReflectionCreateForm";
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
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isReflectionOpen, setIsReflectionOpen] = useState(false);

  const reflectionOptions = interviews.map((iv) => ({
    id: iv.id,
    roundLabel: iv.roundLabel,
    scheduledAtIso: iv.scheduledAtIso,
  }));

  return (
    <div className="card table-shell stack-md">
      <div className="section-head">
        <h2 className="no-margin">Interview Log</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <IconButton
            size="small"
            aria-label="Add interview"
            title="Add interview"
            onClick={() => setIsAddOpen(true)}
            sx={{ borderRadius: "999px", border: "1px solid rgba(19, 33, 48, 0.18)", px: 1.1, py: 0.45, gap: 0.45 }}
          >
            <AddIcon sx={{ fontSize: "1.15rem" }} />
            <span style={{ fontSize: "0.85rem", lineHeight: 1.1 }}>Add Interview</span>
          </IconButton>
          {reflectionOptions.length > 0 && (
            <IconButton
              size="small"
              aria-label="Log reflection"
              title="Log reflection"
              onClick={() => setIsReflectionOpen(true)}
              sx={{ borderRadius: "999px", border: "1px solid rgba(19, 33, 48, 0.18)", px: 1.1, py: 0.45, gap: 0.45 }}
            >
              <AddIcon sx={{ fontSize: "1.15rem" }} />
              <span style={{ fontSize: "0.85rem", lineHeight: 1.1 }}>Log Reflection</span>
            </IconButton>
          )}
        </div>
      </div>

      <Dialog
        open={isAddOpen}
        onClose={(_event, reason) => {
          if (reason === "backdropClick") return;
          setIsAddOpen(false);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          Log Interview
          <IconButton size="small" aria-label="Close" onClick={() => setIsAddOpen(false)}>
            <CloseIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <InterviewCreateForm
            applications={applications}
            defaultApplicationId={defaultApplicationId}
            hideHeader
            onSaved={() => setIsAddOpen(false)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isReflectionOpen}
        onClose={(_event, reason) => {
          if (reason === "backdropClick") return;
          setIsReflectionOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          Log Reflection
          <IconButton size="small" aria-label="Close" onClick={() => setIsReflectionOpen(false)}>
            <CloseIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <ReflectionCreateForm
            interviews={reflectionOptions}
            hideHeader
            onSaved={() => setIsReflectionOpen(false)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsReflectionOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <InterviewsCrudTable interviews={interviews} applications={applications} />
    </div>
  );
}
