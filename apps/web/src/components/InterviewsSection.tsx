"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from "@mui/material";
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
    <Paper sx={{ transition: "box-shadow 220ms ease, transform 220ms ease", "&:hover": { boxShadow: "0 24px 56px rgba(13, 34, 66, 0.15)", transform: "translateY(-2px)" } }}>
      <Stack spacing={1.5}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="h2">Interview Log</Typography>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Button onClick={() => setIsAddOpen(true)}>+ Add Interview</Button>
          {reflectionOptions.length > 0 && (
            <Button onClick={() => setIsReflectionOpen(true)}>+ Log Reflection</Button>
          )}
        </Box>
      </Box>

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
            existingInterviews={interviews.map((iv) => ({ applicationId: iv.applicationId, roundIndex: iv.roundIndex }))}
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
      </Stack>
    </Paper>
  );
}
