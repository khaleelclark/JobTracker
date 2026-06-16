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

interface InterviewOption { id: string; roundLabel: string; scheduledAtIso: string; }

interface ReflectionCreateFormProps {
  interviews: InterviewOption[];
  defaultInterviewId?: string;
  hideHeader?: boolean;
  onSaved?: () => void;
}

export function ReflectionCreateForm({ interviews, defaultInterviewId, hideHeader, onSaved }: ReflectionCreateFormProps) {
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
      interviewId: String(data.get("interviewId") ?? ""),
      outcome: String(data.get("outcome") ?? "pending"),
      summary: String(data.get("summary") ?? "").trim(),
    };

    try {
      const response = await fetch("/api/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to save reflection");
      }
      form.reset();
      setSuccess("Reflection saved.");
      onSaved?.();
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
        {!hideHeader && <Typography variant="h3">Log Reflection</Typography>}

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1.5 }}>
          <TextField select label="Interview" name="interviewId" required size="small" fullWidth
            defaultValue={defaultInterviewId ?? ""}>
            {!defaultInterviewId && <MenuItem value="" disabled>Select interview</MenuItem>}
            {interviews.map(iv => (
              <MenuItem key={iv.id} value={iv.id}>
                {iv.roundLabel} — {new Date(iv.scheduledAtIso).toLocaleDateString()}
              </MenuItem>
            ))}
          </TextField>

          <TextField select label="Outcome" name="outcome" defaultValue="pending" size="small" fullWidth>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="advanced">Advanced</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </TextField>
        </Box>

        <TextField multiline rows={4} label="Summary" name="summary" required size="small" fullWidth
          placeholder="What happened in this round?"
          slotProps={{ htmlInput: { maxLength: 5000 } }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button type="submit" disabled={submitting || interviews.length === 0}
            endIcon={<SaveIcon sx={{ fontSize: "1rem !important" }} />}>
            {submitting ? "Saving..." : "Save"}
          </Button>
          {interviews.length === 0 && <Typography variant="body2" color="error">No interviews available.</Typography>}
          {success && <Typography variant="body2" color="success.main">{success}</Typography>}
          {error && <Typography variant="body2" color="error">{error}</Typography>}
        </Box>
      </Stack>
    </Paper>
  );
}
