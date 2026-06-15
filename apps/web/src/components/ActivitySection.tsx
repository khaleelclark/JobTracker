"use client";

import { useState } from "react";
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
    <div className="stack-md">
      <div className="card table-shell stack-md">
        <div className="section-head">
          <h2 className="no-margin">Follow-ups</h2>
          <Button onClick={() => setIsFollowupOpen(true)}>+ Add Follow-up</Button>
        </div>
        <FollowupsCrudTable followups={followups} />
      </div>

      <div className="card table-shell stack-md">
        <div className="section-head">
          <h2 className="no-margin">Engagement Events</h2>
          <Button onClick={() => setIsEventOpen(true)}>+ Log Event</Button>
        </div>
        <EngagementEventsCrudTable events={events} />
      </div>

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
    </div>
  );
}
