"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SaveIcon from "@mui/icons-material/Save";
import { toTitleCaseLabel } from "@/lib/format";

interface ApplicationOption { id: string; companyName: string; roleTitle: string; }

interface EmailLogCreateFormProps {
  applications: ApplicationOption[];
  defaultApplicationId?: string;
  compact?: boolean;
  hideHeader?: boolean;
  onSaved?: () => void;
}

const COMMUNICATION_CHANNEL_OPTIONS = ["email", "linkedin"] as const;
const EMAIL_DIRECTION_OPTIONS = ["inbound", "outbound"] as const;

function boolFromCheckbox(value: FormDataEntryValue | null): boolean { return value === "on"; }
function nullableTrimmedText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}
function resolveApiErrorMessage(errorBody: unknown, fallback: string): string {
  if (!errorBody || typeof errorBody !== "object") return fallback;
  const body = errorBody as { error?: unknown };
  if (typeof body.error === "string" && body.error.trim()) return body.error;
  if (body.error && typeof body.error === "object") {
    const c = body.error as { formErrors?: unknown; fieldErrors?: unknown };
    if (Array.isArray(c.formErrors) && typeof c.formErrors[0] === "string") return c.formErrors[0];
    if (c.fieldErrors && typeof c.fieldErrors === "object") {
      for (const list of Object.values(c.fieldErrors as Record<string, unknown>)) {
        if (Array.isArray(list) && typeof list[0] === "string") return list[0];
      }
    }
  }
  return fallback;
}

export function EmailLogCreateForm({ applications, defaultApplicationId, compact = false, hideHeader = false, onSaved }: EmailLogCreateFormProps) {
  const router = useRouter();
  const [targetMode, setTargetMode] = useState<"application" | "applications" | "company">("application");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const companyOptions = Array.from(new Set(applications.map(a => a.companyName))).sort((a, b) => a.localeCompare(b));

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
    const selectedApplicationIds = data.getAll("applicationIds").map(v => String(v).trim()).filter(v => v.length > 0);

    const createdAtRaw = String(data.get("createdAt") ?? "").trim();
    const payload: Record<string, unknown> = {
      channel: String(data.get("channel") ?? "email"),
      direction: String(data.get("direction") ?? "inbound"),
      isHuman: boolFromCheckbox(data.get("isHuman")),
      subject: String(data.get("subject") ?? "").trim(),
      body: String(data.get("body") ?? "").trim(),
      notes: nullableTrimmedText(data.get("notes")),
      ...(createdAtRaw ? { createdAt: new Date(createdAtRaw).toISOString() } : {}),
    };
    if (targetMode === "application") payload.applicationId = String(data.get("applicationId") ?? "").trim();
    else if (targetMode === "applications") payload.applicationIds = selectedApplicationIds;
    else payload.companyName = String(data.get("companyName") ?? "").trim();

    try {
      const response = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(resolveApiErrorMessage(body, "Unable to save communication log"));
      }
      if (!defaultApplicationId) {
        form.reset();
        setTargetMode("application");
      } else {
        setTargetMode("application");
        const appField = form.elements.namedItem("applicationId") as HTMLSelectElement | null;
        if (appField) appField.value = defaultApplicationId;
      }
      setSuccess("Communication log saved.");
      onSaved?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  const paperSx = compact
    ? { border: "1px solid", borderColor: "divider", boxShadow: "none" }
    : {
        transition: "box-shadow 220ms ease, transform 220ms ease",
        "&:hover": { boxShadow: "0 24px 56px rgba(13, 34, 66, 0.15)", transform: "translateY(-2px)" },
      };

  return (
    <Paper component="form" onSubmit={handleSubmit} sx={paperSx}>
      <Stack spacing={2}>
        {!hideHeader && (
          <Box>
            <Typography variant="h2">Log Communication</Typography>
            <Typography variant="body2" color="text.secondary" mt={0.5}>
              Store inbound or outbound communication records, including LinkedIn messages.
            </Typography>
          </Box>
        )}

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1.5 }}>
          <TextField
            select label="Link To" size="small" fullWidth
            value={targetMode} onChange={e => setTargetMode(e.target.value as typeof targetMode)}
          >
            <MenuItem value="application">Single Application</MenuItem>
            <MenuItem value="applications">Multiple Applications</MenuItem>
            <MenuItem value="company">Company</MenuItem>
          </TextField>

          {targetMode === "application" && (
            <TextField select label="Application" name="applicationId" required size="small" fullWidth
              defaultValue={defaultApplicationId ?? ""}>
              <MenuItem value="" disabled>Select application</MenuItem>
              {applications.map(a => (
                <MenuItem key={a.id} value={a.id}>{a.companyName} - {a.roleTitle}</MenuItem>
              ))}
            </TextField>
          )}

          {targetMode === "applications" && (
            <TextField
              label="Applications" name="applicationIds" required size="small" fullWidth
              select
              SelectProps={{ native: true, multiple: true } as object}
              defaultValue={[]}
              sx={{ "& select": { minHeight: "7.25rem" } }}
            >
              {applications.map(a => (
                <option key={a.id} value={a.id}>{a.companyName} - {a.roleTitle}</option>
              ))}
            </TextField>
          )}

          {targetMode === "company" && (
            <TextField select label="Company" name="companyName" required size="small" fullWidth defaultValue="">
              <MenuItem value="" disabled>Select company</MenuItem>
              {companyOptions.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          )}

          <TextField select label="Channel" name="channel" defaultValue="email" size="small" fullWidth>
            {COMMUNICATION_CHANNEL_OPTIONS.map(c => <MenuItem key={c} value={c}>{toTitleCaseLabel(c)}</MenuItem>)}
          </TextField>

          <TextField select label="Direction" name="direction" defaultValue="inbound" size="small" fullWidth>
            {EMAIL_DIRECTION_OPTIONS.map(d => <MenuItem key={d} value={d}>{toTitleCaseLabel(d)}</MenuItem>)}
          </TextField>
        </Box>

        <FormControlLabel
          control={<Checkbox name="isHuman" defaultChecked size="small" />}
          label="Human sender/recipient"
        />

        <TextField label="Subject" name="subject" required size="small" fullWidth
          placeholder="Interview invitation" slotProps={{ htmlInput: { maxLength: 300 } }} />

        <TextField multiline rows={6} label="Body" name="body" required size="small" fullWidth
          placeholder="Paste the message body" slotProps={{ htmlInput: { maxLength: 12000 } }} />

        <TextField multiline rows={3} label="Notes (optional)" name="notes" size="small" fullWidth
          placeholder="Add context like sentiment, intent, or follow-up reminders"
          slotProps={{ htmlInput: { maxLength: 4000 } }} />

        <TextField label="Date &amp; Time (optional — defaults to now)" name="createdAt" type="datetime-local" size="small" fullWidth
          slotProps={{ inputLabel: { shrink: true } }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Button
            type="submit"
            disabled={submitting || applications.length === 0 || (targetMode === "company" && companyOptions.length === 0)}
            endIcon={<SaveIcon sx={{ fontSize: "1rem !important" }} />}
          >
            {submitting ? "Saving..." : "Save Communication Log"}
          </Button>
          {applications.length === 0 && <Typography variant="body2" color="error">Create an application first.</Typography>}
          {targetMode === "applications" && <Typography variant="body2" color="text.secondary">Hold Ctrl/Cmd to select multiple.</Typography>}
          {success && <Typography variant="body2" color="success.main">{success}</Typography>}
          {error && <Typography variant="body2" color="error">{error}</Typography>}
        </Box>
      </Stack>
    </Paper>
  );
}
