"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import { toTitleCaseLabel, todayDateInputValue } from "@/lib/format";

const STATUS_OPTIONS = [
  "applied",
  "under_review",
  "interviewing",
  "offered",
  "rejected",
  "withdrawn",
  "archived",
] as const;

interface ResumeOption {
  id: string;
  name: string;
}

interface ApplicationAutocompleteOptions {
  companies: string[];
  roleTitles: string[];
  careersPageUrls: string[];
  roleFamilies: string[];
  roleLevels: string[];
  compensations: string[];
}

function toIsoFromDateInput(raw: string): string {
  if (!raw) {
    return new Date().toISOString();
  }

  return new Date(`${raw}T12:00:00`).toISOString();
}

function normalizedCareersPageUrl(
  value: FormDataEntryValue | null,
): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol;
}

interface ApplicationCreateFormProps {
  resumes: ResumeOption[];
  autocompleteOptions: ApplicationAutocompleteOptions;
}

export function ApplicationCreateForm({
  resumes,
  autocompleteOptions,
}: ApplicationCreateFormProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      linkedResumeIds: data
        .getAll("linkedResumeIds")
        .map(value => String(value)),
    };

    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: unknown;
        };
        throw new Error(
          typeof body.error === "string"
            ? body.error
            : "Unable to create application",
        );
      }

      form.reset();
      setSuccess("Application saved.");
      setIsDialogOpen(false);
      router.refresh();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unknown error";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setIsDialogOpen(true)}>Add Application</Button>

      <Dialog
        open={isDialogOpen}
        onClose={(_event, reason) => {
          if (reason === "backdropClick" || submitting) {
            return;
          }
          setIsDialogOpen(false);
          setError(null);
          setSuccess(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pr: 7 }}>
          Log Application
          <IconButton
            aria-label="Close add application dialog"
            onClick={() => {
              if (submitting) {
                return;
              }
              setIsDialogOpen(false);
              setError(null);
              setSuccess(null);
            }}
            disabled={submitting}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              borderRadius: 0,
              backgroundColor: "transparent",
              "&:hover": { backgroundColor: "transparent" },
            }}
          >
            x
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <form className="form-card" onSubmit={handleSubmit}>
            <div className="form-grid form-grid-2">
              <datalist id="application-company-options">
                {autocompleteOptions.companies.map(value => (
                  <option key={value} value={value} />
                ))}
              </datalist>
              <datalist id="application-role-title-options">
                {autocompleteOptions.roleTitles.map(value => (
                  <option key={value} value={value} />
                ))}
              </datalist>
              <datalist id="application-careers-page-options">
                {autocompleteOptions.careersPageUrls.map(value => (
                  <option key={value} value={value} />
                ))}
              </datalist>
              <datalist id="application-role-family-options">
                {autocompleteOptions.roleFamilies.map(value => (
                  <option key={value} value={value} />
                ))}
              </datalist>
              <datalist id="application-role-level-options">
                {autocompleteOptions.roleLevels.map(value => (
                  <option key={value} value={value} />
                ))}
              </datalist>
              <datalist id="application-compensation-options">
                {autocompleteOptions.compensations.map(value => (
                  <option key={value} value={value} />
                ))}
              </datalist>

              <label>
                Company
                <input
                  name="companyName"
                  required
                  maxLength={200}
                  list="application-company-options"
                  placeholder="Acme Corp"
                />
              </label>

              <label>
                Role Title
                <input
                  name="roleTitle"
                  required
                  maxLength={200}
                  list="application-role-title-options"
                  placeholder="Product Manager"
                />
              </label>

              <label>
                Careers Page (optional)
                <input
                  name="careersPageUrl"
                  maxLength={1000}
                  list="application-careers-page-options"
                  placeholder="https://jobs.company.com/roles/123"
                />
              </label>

              <label>
                Status
                <select name="genericStatus" defaultValue="applied">
                  {STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>
                      {toTitleCaseLabel(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Applied Date
                <input name="appliedAt" type="date" defaultValue={todayDateInputValue()} />
              </label>

              <label>
                Role Family
                <input
                  name="roleFamily"
                  maxLength={120}
                  list="application-role-family-options"
                  placeholder="Engineering"
                />
              </label>

              <label>
                Role Level
                <input
                  name="roleLevel"
                  maxLength={120}
                  list="application-role-level-options"
                  placeholder="Mid"
                />
              </label>

              <label>
                Compensation
                <input
                  name="compensation"
                  maxLength={300}
                  list="application-compensation-options"
                  placeholder="$140k-$170k base + bonus/equity"
                />
              </label>
            </div>

            <label>
              Precise Status
              <input
                name="preciseStatus"
                maxLength={200}
                placeholder="Recruiter screen completed"
              />
            </label>

            <label>
              Posting Details
              <textarea
                name="postingDetails"
                rows={6}
                maxLength={50000}
                placeholder="Paste factual role posting details (requirements, responsibilities, compensation, location, etc.)"
              />
            </label>

            <label>
              Linked Resumes
              <select
                name="linkedResumeIds"
                multiple
                size={Math.min(6, Math.max(3, resumes.length))}
              >
                {resumes.map(resume => (
                  <option key={resume.id} value={resume.id}>
                    {resume.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Notes
              <textarea
                name="notes"
                rows={4}
                maxLength={4000}
                placeholder="Any factual notes from the posting or application"
              />
            </label>

            <div className="form-actions">
              <button type="submit" disabled={submitting}>
                {submitting ? (
                  "Saving..."
                ) : (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                    }}
                  >
                    Save Application
                    <SaveIcon sx={{ fontSize: "1rem" }} />
                  </span>
                )}
              </button>
              {success ? <span className="success-text">{success}</span> : null}
              {error ? <span className="error-text">{error}</span> : null}
            </div>
          </form>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (submitting) {
                return;
              }
              setIsDialogOpen(false);
              setError(null);
              setSuccess(null);
            }}
            disabled={submitting}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
