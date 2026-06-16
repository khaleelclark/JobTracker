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
import { toTitleCaseLabel, todayDateInputValue } from "@/lib/format";

interface FollowupCreateFormProps {
  applicationId: string;
  defaultAttemptIndex: number;
  hideHeader?: boolean;
  onSaved?: () => void;
}

const FOLLOWUP_CHANNEL_OPTIONS = ["email", "linkedin", "portal", "other"] as const;

function toIsoFromDate(raw: string): string {
  if (!raw) return new Date().toISOString();
  return new Date(`${raw}T12:00:00`).toISOString();
}

export function FollowupCreateForm({ applicationId, defaultAttemptIndex, hideHeader, onSaved }: FollowupCreateFormProps) {
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
      attemptIndex: Number(data.get("attemptIndex") ?? defaultAttemptIndex),
      channel: String(data.get("channel") ?? "email"),
      sentAt: toIsoFromDate(String(data.get("sentAt") ?? "")),
    };

    try {
      const response = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to log follow-up");
      }
      const attemptField = form.elements.namedItem("attemptIndex") as HTMLInputElement | null;
      if (attemptField) attemptField.value = String(payload.attemptIndex + 1);
      setSuccess("Follow-up logged.");
      router.refresh();
      onSaved?.();
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
        {!hideHeader && <Typography variant="h3">Log Follow-up</Typography>}

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1.5 }}>
          <TextField label="Attempt Index" name="attemptIndex" type="number" required size="small" fullWidth
            defaultValue={defaultAttemptIndex} slotProps={{ htmlInput: { min: 1, max: 20 } }} />
          <TextField select label="Channel" name="channel" defaultValue="email" size="small" fullWidth>
            {FOLLOWUP_CHANNEL_OPTIONS.map(c => <MenuItem key={c} value={c}>{toTitleCaseLabel(c)}</MenuItem>)}
          </TextField>
        </Box>

        <TextField label="Sent Date" name="sentAt" type="date" size="small" fullWidth
          defaultValue={todayDateInputValue()} />

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
