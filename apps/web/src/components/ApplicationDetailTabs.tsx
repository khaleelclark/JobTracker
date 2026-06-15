"use client";

import { useState } from "react";
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

  return (
    <div className="stack-md">
      <Tabs
        value={tab}
        onChange={(_e, val: number) => setTab(val)}
        sx={{ borderBottom: "1px solid var(--line)" }}
      >
        <Tab label="Details" />
        <Tab label="Activity" />
        <Tab label="Communication" />
        <Tab label="Interviews" />
        <Tab label="Resumes" />
      </Tabs>

      <div hidden={tab !== 0}>{details}</div>
      <div hidden={tab !== 1}>{activity}</div>
      <div hidden={tab !== 2}>{communication}</div>
      <div hidden={tab !== 3}>{interviews}</div>
      <div hidden={tab !== 4}>{resumes}</div>
    </div>
  );
}
