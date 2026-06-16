"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { FollowupCreateForm } from "@/components/forms/FollowupCreateForm";
import { EngagementEventCreateForm } from "@/components/forms/EngagementEventCreateForm";
import { FollowupsCrudTable } from "@/components/FollowupsCrudTable";
import { EngagementEventsCrudTable } from "@/components/EngagementEventsCrudTable";
import type { FollowupRow } from "@/components/FollowupsCrudTable";
import type { EventRow } from "@/components/EngagementEventsCrudTable";

interface ActivitySectionProps {
  applicationId: string;
  followups: FollowupRow[];
  events: EventRow[];
  nextFollowupAttemptIndex: number;
}

export function ActivitySection({ applicationId, followups, events, nextFollowupAttemptIndex }: ActivitySectionProps) {
  const [isFollowupOpen, setIsFollowupOpen] = useState(false);
  const [isEventOpen, setIsEventOpen] = useState(false);

  return (
    <Stack spacing={1.5}>
      <Paper sx={{ transition: "box-shadow 220ms ease, transform 220ms ease", "&:hover": { boxShadow: "0 24px 56px rgba(13, 34, 66, 0.15)", transform: "translateY(-2px)" } }}>
        <Stack spacing={1.5}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Typography variant="h2">Follow-ups</Typography>
            <Button onClick={() => setIsFollowupOpen(true)}>+ Add Follow-up</Button>
          </Box>
          <FollowupsCrudTable followups={followups} />
        </Stack>
      </Paper>

      <Paper sx={{ transition: "box-shadow 220ms ease, transform 220ms ease", "&:hover": { boxShadow: "0 24px 56px rgba(13, 34, 66, 0.15)", transform: "translateY(-2px)" } }}>
        <Stack spacing={1.5}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
            <Typography variant="h2">Engagement Events</Typography>
            <Button onClick={() => setIsEventOpen(true)}>+ Log Event</Button>
          </Box>
          <EngagementEventsCrudTable events={events} />
        </Stack>
      </Paper>

      <Dialog
        open={isFollowupOpen}
        onClose={(_event, reason) => {
          if (reason === "backdropClick") return;
          setIsFollowupOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          Log Follow-up
          <IconButton size="small" aria-label="Close" onClick={() => setIsFollowupOpen(false)}>
            <CloseIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <FollowupCreateForm
            applicationId={applicationId}
            defaultAttemptIndex={nextFollowupAttemptIndex}
            hideHeader
            onSaved={() => setIsFollowupOpen(false)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsFollowupOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isEventOpen}
        onClose={(_event, reason) => {
          if (reason === "backdropClick") return;
          setIsEventOpen(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          Log Engagement Event
          <IconButton size="small" aria-label="Close" onClick={() => setIsEventOpen(false)}>
            <CloseIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <EngagementEventCreateForm
            applicationId={applicationId}
            hideHeader
            onSaved={() => setIsEventOpen(false)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEventOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
