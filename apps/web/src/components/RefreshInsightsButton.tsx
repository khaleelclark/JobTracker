"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefreshInsightsButton() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function onRefresh() {
    setRunning(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/worker/refresh?force=1", { method: "POST" });
      if (!response.ok) {
        setStatusMessage(`Refresh failed (${response.status})`);
        return;
      }

      const payload = (await response.json()) as {
        result?: { created?: number; skippedReason?: string };
      };
      const created = payload?.result?.created ?? 0;
      const skippedReason = payload?.result?.skippedReason;

      if (created > 0) {
        setStatusMessage(`Created ${created} card${created === 1 ? "" : "s"}.`);
      } else if (skippedReason) {
        setStatusMessage(`No new cards (${skippedReason}).`);
      } else {
        setStatusMessage("No new cards.");
      }
    } catch {
      setStatusMessage("Refresh failed (network error).");
    } finally {
      setRunning(false);
      router.refresh();
    }
  }

  return (
    <div className="stack-sm">
      <button type="button" disabled={running} onClick={onRefresh}>
        {running ? "Refreshing..." : "Refresh Insights"}
      </button>
      {statusMessage ? <p className="muted">{statusMessage}</p> : null}
    </div>
  );
}
