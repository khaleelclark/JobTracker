"use client";

import { useEffect, useState } from "react";
import { toTitleCaseLabel } from "@/lib/format";

interface ApplicationStatusPillProps {
  applicationId: string;
  initialStatus: string;
}

interface ApplicationStatusUpdatedDetail {
  applicationId: string;
  status: string;
}

export function ApplicationStatusPill({ applicationId, initialStatus }: ApplicationStatusPillProps) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    function onStatusUpdated(event: Event) {
      const customEvent = event as CustomEvent<ApplicationStatusUpdatedDetail>;
      if (!customEvent.detail || customEvent.detail.applicationId !== applicationId) {
        return;
      }

      if (typeof customEvent.detail.status === "string" && customEvent.detail.status.trim().length > 0) {
        setStatus(customEvent.detail.status);
      }
    }

    window.addEventListener("application-status-updated", onStatusUpdated as EventListener);
    return () => {
      window.removeEventListener("application-status-updated", onStatusUpdated as EventListener);
    };
  }, [applicationId]);

  return (
    <span className={`pill status-${status}`}>
      {toTitleCaseLabel(status)}
    </span>
  );
}
