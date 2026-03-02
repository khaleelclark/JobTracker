"use client";

import { useMemo, useState } from "react";
import { EmailLogCreateForm } from "./forms/EmailLogCreateForm";
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

type ActivityTab = "interview" | "email" | "followup" | "followupResult" | "event" | "reflection";

const TABS: Array<{ id: ActivityTab; label: string }> = [
  { id: "interview", label: "Interview" },
  { id: "email", label: "Communication" },
  { id: "followup", label: "Follow-up" },
  { id: "followupResult", label: "Follow-up Result" },
  { id: "event", label: "Event" },
  { id: "reflection", label: "Reflection" },
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
    <section className="card stack-lg">
      <div className="section-head">
        <h2 className="no-margin">Quick Log</h2>
        <span className="muted">Record events for this application without leaving the page.</span>
      </div>

      <div className="tab-row" role="tablist" aria-label="Activity forms">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "interview" ? (
        <InterviewCreateForm applications={appOptions} defaultApplicationId={application.id} />
      ) : null}

      {activeTab === "email" ? (
        <EmailLogCreateForm applications={appOptions} defaultApplicationId={application.id} />
      ) : null}

      {activeTab === "followup" ? (
        <FollowupCreateForm applicationId={application.id} defaultAttemptIndex={nextFollowupAttemptIndex} />
      ) : null}

      {activeTab === "followupResult" ? <FollowupResultCreateForm followups={followups} /> : null}

      {activeTab === "event" ? <EngagementEventCreateForm applicationId={application.id} /> : null}

      {activeTab === "reflection" ? <ReflectionCreateForm interviews={interviews} /> : null}
    </section>
  );
}
