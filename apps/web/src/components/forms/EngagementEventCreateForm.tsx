"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import SaveIcon from "@mui/icons-material/Save";
import { toTitleCaseLabel, nowDateTimeLocalValue } from "@/lib/format";

interface EngagementEventCreateFormProps {
  applicationId: string;
  hideHeader?: boolean;
  onSaved?: () => void;
}

const EVENT_TYPE_OPTIONS = [
  "recruiter_reply",
  "offer",
  "rejection_automated",
  "rejection_human",
] as const;

function isRejectionEventType(eventType: string): boolean {
  return eventType === "rejection_automated" || eventType === "rejection_human" || eventType === "rejection";
}

function toIsoFromDateTime(raw: string): string {
  if (!raw) {
    return new Date().toISOString();
  }

  return new Date(raw).toISOString();
}

function notifyRejectedStatus(applicationId: string) {
  window.dispatchEvent(
    new CustomEvent("application-status-updated", {
      detail: {
        applicationId,
        status: "rejected",
      },
    }),
  );
}

export function EngagementEventCreateForm({ applicationId, hideHeader, onSaved }: EngagementEventCreateFormProps) {
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
      applicationId,
      eventType: String(data.get("eventType") ?? "recruiter_reply"),
      occurredAt: toIsoFromDateTime(String(data.get("occurredAt") ?? "")),
    };

    try {
      const response = await fetch("/api/engagement-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to log engagement event");
      }

      form.reset();
      setSuccess("Engagement event logged.");
      onSaved?.();
      if (isRejectionEventType(payload.eventType)) {
        notifyRejectedStatus(applicationId);
      }
      router.refresh();
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unknown error";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="form-card compact" onSubmit={handleSubmit}>
      {!hideHeader && (
        <div className="form-header">
          <h3>Log Engagement Event</h3>
        </div>
      )}

      <div className="form-grid form-grid-2">
        <label>
          Event Type
          <select name="eventType" defaultValue="recruiter_reply">
            {EVENT_TYPE_OPTIONS.map((eventType) => (
              <option key={eventType} value={eventType}>
                {toTitleCaseLabel(eventType)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Occurred At
          <input name="occurredAt" type="datetime-local" defaultValue={nowDateTimeLocalValue()} />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              Save
              <SaveIcon sx={{ fontSize: "1rem" }} />
            </span>
          )}
        </button>
        {success ? <span className="success-text">{success}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>
    </form>
  );
}
