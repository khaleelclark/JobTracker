"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import SaveIcon from "@mui/icons-material/Save";
import { toTitleCaseLabel, nowDateTimeLocalValue } from "@/lib/format";

interface ApplicationOption {
  id: string;
  companyName: string;
  roleTitle: string;
}

interface InterviewCreateFormProps {
  applications: ApplicationOption[];
  defaultApplicationId?: string;
  hideHeader?: boolean;
  onSaved?: () => void;
}

const INTERVIEW_STATUS_OPTIONS = ["scheduled", "completed", "cancelled"] as const;

function toIsoFromDateTime(raw: string): string {
  if (!raw) {
    return new Date().toISOString();
  }

  return new Date(raw).toISOString();
}

export function InterviewCreateForm({ applications, defaultApplicationId, hideHeader, onSaved }: InterviewCreateFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!success && !error) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
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

      if (!defaultApplicationId) {
        form.reset();
      }
      setSuccess("Interview logged.");
      router.refresh();
      onSaved?.();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown error";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      {!hideHeader && (
        <div className="form-header">
          <h2>Log Interview</h2>
          <p className="muted">Track each round and status as factual events.</p>
        </div>
      )}

      <div className="form-grid form-grid-2">
        <label>
          Application
          <select name="applicationId" required defaultValue={defaultApplicationId ?? ""}>
            <option value="" disabled>
              Select application
            </option>
            {applications.map((application) => (
              <option key={application.id} value={application.id}>
                {application.companyName} - {application.roleTitle}
              </option>
            ))}
          </select>
        </label>

        <label>
          Round Index
          <input name="roundIndex" type="number" min={1} max={20} defaultValue={1} required />
        </label>

        <label>
          Round Label
          <input name="roundLabel" required maxLength={100} placeholder="Phone Screen" />
        </label>

        <label>
          Status
          <select name="status" defaultValue="scheduled">
            {INTERVIEW_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {toTitleCaseLabel(status)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Scheduled At
        <input name="scheduledAt" type="datetime-local" required defaultValue={nowDateTimeLocalValue()} />
      </label>

      <label>
        Notes
        <textarea name="notes" rows={3} maxLength={4000} placeholder="Meeting link, interviewer name, prep notes…" />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={submitting || applications.length === 0}>
          {submitting ? "Saving..." : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              Save Interview
              <SaveIcon sx={{ fontSize: "1rem" }} />
            </span>
          )}
        </button>
        {applications.length === 0 ? <span className="error-text">Create an application first.</span> : null}
        {success ? <span className="success-text">{success}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>
    </form>
  );
}
