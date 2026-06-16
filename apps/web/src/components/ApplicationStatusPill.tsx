"use client";

import { useEffect, useState } from "react";
import Chip from "@mui/material/Chip";
import { toTitleCaseLabel } from "@/lib/format";

interface ApplicationStatusPillProps {
  applicationId: string;
  initialStatus: string;
}

interface ApplicationStatusUpdatedDetail {
  applicationId: string;
  status: string;
}

const STATUS_SX: Record<string, { bgcolor: string; color: string }> = {
  applied:      { bgcolor: "rgba(15, 118, 110, 0.14)", color: "#0f766e" },
  under_review: { bgcolor: "rgba(217, 119, 6, 0.16)",  color: "#92400e" },
  interviewing: { bgcolor: "rgba(14, 116, 144, 0.14)", color: "#0e7490" },
  offered:      { bgcolor: "rgba(16, 185, 129, 0.16)", color: "#047857" },
  rejected:     { bgcolor: "rgba(220, 38, 38, 0.14)",  color: "#b91c1c" },
  withdrawn:    { bgcolor: "rgba(107, 114, 128, 0.18)", color: "#374151" },
  archived:     { bgcolor: "rgba(100, 116, 139, 0.18)", color: "#334155" },
};

export { STATUS_SX };

export function ApplicationStatusPill({ applicationId, initialStatus }: ApplicationStatusPillProps) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => { setStatus(initialStatus); }, [initialStatus]);

  useEffect(() => {
    function onStatusUpdated(event: Event) {
      const e = event as CustomEvent<ApplicationStatusUpdatedDetail>;
      if (!e.detail || e.detail.applicationId !== applicationId) return;
      if (typeof e.detail.status === "string" && e.detail.status.trim()) setStatus(e.detail.status);
    }
    window.addEventListener("application-status-updated", onStatusUpdated as EventListener);
    return () => window.removeEventListener("application-status-updated", onStatusUpdated as EventListener);
  }, [applicationId]);

  const colors = STATUS_SX[status] ?? { bgcolor: "rgba(19,33,48,0.1)", color: "#132130" };

  return (
    <Chip
      label={toTitleCaseLabel(status)}
      size="small"
      sx={{ ...colors, border: "none", fontSize: "0.75rem", fontWeight: 500, height: "auto", py: "0.23rem" }}
    />
  );
}
