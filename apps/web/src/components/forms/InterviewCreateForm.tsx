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

interface ApplicationOption { id: string; companyName: string; roleTitle: string; }
interface ExistingInterview { applicationId: string; roundIndex: number; }

interface InterviewCreateFormProps {
  applications: ApplicationOption[];
  existingInterviews?: ExistingInterview[];
  defaultApplicationId?: string;
  hideHeader?: boolean;
  onSaved?: () => void;
}

const INTERVIEW_STATUS_OPTIONS = ["scheduled", "completed", "cancelled"] as const;

function toIsoFromDateTime(raw: string): string {
  if (!raw) return new Date().toISOString();
  return new Date(raw).toISOString();
}

export function InterviewCreateForm({ applications, existingInterviews = [], defaultApplicationId, hideHeader, onSaved }: InterviewCreateFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState(defaultApplicationId ?? "");

  function nextRoundIndex(appId: string): number {
    const rounds = existingInterviews.filter(iv => iv.applicationId === appId).map(iv => iv.roundIndex);
    return rounds.length === 0 ? 1 : Math.max(...rounds) + 1;
  }

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
      applicationId: String(data.get("applicationId") ?? ""),
      roundIndex: Number(data.get("roundIndex") ?? 1),
      roundLabel: String(data.get("roundLabel") ?? "").trim(),
      scheduledAt: toIsoFromDateTime(String(data.get("scheduledAt") ?? "")),
      status: String(data.get("status") ?? "scheduled"),
      notes: String(data.get("notes") ?? "").trim() || null,
    };

    try {
      const response = await fetch("/api/interviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to save interview");
      }
      if (!defaultApplicationId) form.reset();
      setSuccess("Interview logged.");
      router.refresh();
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper component="form" onSubmit={handleSubmit}
      sx={{
        transition: "box-shadow 220ms ease, transform 220ms ease",
        "&:hover": { boxShadow: "0 24px 56px rgba(13, 34, 66, 0.15)", transform: "translateY(-2px)" },
      }}
    >
      <Stack spacing={2}>
        {!hideHeader && (
          <Box>
            <Typography variant="h2">Log Interview</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>Track each round and status as events.</Typography>
          </Box>
        )}

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1.5 }}>
          <TextField
            select label="Application" name="applicationId" required size="small" fullWidth
            value={selectedAppId} onChange={e => setSelectedAppId(e.target.value)}
          >
            <MenuItem value="" disabled>Select application</MenuItem>
            {applications.map(a => (
              <MenuItem key={a.id} value={a.id}>{a.companyName} - {a.roleTitle}</MenuItem>
            ))}
          </TextField>

          <TextField
            key={selectedAppId}
            label="Round Index" name="roundIndex" type="number" required size="small" fullWidth
            defaultValue={selectedAppId ? nextRoundIndex(selectedAppId) : 1}
            slotProps={{ htmlInput: { min: 1, max: 20 } }}
          />

          <TextField label="Round Label" name="roundLabel" required size="small" fullWidth
            placeholder="Phone Screen" slotProps={{ htmlInput: { maxLength: 100 } }} />

          <TextField select label="Status" name="status" defaultValue="scheduled" size="small" fullWidth>
            {INTERVIEW_STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{toTitleCaseLabel(s)}</MenuItem>)}
          </TextField>
        </Box>

        <TextField label="Scheduled At" name="scheduledAt" type="datetime-local" required size="small" fullWidth
          defaultValue={nowDateTimeLocalValue()} />

        <TextField multiline rows={3} label="Notes" name="notes" size="small" fullWidth
          placeholder="Meeting link, interviewer name, prep notes…"
          slotProps={{ htmlInput: { maxLength: 4000 } }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button type="submit" disabled={submitting || applications.length === 0}
            endIcon={<SaveIcon sx={{ fontSize: "1rem !important" }} />}>
            {submitting ? "Saving..." : "Save Interview"}
          </Button>
          {applications.length === 0 && <Typography variant="body2" color="error">Create an application first.</Typography>}
          {success && <Typography variant="body2" color="success.main">{success}</Typography>}
          {error && <Typography variant="body2" color="error">{error}</Typography>}
        </Box>
      </Stack>
    </Paper>
  );
}
