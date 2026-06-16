"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { EngagementEventCreateForm } from "./forms/EngagementEventCreateForm";
import { FollowupCreateForm } from "./forms/FollowupCreateForm";
import { FollowupResultCreateForm } from "./forms/FollowupResultCreateForm";
import { InterviewCreateForm } from "./forms/InterviewCreateForm";
import { ReflectionCreateForm } from "./forms/ReflectionCreateForm";

interface InterviewOption {
  id: string;
  roundLabel: string;
  scheduledAtIso: string;
}

interface ApplicationDetailActivityPanelProps {
  application: {
    id: string;
    companyName: string;
    roleTitle: string;
  };
  interviews: InterviewOption[];
  followups: Array<{
    id: string;
    attemptIndex: number;
    sentAtIso: string;
  }>;
  nextFollowupAttemptIndex: number;
}

type ActivityTab = "interview" | "followup" | "followupResult" | "event" | "reflection";

const TABS: Array<{ id: ActivityTab; label: string }> = [
  { id: "interview",      label: "Interview" },
  { id: "followup",       label: "Follow-up" },
  { id: "followupResult", label: "Follow-up Result" },
  { id: "event",          label: "Event" },
  { id: "reflection",     label: "Reflection" },
];

export function ApplicationDetailActivityPanel({
  application,
  interviews,
  followups,
  nextFollowupAttemptIndex,
}: ApplicationDetailActivityPanelProps) {
  const [activeTab, setActiveTab] = useState<ActivityTab>("interview");

  const appOptions = useMemo(
    () => [{ id: application.id, companyName: application.companyName, roleTitle: application.roleTitle }],
    [application.id, application.companyName, application.roleTitle],
  );

  return (
    <Paper sx={{ transition: "box-shadow 220ms ease, transform 220ms ease", "&:hover": { boxShadow: "0 24px 56px rgba(13, 34, 66, 0.15)", transform: "translateY(-2px)" } }}>
      <Stack spacing={2}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="h2">Quick Log</Typography>
          <Typography variant="body2" color="text.secondary">
            Record events for this application without leaving the page.
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }} role="tablist" aria-label="Activity forms">
          {TABS.map((tab) => (
            <Button
              key={tab.id}
              size="small"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              sx={activeTab === tab.id ? {
                border: "1px solid rgba(15,74,134,0.4) !important",
                background: "rgba(15,74,134,0.1) !important",
                color: "primary.main",
              } : {
                border: "1px solid rgba(19,33,48,0.18) !important",
                color: "text.secondary",
              }}
            >
              {tab.label}
            </Button>
          ))}
        </Box>

        {activeTab === "interview" && (
          <InterviewCreateForm applications={appOptions} defaultApplicationId={application.id} hideHeader />
        )}
        {activeTab === "followup" && (
          <FollowupCreateForm applicationId={application.id} defaultAttemptIndex={nextFollowupAttemptIndex} hideHeader />
        )}
        {activeTab === "followupResult" && (
          <FollowupResultCreateForm followups={followups} applicationId={application.id} />
        )}
        {activeTab === "event" && (
          <EngagementEventCreateForm applicationId={application.id} hideHeader />
        )}
        {activeTab === "reflection" && (
          <ReflectionCreateForm interviews={interviews} hideHeader />
        )}
      </Stack>
    </Paper>
  );
}
