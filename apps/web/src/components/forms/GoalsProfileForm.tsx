"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import FormLabel from "@mui/material/FormLabel";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import SaveIcon from "@mui/icons-material/Save";

interface GoalsProfileFormProps {
  initialProfile: {
    missionStatement: string;
    weeklyApplicationsTarget: number | null;
    compensationPreference: string;
    preferredLocations: string;
    employmentTypes: string[];
    workplaceModes: string[];
    priorityNotes: string;
  };
}

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "temporary", label: "Temporary" },
] as const;

const WORKPLACE_MODE_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
] as const;

const FIELDSET_SX = {
  border: "1px solid rgba(19,33,48,0.2)",
  borderRadius: "12px",
  p: "0.55rem 0.9rem",
};

export function GoalsProfileForm({ initialProfile }: GoalsProfileFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const initialEmploymentTypeSet = useMemo(() => new Set(initialProfile.employmentTypes), [initialProfile.employmentTypes]);
  const initialWorkplaceModeSet = useMemo(() => new Set(initialProfile.workplaceModes), [initialProfile.workplaceModes]);

  useEffect(() => {
    if (!success) return;
    const id = window.setTimeout(() => setSuccess(null), 3000);
    return () => window.clearTimeout(id);
  }, [success]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    const payload = {
      missionStatement: String(data.get("missionStatement") ?? "").trim(),
      weeklyApplicationsTarget: (() => {
        const raw = String(data.get("weeklyApplicationsTarget") ?? "").trim();
        if (!raw) return null;
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
      })(),
      compensationPreference: String(data.get("compensationPreference") ?? "").trim(),
      preferredLocations: String(data.get("preferredLocations") ?? "").trim(),
      employmentTypes: data.getAll("employmentTypes").map(v => String(v)),
      workplaceModes: data.getAll("workplaceModes").map(v => String(v)),
      priorityNotes: String(data.get("priorityNotes") ?? "").trim(),
    };

    try {
      const response = await fetch("/api/goals-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        const fieldErrors =
          typeof body.error === "object" && body.error && "fieldErrors" in body.error
            ? (body.error as { fieldErrors?: Record<string, string[] | undefined> }).fieldErrors
            : undefined;
        const firstFieldError = fieldErrors
          ? Object.values(fieldErrors).flat().find((m): m is string => Boolean(m))
          : null;
        throw new Error(firstFieldError ?? `Unable to save goals (${response.status})`);
      }

      setSuccess("Goals profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      sx={{
        transition: "box-shadow 220ms ease, transform 220ms ease",
        "&:hover": { boxShadow: "0 24px 56px rgba(13, 34, 66, 0.15)", transform: "translateY(-2px)" },
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography variant="h2">Goal & Mission Statement</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Saved as structured context for external AI analysis.
          </Typography>
        </Box>

        <TextField
          multiline
          rows={6}
          label="Mission Statement"
          name="missionStatement"
          defaultValue={initialProfile.missionStatement}
          placeholder="Describe what success looks like for this search."
          slotProps={{ htmlInput: { maxLength: 8000 } }}
          size="small"
          fullWidth
        />

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1.5 }}>
          <TextField
            label="Weekly Application Target"
            name="weeklyApplicationsTarget"
            type="number"
            defaultValue={initialProfile.weeklyApplicationsTarget ?? ""}
            placeholder="10"
            slotProps={{ htmlInput: { min: 1, max: 200 } }}
            size="small"
            fullWidth
          />
          <TextField
            label="Compensation Preference"
            name="compensationPreference"
            defaultValue={initialProfile.compensationPreference}
            placeholder="$70,000 - $100,000 + bonus + benefits."
            slotProps={{ htmlInput: { maxLength: 300 } }}
            size="small"
            fullWidth
          />
          <TextField
            label="Preferred Locations"
            name="preferredLocations"
            defaultValue={initialProfile.preferredLocations}
            placeholder="Sacramento, CA; Remote (US)"
            slotProps={{ htmlInput: { maxLength: 500 } }}
            size="small"
            fullWidth
          />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1.5 }}>
          <FormControl component="fieldset" sx={FIELDSET_SX}>
            <FormLabel component="legend" sx={{ fontSize: "0.85rem" }}>
              Employment Type
            </FormLabel>
            <FormGroup>
              {EMPLOYMENT_TYPE_OPTIONS.map(option => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      name="employmentTypes"
                      value={option.value}
                      defaultChecked={initialEmploymentTypeSet.has(option.value)}
                      size="small"
                    />
                  }
                  label={option.label}
                />
              ))}
            </FormGroup>
          </FormControl>

          <FormControl component="fieldset" sx={FIELDSET_SX}>
            <FormLabel component="legend" sx={{ fontSize: "0.85rem" }}>
              Workplace Mode
            </FormLabel>
            <FormGroup>
              {WORKPLACE_MODE_OPTIONS.map(option => (
                <FormControlLabel
                  key={option.value}
                  control={
                    <Checkbox
                      name="workplaceModes"
                      value={option.value}
                      defaultChecked={initialWorkplaceModeSet.has(option.value)}
                      size="small"
                    />
                  }
                  label={option.label}
                />
              ))}
            </FormGroup>
          </FormControl>
        </Box>

        <TextField
          multiline
          rows={6}
          label="Priority Notes"
          name="priorityNotes"
          defaultValue={initialProfile.priorityNotes}
          placeholder="List preferences, non-negotiables, and tradeoffs."
          slotProps={{ htmlInput: { maxLength: 8000 } }}
          size="small"
          fullWidth
        />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Button type="submit" disabled={submitting} endIcon={<SaveIcon sx={{ fontSize: "1rem !important" }} />}>
            {submitting ? "Saving..." : "Save Goals"}
          </Button>
          {success && <Typography variant="body2" color="success.main">{success}</Typography>}
          {error && <Typography variant="body2" color="error">{error}</Typography>}
        </Box>
      </Stack>
    </Paper>
  );
}
