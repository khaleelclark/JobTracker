"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import { ResumeCreateForm } from "@/components/forms/ResumeCreateForm";
import { toTitleCaseLabel, todayDateInputValue } from "@/lib/format";

const STATUS_OPTIONS = [
  "in_process", "applied", "under_review", "interviewing", "offered", "rejected", "withdrawn", "archived",
] as const;

interface ResumeOption { id: string; name: string; }

interface ApplicationAutocompleteOptions {
  companies: string[];
  roleTitles: string[];
  careersPageUrls: string[];
  roleFamilies: string[];
  roleLevels: string[];
  compensations: string[];
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

interface ApplicationCreateFormProps {
  resumes: ResumeOption[];
  autocompleteOptions: ApplicationAutocompleteOptions;
}

export function ApplicationCreateForm({ resumes, autocompleteOptions }: ApplicationCreateFormProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedResumes, setSelectedResumes] = useState<ResumeOption[]>([]);
  const [isAddResumeOpen, setIsAddResumeOpen] = useState(false);
  const [newlyCreatedResumes, setNewlyCreatedResumes] = useState<ResumeOption[]>([]);

  const resumeOptions = useMemo(() => {
    const existingIds = new Set(resumes.map(r => r.id));
    return [...resumes, ...newlyCreatedResumes.filter(r => !existingIds.has(r.id))];
  }, [resumes, newlyCreatedResumes]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    const payload = {
      companyName: String(data.get("companyName") ?? "").trim(),
      roleTitle: String(data.get("roleTitle") ?? "").trim(),
      careersPageUrl: normalizedCareersPageUrl(data.get("careersPageUrl")),
      postingDetails: String(data.get("postingDetails") ?? "").trim() || null,
      compensation: String(data.get("compensation") ?? "").trim() || null,
      genericStatus: String(data.get("genericStatus") ?? "applied"),
      preciseStatus: String(data.get("preciseStatus") ?? "").trim() || null,
      roleFamily: String(data.get("roleFamily") ?? "").trim() || null,
      roleLevel: String(data.get("roleLevel") ?? "").trim() || null,
      appliedAt: toIsoFromDateInput(String(data.get("appliedAt") ?? "")),
      notes: String(data.get("notes") ?? "").trim() || null,
      coverLetter: String(data.get("coverLetter") ?? "").trim() || null,
      linkedResumeIds: data.getAll("linkedResumeIds").map(v => String(v)),
    };

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to create application");
      }

