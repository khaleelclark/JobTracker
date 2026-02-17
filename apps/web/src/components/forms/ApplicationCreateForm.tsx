"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const STATUS_OPTIONS = [
  "interested",
  "applied",
  "interviewing",
  "offered",
  "rejected",
  "withdrawn",
  "archived",
] as const;

function toIsoFromDateInput(raw: string): string {
  if (!raw) {
    return new Date().toISOString();
  }

  return new Date(`${raw}T12:00:00`).toISOString();
}

export function ApplicationCreateForm() {
  const router = useRouter();
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
      genericStatus: String(data.get("genericStatus") ?? "applied"),
      preciseStatus: String(data.get("preciseStatus") ?? "").trim() || null,
      roleFamily: String(data.get("roleFamily") ?? "").trim() || null,
      roleLevel: String(data.get("roleLevel") ?? "").trim() || null,
      appliedAt: toIsoFromDateInput(String(data.get("appliedAt") ?? "")),
      notes: String(data.get("notes") ?? "").trim() || null,
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
      setSuccess("Application saved.");
      router.refresh();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown error";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="form-header">
        <h2>Log Application</h2>
        <p className="muted">Create a factual record. No ranking or automation is applied.</p>
      </div>

      <div className="form-grid form-grid-2">
        <label>
          Company
          <input name="companyName" required maxLength={200} placeholder="Acme Corp" />
        </label>

        <label>
          Role Title
          <input name="roleTitle" required maxLength={200} placeholder="Product Manager" />
        </label>

        <label>
          Status
          <select name="genericStatus" defaultValue="applied">
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>

        <label>
          Applied Date
          <input name="appliedAt" type="date" />
        </label>

        <label>
          Role Family
          <input name="roleFamily" maxLength={120} placeholder="Engineering" />
        </label>

        <label>
          Role Level
          <input name="roleLevel" maxLength={120} placeholder="Mid" />
        </label>
      </div>

      <label>
        Precise Status
        <input name="preciseStatus" maxLength={200} placeholder="Recruiter screen completed" />
      </label>

      <label>
        Notes
        <textarea name="notes" rows={4} maxLength={4000} placeholder="Any factual notes from the posting or application" />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save Application"}
        </button>
        {success ? <span className="success-text">{success}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>
    </form>
  );
}
