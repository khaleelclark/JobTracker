"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { cleanPostingText, toTitleCaseLabel } from "@/lib/format";

const STATUS_OPTIONS = [
  "applied",
  "under_review",
  "interviewing",
  "offered",
  "rejected",
  "withdrawn",
  "archived",
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toIsoFromDateInput(raw: string): string {
  if (!raw) {
    return new Date().toISOString();
  }

  return new Date(`${raw}T12:00:00`).toISOString();
}

function normalizedCareersPageUrl(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol;
}

export function ApplicationEditDeleteForm({
  application,
  resumes,
  autocompleteOptions,
}: ApplicationEditDeleteFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedResumes, setSelectedResumes] = useState(
    resumes.filter((r) => application.linkedResumeIds.includes(r.id)),
  );

  useEffect(() => {
    if (!success) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccess(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
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
      linkedResumeIds: selectedResumes.map((r) => r.id),
    };

    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: unknown;
          detail?: unknown;
        };
        const fieldErrors =
          typeof body.error === "object" &&
          body.error &&
          "fieldErrors" in body.error
            ? (
                body.error as {
                  fieldErrors?: Record<string, string[] | undefined>;
                }
              ).fieldErrors
            : undefined;
        const firstFieldError = fieldErrors
          ? Object.values(fieldErrors)
              .flat()
              .find((message): message is string => Boolean(message))
          : null;
        const detailMessage =
          typeof body.detail === "string" ? body.detail : null;
        throw new Error(
          firstFieldError ??
            detailMessage ??
            `Unable to update application (${response.status})`,
        );
      }

      setSuccess("Application updated.");
      router.refresh();
    } catch (saveError) {
      const message =
        saveError instanceof Error ? saveError.message : "Unknown error";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    setDeleting(true);
    setIsDeleteDialogOpen(false);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: unknown;
        };
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Unable to delete application",
        );
      }

      router.push("/applications");
      router.refresh();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Unknown error";
      setError(message);
      setDeleting(false);
    }
  }

  return (
    <form className="card stack-md" onSubmit={handleSave}>
      <h2>Edit Application</h2>

      <div className="form-grid form-grid-2">
        <datalist id="edit-application-company-options">
          {autocompleteOptions.companies.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <datalist id="edit-application-role-title-options">
          {autocompleteOptions.roleTitles.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <datalist id="edit-application-careers-page-options">
          {autocompleteOptions.careersPageUrls.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <datalist id="edit-application-role-family-options">
          {autocompleteOptions.roleFamilies.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <datalist id="edit-application-role-level-options">
          {autocompleteOptions.roleLevels.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>
        <datalist id="edit-application-compensation-options">
          {autocompleteOptions.compensations.map((value) => (
            <option key={value} value={value} />
          ))}
        </datalist>

        <label>
          Company
          <input
            name="companyName"
            required
            maxLength={200}
            list="edit-application-company-options"
            defaultValue={application.companyName}
          />
        </label>

        <label>
          Role Title
          <input
            name="roleTitle"
            required
            maxLength={200}
            list="edit-application-role-title-options"
            defaultValue={application.roleTitle}
          />
        </label>

        <label>
          Careers Page (optional)
          <input
            name="careersPageUrl"
            maxLength={1000}
            list="edit-application-careers-page-options"
            defaultValue={application.careersPageUrl ?? ""}
          />
        </label>

        <label>
          Status
          <select name="genericStatus" defaultValue={application.genericStatus}>
            {STATUS_OPTIONS.map(status => (
              <option key={status} value={status}>
                {toTitleCaseLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Applied Date
          <input
            name="appliedAt"
            type="date"
            defaultValue={toDateInputValue(application.appliedAtIso)}
          />
        </label>

        <label>
          Role Family
          <input
            name="roleFamily"
            maxLength={120}
            list="edit-application-role-family-options"
            defaultValue={application.roleFamily ?? ""}
          />
        </label>

        <label>
          Role Level
          <input
            name="roleLevel"
            maxLength={120}
            list="edit-application-role-level-options"
            defaultValue={application.roleLevel ?? ""}
          />
        </label>

        <label>
          Compensation
          <input
            name="compensation"
            maxLength={300}
            list="edit-application-compensation-options"
            defaultValue={application.compensation ?? ""}
          />
        </label>
      </div>

      <label>
        Precise Status
        <input
          name="preciseStatus"
          maxLength={200}
          defaultValue={application.preciseStatus ?? ""}
        />
      </label>

      <label>
        Posting Details
        <textarea
          name="postingDetails"
          rows={6}
          maxLength={50000}
          defaultValue={application.postingDetails ?? ""}
        />
      </label>

      <Autocomplete
        multiple
        options={resumes}
        getOptionLabel={(o) => o.name}
        value={selectedResumes}
        onChange={(_, val) => setSelectedResumes(val)}
        isOptionEqualToValue={(o, v) => o.id === v.id}
        renderOption={(props, option) => <li {...props} key={option.id}>{option.name}</li>}
        renderInput={(params) => <TextField {...params} label="Linked Resumes" size="small" />}
      />

      <label>
        Notes
        <textarea
          name="notes"
          rows={4}
          maxLength={4000}
          defaultValue={application.notes ?? ""}
        />
      </label>

      <label>
        Cover Letter
        <textarea
          name="coverLetter"
          rows={6}
          maxLength={20000}
          placeholder="Paste or write your cover letter here..."
          defaultValue={application.coverLetter ?? ""}
        />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={saving || deleting}>
          {saving ? (
            "Saving..."
          ) : (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
              }}
            >
              Save Changes
              <SaveIcon sx={{ fontSize: "1rem" }} />
            </span>
          )}
        </button>
        {success ? <span className="success-text">{success}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
        <button
          type="button"
          disabled={saving || deleting}
          onClick={() => setIsDeleteDialogOpen(true)}
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
          }}
        >
          {deleting ? "Deleting..." : "Delete Application"}
          <DeleteIcon sx={{ fontSize: "1rem" }} />
        </button>
      </div>

      <Dialog
        open={isDeleteDialogOpen}
        onClose={(_event, reason) => {
          if (reason === "backdropClick" || deleting) {
            return;
          }
          setIsDeleteDialogOpen(false);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Application?</DialogTitle>
        <DialogContent>
          This will permanently delete this application and all linked activity
          records (interviews, communication logs, follow-ups, events, and resume links).
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setIsDeleteDialogOpen(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleDeleteConfirmed()}
            disabled={deleting}
            endIcon={<DeleteIcon sx={{ fontSize: "1rem" }} />}
          >
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </form>
  );
}
