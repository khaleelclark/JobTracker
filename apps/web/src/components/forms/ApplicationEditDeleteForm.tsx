"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { cleanPostingText, toTitleCaseLabel } from "@/lib/format";

const STATUS_OPTIONS = [
  "applied", "under_review", "interviewing", "offered", "rejected", "withdrawn", "archived",
] as const;

interface ApplicationEditDeleteFormProps {
  application: {
    id: string;
    companyName: string;
    roleTitle: string;
    careersPageUrl: string | null;
    postingDetails: string | null;
    compensation: string | null;
    genericStatus: string;
    preciseStatus: string | null;
    roleFamily: string | null;
    roleLevel: string | null;
    appliedAtIso: string;
    notes: string | null;
    coverLetter: string | null;
    linkedResumeIds: string[];
  };
  resumes: Array<{ id: string; name: string }>;
  autocompleteOptions: {
    companies: string[];
    roleTitles: string[];
    careersPageUrls: string[];
    roleFamilies: string[];
    roleLevels: string[];
    compensations: string[];
  };
}

function toDateInputValue(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toIsoFromDateInput(raw: string): string {
  if (!raw) return new Date().toISOString();
  return new Date(`${raw}T12:00:00`).toISOString();
}

function normalizedCareersPageUrl(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function ApplicationEditDeleteForm({ application, resumes, autocompleteOptions }: ApplicationEditDeleteFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedResumes, setSelectedResumes] = useState(
    resumes.filter(r => application.linkedResumeIds.includes(r.id)),
  );

  useEffect(() => {
    if (!success) return;
    const id = window.setTimeout(() => setSuccess(null), 3000);
    return () => window.clearTimeout(id);
  }, [success]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      companyName: String(data.get("companyName") ?? "").trim(),
      roleTitle: String(data.get("roleTitle") ?? "").trim(),
      careersPageUrl: normalizedCareersPageUrl(data.get("careersPageUrl")),
      postingDetails: (() => { const v = String(data.get("postingDetails") ?? "").trim(); return v ? cleanPostingText(v) : null; })(),
      compensation: String(data.get("compensation") ?? "").trim() || null,
      genericStatus: String(data.get("genericStatus") ?? "applied"),
      preciseStatus: String(data.get("preciseStatus") ?? "").trim() || null,
      roleFamily: String(data.get("roleFamily") ?? "").trim() || null,
      roleLevel: String(data.get("roleLevel") ?? "").trim() || null,
      appliedAt: toIsoFromDateInput(String(data.get("appliedAt") ?? "")),
      notes: String(data.get("notes") ?? "").trim() || null,
      coverLetter: String(data.get("coverLetter") ?? "").trim() || null,
      linkedResumeIds: selectedResumes.map(r => r.id),
    };

    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown; detail?: unknown };
        const fieldErrors =
          typeof body.error === "object" && body.error && "fieldErrors" in body.error
            ? (body.error as { fieldErrors?: Record<string, string[] | undefined> }).fieldErrors
            : undefined;
        const firstFieldError = fieldErrors
          ? Object.values(fieldErrors).flat().find((m): m is string => Boolean(m))
          : null;
        throw new Error(firstFieldError ?? (typeof body.detail === "string" ? body.detail : `Unable to update application (${response.status})`));
      }

      setSuccess("Application updated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    setDeleting(true);
    setIsDeleteDialogOpen(false);
    setError(null);

    try {
      const response = await fetch(`/api/applications/${application.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to delete application");
      }
      router.push("/applications");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setDeleting(false);
    }
  }

  return (
    <Paper
      component="form"
      onSubmit={handleSave}
      sx={{
        transition: "box-shadow 220ms ease, transform 220ms ease",
        "&:hover": { boxShadow: "0 24px 56px rgba(13, 34, 66, 0.15)", transform: "translateY(-2px)" },
      }}
    >
      <Stack spacing={2}>
        <Typography variant="h2">Edit Application</Typography>

        <datalist id="edit-ac-company">{autocompleteOptions.companies.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="edit-ac-role-title">{autocompleteOptions.roleTitles.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="edit-ac-careers-page">{autocompleteOptions.careersPageUrls.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="edit-ac-role-family">{autocompleteOptions.roleFamilies.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="edit-ac-role-level">{autocompleteOptions.roleLevels.map(v => <option key={v} value={v} />)}</datalist>
        <datalist id="edit-ac-compensation">{autocompleteOptions.compensations.map(v => <option key={v} value={v} />)}</datalist>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1.5 }}>
          <TextField label="Company" name="companyName" required size="small" fullWidth
            defaultValue={application.companyName}
            slotProps={{ htmlInput: { maxLength: 200, list: "edit-ac-company" } }} />
          <TextField label="Role Title" name="roleTitle" required size="small" fullWidth
            defaultValue={application.roleTitle}
            slotProps={{ htmlInput: { maxLength: 200, list: "edit-ac-role-title" } }} />
          <TextField label="Careers Page (optional)" name="careersPageUrl" size="small" fullWidth
            defaultValue={application.careersPageUrl ?? ""}
            slotProps={{ htmlInput: { maxLength: 1000, list: "edit-ac-careers-page" } }} />
          <TextField select label="Status" name="genericStatus" defaultValue={application.genericStatus} size="small" fullWidth>
            {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{toTitleCaseLabel(s)}</MenuItem>)}
          </TextField>
          <TextField label="Applied Date" name="appliedAt" type="date" size="small" fullWidth
            defaultValue={toDateInputValue(application.appliedAtIso)} />
          <TextField label="Role Family" name="roleFamily" size="small" fullWidth
            defaultValue={application.roleFamily ?? ""}
            slotProps={{ htmlInput: { maxLength: 120, list: "edit-ac-role-family" } }} />
          <TextField label="Role Level" name="roleLevel" size="small" fullWidth
            defaultValue={application.roleLevel ?? ""}
            slotProps={{ htmlInput: { maxLength: 120, list: "edit-ac-role-level" } }} />
          <TextField label="Compensation" name="compensation" size="small" fullWidth
            defaultValue={application.compensation ?? ""}
            slotProps={{ htmlInput: { maxLength: 300, list: "edit-ac-compensation" } }} />
        </Box>

        <TextField label="Precise Status" name="preciseStatus" size="small" fullWidth
          defaultValue={application.preciseStatus ?? ""}
          slotProps={{ htmlInput: { maxLength: 200 } }} />

        <TextField multiline rows={6} label="Posting Details" name="postingDetails" size="small" fullWidth
          defaultValue={application.postingDetails ?? ""}
          slotProps={{ htmlInput: { maxLength: 50000 } }} />

        <Autocomplete
          multiple
          options={resumes}
          getOptionLabel={o => o.name}
          value={selectedResumes}
          onChange={(_, val) => setSelectedResumes(val)}
          isOptionEqualToValue={(o, v) => o.id === v.id}
          renderOption={(props, option) => <li {...props} key={option.id}>{option.name}</li>}
          renderInput={params => <TextField {...params} label="Linked Resumes" size="small" />}
        />

        <TextField multiline rows={4} label="Notes" name="notes" size="small" fullWidth
          defaultValue={application.notes ?? ""}
          slotProps={{ htmlInput: { maxLength: 4000 } }} />

        <TextField multiline rows={6} label="Cover Letter" name="coverLetter" size="small" fullWidth
          defaultValue={application.coverLetter ?? ""}
          placeholder="Paste or write your cover letter here…"
          slotProps={{ htmlInput: { maxLength: 20000 } }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Button type="submit" disabled={saving || deleting} endIcon={<SaveIcon sx={{ fontSize: "1rem !important" }} />}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          {success && <Typography variant="body2" color="success.main">{success}</Typography>}
          {error && <Typography variant="body2" color="error">{error}</Typography>}
          <Button
            type="button"
            disabled={saving || deleting}
            onClick={() => setIsDeleteDialogOpen(true)}
            endIcon={<DeleteIcon sx={{ fontSize: "1rem !important" }} />}
            sx={{ ml: "auto", color: "error.main" }}
          >
            {deleting ? "Deleting..." : "Delete Application"}
          </Button>
        </Box>
      </Stack>

      <Dialog
        open={isDeleteDialogOpen}
        onClose={(_e, reason) => { if (reason !== "backdropClick" && !deleting) setIsDeleteDialogOpen(false); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Application?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will permanently delete this application and all linked activity records (interviews, communication logs, follow-ups, events, and resume links).
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
          <Button onClick={() => void handleDeleteConfirmed()} disabled={deleting}
            endIcon={<DeleteIcon sx={{ fontSize: "1rem !important" }} />} sx={{ color: "error.main" }}>
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
