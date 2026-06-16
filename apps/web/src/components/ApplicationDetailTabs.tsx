"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { Tab, Tabs } from "@mui/material";

interface ApplicationDetailTabsProps {
  details: React.ReactNode;
  activity: React.ReactNode;
  communication: React.ReactNode;
  interviews: React.ReactNode;
  resumes: React.ReactNode;
}

export function ApplicationDetailTabs({
  details,
  activity,
  communication,
  interviews,
  resumes,
}: ApplicationDetailTabsProps) {
  const [tab, setTab] = useState(0);
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));

  function handleTabChange(_e: React.SyntheticEvent, val: number) {
    setTab(val);
    setVisited((prev) => new Set([...prev, val]));
  }

  const panels = [details, activity, communication, interviews, resumes];

  return (
    <Stack spacing={1.5}>
      <Tabs
        value={tab}
        onChange={handleTabChange}
        sx={{ borderBottom: "1px solid", borderColor: "divider" }}
      >
        <Tab label="Details" />
        <Tab label="Activity" />
        <Tab label="Communication" />
        <Tab label="Interviews" />
        <Tab label="Resumes" />
      </Tabs>

      {panels.map((panel, i) =>
        visited.has(i) ? (
          <Box key={i} hidden={tab !== i}>
            {panel}
          </Box>
        ) : null,
      )}
    </Stack>
  );
}
