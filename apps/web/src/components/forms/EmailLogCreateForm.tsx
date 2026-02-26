"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import SaveIcon from "@mui/icons-material/Save";
import { toTitleCaseLabel } from "@/lib/format";

interface ApplicationOption {
  id: string;
  companyName: string;
  roleTitle: string;
}

interface EmailLogCreateFormProps {
  applications: ApplicationOption[];
  defaultApplicationId?: string;
}

const EMAIL_DIRECTION_OPTIONS = ["inbound", "outbound"] as const;

function boolFromCheckbox(value: FormDataEntryValue | null): boolean {
  return value === "on";
}

function nullableTrimmedText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export function EmailLogCreateForm({ applications, defaultApplicationId }: EmailLogCreateFormProps) {
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
      direction: String(data.get("direction") ?? "inbound"),
      isHuman: boolFromCheckbox(data.get("isHuman")),
      subject: String(data.get("subject") ?? "").trim(),
      body: String(data.get("body") ?? "").trim(),
      notes: nullableTrimmedText(data.get("notes")),
    };

    try {
      const response = await fetch("/api/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to save email log");
      }

      if (!defaultApplicationId) {
        form.reset();
      } else {
        const appField = form.elements.namedItem("applicationId") as HTMLSelectElement | null;
        if (appField) {
          appField.value = defaultApplicationId;
        }
      }
      setSuccess("Email log saved.");
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
        <h2>Log Email</h2>
        <p className="muted">Store inbound or outbound communication records.</p>
      </div>

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
          Direction
          <select name="direction" defaultValue="inbound">
            {EMAIL_DIRECTION_OPTIONS.map((direction) => (
              <option key={direction} value={direction}>
                {toTitleCaseLabel(direction)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="checkbox-row">
        <input name="isHuman" type="checkbox" defaultChecked />
        Human sender/recipient
      </label>

      <label>
        Subject
        <input name="subject" required maxLength={300} placeholder="Interview invitation" />
      </label>

      <label>
        Body
        <textarea name="body" rows={6} required maxLength={12000} placeholder="Paste the email body" />
      </label>

      <label>
        Notes (optional)
        <textarea
          name="notes"
          rows={3}
          maxLength={4000}
          placeholder="Add context like sentiment, intent, or follow-up reminders"
        />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={submitting || applications.length === 0}>
          {submitting ? "Saving..." : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              Save Email Log
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
