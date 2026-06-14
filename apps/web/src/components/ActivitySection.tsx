"use client";

import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
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
    <div className="card stack-md">
      <div className="section-head">
        <h2 className="no-margin">Activity</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <IconButton
            size="small"
            aria-label="Add follow-up"
            title="Add follow-up"
            onClick={() => setIsFollowupOpen(true)}
            sx={{
              borderRadius: "999px",
              border: "1px solid rgba(19, 33, 48, 0.18)",
              px: 1.1,
              py: 0.45,
              gap: 0.45,
            }}
          >
            <AddIcon sx={{ fontSize: "1.15rem" }} />
            <span style={{ fontSize: "0.85rem", lineHeight: 1.1 }}>Follow-up</span>
          </IconButton>
          <IconButton
            size="small"
            aria-label="Log event"
            title="Log event"
            onClick={() => setIsEventOpen(true)}
            sx={{
              borderRadius: "999px",
              border: "1px solid rgba(19, 33, 48, 0.18)",
              px: 1.1,
              py: 0.45,
              gap: 0.45,
            }}
          >
            <AddIcon sx={{ fontSize: "1.15rem" }} />
            <span style={{ fontSize: "0.85rem", lineHeight: 1.1 }}>Event</span>
          </IconButton>
        </div>
      </div>

      <div>
        <h3 style={{ marginBottom: "0.5rem" }}>Follow-ups</h3>
        <FollowupsCrudTable followups={followups} />
      </div>

      <div>
        <h3 style={{ marginBottom: "0.5rem" }}>Engagement Events</h3>
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