      form.reset();
      setSelectedResumes([]);
      setSuccess("Application saved.");
      setIsDialogOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    if (submitting) return;
    setIsDialogOpen(false);
    setError(null);
    setSuccess(null);
  }

  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)}>+ Add Application</Button>

      <Dialog open={isDialogOpen} onClose={(_e, reason) => { if (reason !== "backdropClick") handleClose(); }} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pr: 7 }}>
          Log Application
          <IconButton
            aria-label="Close"
            onClick={handleClose}
            disabled={submitting}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            ✕
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          <Stack component="form" spacing={2} onSubmit={handleSubmit} id="app-create-form">
            {/* Datalists for native autocomplete */}
            <datalist id="ac-company">{autocompleteOptions.companies.map(v => <option key={v} value={v} />)}</datalist>
            <datalist id="ac-role-title">{autocompleteOptions.roleTitles.map(v => <option key={v} value={v} />)}</datalist>
            <datalist id="ac-careers-page">{autocompleteOptions.careersPageUrls.map(v => <option key={v} value={v} />)}</datalist>
            <datalist id="ac-role-family">{autocompleteOptions.roleFamilies.map(v => <option key={v} value={v} />)}</datalist>
            <datalist id="ac-role-level">{autocompleteOptions.roleLevels.map(v => <option key={v} value={v} />)}</datalist>
            <datalist id="ac-compensation">{autocompleteOptions.compensations.map(v => <option key={v} value={v} />)}</datalist>

            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1.5 }}>
              <TextField label="Company" name="companyName" required size="small" fullWidth
                slotProps={{ htmlInput: { maxLength: 200, list: "ac-company" } }} />
              <TextField label="Role Title" name="roleTitle" required size="small" fullWidth
                slotProps={{ htmlInput: { maxLength: 200, list: "ac-role-title" } }} />
              <TextField label="Careers Page (optional)" name="careersPageUrl" size="small" fullWidth
                placeholder="https://jobs.company.com/roles/123"
                slotProps={{ htmlInput: { maxLength: 1000, list: "ac-careers-page" } }} />
              <TextField select label="Status" name="genericStatus" defaultValue="applied" size="small" fullWidth>
                {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{toTitleCaseLabel(s)}</MenuItem>)}
              </TextField>
              <TextField label="Applied Date" name="appliedAt" type="date" defaultValue={todayDateInputValue()} size="small" fullWidth />
              <TextField label="Role Family" name="roleFamily" size="small" fullWidth
                slotProps={{ htmlInput: { maxLength: 120, list: "ac-role-family" } }} placeholder="Engineering" />
              <TextField label="Role Level" name="roleLevel" size="small" fullWidth
                slotProps={{ htmlInput: { maxLength: 120, list: "ac-role-level" } }} placeholder="Mid" />
              <TextField label="Compensation" name="compensation" size="small" fullWidth
                slotProps={{ htmlInput: { maxLength: 300, list: "ac-compensation" } }}
                placeholder="$70,000 - $100,000 + bonus" />
            </Box>

            <TextField label="Precise Status" name="preciseStatus" size="small" fullWidth
              placeholder="Recruiter screen completed"
              slotProps={{ htmlInput: { maxLength: 200 } }} />

            <TextField multiline rows={6} label="Posting Details" name="postingDetails" size="small" fullWidth
              placeholder="Paste role posting details (requirements, responsibilities, compensation…)"
              slotProps={{ htmlInput: { maxLength: 50000 } }} />

            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
              <Autocomplete
                multiple
                fullWidth
                options={resumeOptions}
                getOptionLabel={o => o.name}
                value={selectedResumes}
                onChange={(_, val) => setSelectedResumes(val)}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                renderOption={(props, option) => <li {...props} key={option.id}>{option.name}</li>}
                renderInput={params => <TextField {...params} label="Linked Resumes" size="small" />}
              />
              <Button onClick={() => setIsAddResumeOpen(true)} sx={{ flexShrink: 0, mt: 0.25 }}>
                + Add Resume
              </Button>
            </Box>
            {selectedResumes.map(r => (
              <input key={r.id} type="hidden" name="linkedResumeIds" value={r.id} />
            ))}

            <TextField multiline rows={4} label="Notes" name="notes" size="small" fullWidth
              placeholder="Any factual notes from the posting or application"
              slotProps={{ htmlInput: { maxLength: 4000 } }} />

            <TextField multiline rows={6} label="Cover Letter" name="coverLetter" size="small" fullWidth
              placeholder="Paste or write your cover letter here…"
              slotProps={{ htmlInput: { maxLength: 20000 } }} />

            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Button type="submit" form="app-create-form" disabled={submitting}
                endIcon={<SaveIcon sx={{ fontSize: "1rem !important" }} />}>
                {submitting ? "Saving..." : "Save Application"}
              </Button>
              {success && <Typography variant="body2" color="success.main">{success}</Typography>}
              {error && <Typography variant="body2" color="error">{error}</Typography>}
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isAddResumeOpen}
        onClose={(_event, reason) => { if (reason === "backdropClick") return; setIsAddResumeOpen(false); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          Add Resume
          <IconButton size="small" aria-label="Close" onClick={() => setIsAddResumeOpen(false)}>
            <CloseIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <ResumeCreateForm
            applications={[]}
            hideHeader
            onSaved={resume => {
              setNewlyCreatedResumes(current => [...current, resume]);
              setSelectedResumes(current => [...current, resume]);
              setIsAddResumeOpen(false);
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddResumeOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
