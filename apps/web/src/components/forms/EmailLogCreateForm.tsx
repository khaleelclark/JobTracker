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
  compact?: boolean;
  hideHeader?: boolean;
  onSaved?: () => void;
}

const COMMUNICATION_CHANNEL_OPTIONS = ["email", "linkedin"] as const;
const EMAIL_DIRECTION_OPTIONS = ["inbound", "outbound"] as const;

function boolFromCheckbox(value: FormDataEntryValue | null): boolean {
  return value === "on";
}

function nullableTrimmedText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function resolveApiErrorMessage(errorBody: unknown, fallback: string): string {
  if (!errorBody || typeof errorBody !== "object") {
    return fallback;
  }

  const body = errorBody as {
    error?: unknown;
  };

  if (typeof body.error === "string" && body.error.trim()) {
    return body.error;
  }

  if (body.error && typeof body.error === "object") {
    const candidate = body.error as { formErrors?: unknown; fieldErrors?: unknown };
    if (Array.isArray(candidate.formErrors) && typeof candidate.formErrors[0] === "string") {
      return candidate.formErrors[0];
    }

    if (candidate.fieldErrors && typeof candidate.fieldErrors === "object") {
      const fieldErrorLists = Object.values(candidate.fieldErrors as Record<string, unknown>);
      for (const fieldErrorList of fieldErrorLists) {
        if (Array.isArray(fieldErrorList) && typeof fieldErrorList[0] === "string") {
          return fieldErrorList[0];
        }
      }
    }
  }

  return fallback;
}

export function EmailLogCreateForm({
  applications,
  defaultApplicationId,
  compact = false,
  hideHeader = false,
  onSaved,
}: EmailLogCreateFormProps) {
  const router = useRouter();
  const [targetMode, setTargetMode] = useState<"application" | "applications" | "company">("application");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const companyOptions = Array.from(new Set(applications.map((application) => application.companyName))).sort((a, b) =>
    a.localeCompare(b),
  );

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
    const selectedApplicationIds = data
      .getAll("applicationIds")
      .map((value) => String(value).trim())
      .filter((value) => value.length > 0);

    const payload: Record<string, unknown> = {
      channel: String(data.get("channel") ?? "email"),
      direction: String(data.get("direction") ?? "inbound"),
      isHuman: boolFromCheckbox(data.get("isHuman")),
      subject: String(data.get("subject") ?? "").trim(),
      body: String(data.get("body") ?? "").trim(),
      notes: nullableTrimmedText(data.get("notes")),
    };
    if (targetMode === "application") {
      payload.applicationId = String(data.get("applicationId") ?? "").trim();
    } else if (targetMode === "applications") {
      payload.applicationIds = selectedApplicationIds;
    } else {
      payload.companyName = String(data.get("companyName") ?? "").trim();
    }

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
        if (appField) {
          appField.value = defaultApplicationId;
        }
      }
      setSuccess("Communication log saved.");
      onSaved?.();
      router.refresh();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown error";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={compact ? "form-card compact" : "form-card"} onSubmit={handleSubmit}>
      {hideHeader ? null : (
        <div className="form-header">
          <h2>Log Communication</h2>
          <p className="muted">Store inbound or outbound communication records, including LinkedIn messages.</p>
        </div>
      )}

      <div className="form-grid form-grid-2">
        <label>
          Link To
          <select
            name="targetMode"
            value={targetMode}
            onChange={(event) => {
              setTargetMode(event.target.value as "application" | "applications" | "company");
            }}
          >
            <option value="application">Single Application</option>
            <option value="applications">Multiple Applications</option>
            <option value="company">Company</option>
          </select>
        </label>

        {targetMode === "application" ? (
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
        ) : null}

        {targetMode === "applications" ? (
          <label>
            Applications
            <select name="applicationIds" multiple required defaultValue={[]} style={{ minHeight: "7.25rem" }}>
              {applications.map((application) => (
                <option key={application.id} value={application.id}>
                  {application.companyName} - {application.roleTitle}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {targetMode === "company" ? (
          <label>
            Company
            <select name="companyName" required defaultValue="">
              <option value="" disabled>
                Select company
              </option>
              {companyOptions.map((companyName) => (
                <option key={companyName} value={companyName}>
                  {companyName}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label>
          Channel
          <select name="channel" defaultValue="email">
            {COMMUNICATION_CHANNEL_OPTIONS.map((channel) => (
              <option key={channel} value={channel}>
                {toTitleCaseLabel(channel)}
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
        <textarea name="body" rows={6} required maxLength={12000} placeholder="Paste the message body" />
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
        <button type="submit" disabled={submitting || applications.length === 0 || (targetMode === "company" && companyOptions.length === 0)}>
          {submitting ? "Saving..." : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              Save Communication Log
              <SaveIcon sx={{ fontSize: "1rem" }} />
            </span>
          )}
        </button>
        {applications.length === 0 ? <span className="error-text">Create an application first.</span> : null}
        {targetMode === "applications" ? <span className="muted">Hold Ctrl/Cmd to select multiple applications.</span> : null}
        {success ? <span className="success-text">{success}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>
    </form>
  );
}
