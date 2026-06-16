"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SaveIcon from "@mui/icons-material/Save";
import { toTitleCaseLabel, nowDateTimeLocalValue } from "@/lib/format";

interface EngagementEventCreateFormProps {
  applicationId: string;
  hideHeader?: boolean;
  onSaved?: () => void;
}

const EVENT_TYPE_OPTIONS = [
  "recruiter_reply", "offer", "rejection_automated", "rejection_human",
] as const;

function isRejectionEventType(eventType: string): boolean {
  return eventType === "rejection_automated" || eventType === "rejection_human" || eventType === "rejection";
}

function toIsoFromDateTime(raw: string): string {
  if (!raw) return new Date().toISOString();
  return new Date(raw).toISOString();
}

function notifyRejectedStatus(applicationId: string) {
  window.dispatchEvent(new CustomEvent("application-status-updated", { detail: { applicationId, status: "rejected" } }));
}

export function EngagementEventCreateForm({ applicationId, hideHeader, onSaved }: EngagementEventCreateFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!success && !error) return;
    const id = window.setTimeout(() => { setSuccess(null); setError(null); }, 3000);
    return () => window.clearTimeout(id);
  }, [success, error]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      applicationId,
      eventType: String(data.get("eventType") ?? "recruiter_reply"),
      occurredAt: toIsoFromDateTime(String(data.get("occurredAt") ?? "")),
    };

    try {
      const response = await fetch("/api/engagement-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to log engagement event");
      }
      form.reset();
      setSuccess("Engagement event logged.");
      onSaved?.();
      if (isRejectionEventType(payload.eventType)) notifyRejectedStatus(applicationId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper component="form" onSubmit={handleSubmit} elevation={0}
      sx={{ border: "1px solid", borderColor: "divider", boxShadow: "none" }}>
      <Stack spacing={2}>
        {!hideHeader && <Typography variant="h3">Log Engagement Event</Typography>}

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1.5 }}>
          <TextField select label="Event Type" name="eventType" defaultValue="recruiter_reply" size="small" fullWidth>
            {EVENT_TYPE_OPTIONS.map(t => <MenuItem key={t} value={t}>{toTitleCaseLabel(t)}</MenuItem>)}
          </TextField>
          <TextField label="Occurred At" name="occurredAt" type="datetime-local" size="small" fullWidth
            defaultValue={nowDateTimeLocalValue()} />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button type="submit" disabled={submitting} endIcon={<SaveIcon sx={{ fontSize: "1rem !important" }} />}>
            {submitting ? "Saving..." : "Save"}
          </Button>
          {success && <Typography variant="body2" color="success.main">{success}</Typography>}
          {error && <Typography variant="body2" color="error">{error}</Typography>}
        </Box>
      </Stack>
    </Paper>
  );
}
