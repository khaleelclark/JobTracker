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
import { toTitleCaseLabel } from "@/lib/format";

interface FollowupOption { id: string; attemptIndex: number; sentAtIso: string; }

interface FollowupResultCreateFormProps {
  followups: FollowupOption[];
  applicationId: string;
}

const RESULT_STATUS_OPTIONS = ["pending", "resolved", "expired_no_response"] as const;
const RESPONSE_TYPE_OPTIONS = ["human_reply", "rejection_reply", "screen_scheduled", "interview_scheduled"] as const;

function toIsoFromDate(raw: string): string | null {
  if (!raw) return null;
  return new Date(`${raw}T12:00:00`).toISOString();
}

function notifyRejectedStatus(applicationId: string) {
  window.dispatchEvent(new CustomEvent("application-status-updated", { detail: { applicationId, status: "rejected" } }));
}

export function FollowupResultCreateForm({ followups, applicationId }: FollowupResultCreateFormProps) {
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
      followupAttemptId: String(data.get("followupAttemptId") ?? ""),
      resultStatus: String(data.get("resultStatus") ?? "pending"),
      responseType: String(data.get("responseType") ?? "").trim() || null,
      resolvedAt: toIsoFromDate(String(data.get("resolvedAt") ?? "")),
    };

    try {
      const response = await fetch("/api/followup-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to save follow-up result");
      }
      form.reset();
      setSuccess("Follow-up result saved.");
      if (payload.responseType === "rejection_reply") notifyRejectedStatus(applicationId);
      else router.refresh();
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
        <Typography variant="h3">Log Follow-up Result</Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1.5 }}>
          <TextField select label="Follow-up Attempt" name="followupAttemptId" required size="small" fullWidth defaultValue="">
            <MenuItem value="" disabled>Select follow-up</MenuItem>
            {followups.map(f => (
              <MenuItem key={f.id} value={f.id}>
                Attempt {f.attemptIndex} — {new Date(f.sentAtIso).toLocaleDateString()}
              </MenuItem>
            ))}
          </TextField>

          <TextField select label="Result Status" name="resultStatus" defaultValue="pending" size="small" fullWidth>
            {RESULT_STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{toTitleCaseLabel(s)}</MenuItem>)}
          </TextField>

          <TextField select label="Response Type" name="responseType" defaultValue="" size="small" fullWidth>
            <MenuItem value="">None</MenuItem>
            {RESPONSE_TYPE_OPTIONS.map(t => <MenuItem key={t} value={t}>{toTitleCaseLabel(t)}</MenuItem>)}
          </TextField>

          <TextField label="Resolved Date" name="resolvedAt" type="date" size="small" fullWidth />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button type="submit" disabled={submitting || followups.length === 0}
            endIcon={<SaveIcon sx={{ fontSize: "1rem !important" }} />}>
            {submitting ? "Saving..." : "Save"}
          </Button>
          {followups.length === 0 && <Typography variant="body2" color="error">No follow-up attempts available.</Typography>}
          {success && <Typography variant="body2" color="success.main">{success}</Typography>}
          {error && <Typography variant="body2" color="error">{error}</Typography>}
        </Box>
      </Stack>
    </Paper>
  );
}
