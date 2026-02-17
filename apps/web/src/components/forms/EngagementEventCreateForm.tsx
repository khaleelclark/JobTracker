"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface EngagementEventCreateFormProps {
  applicationId: string;
}

function toIsoFromDateTime(raw: string): string {
  if (!raw) {
    return new Date().toISOString();
  }

  return new Date(raw).toISOString();
}

export function EngagementEventCreateForm({ applicationId }: EngagementEventCreateFormProps) {
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
      <div className="form-header">
        <h3>Log Engagement Event</h3>
      </div>

      <div className="form-grid form-grid-2">
        <label>
          Event Type
          <select name="eventType" defaultValue="recruiter_reply">
            <option value="recruiter_reply">recruiter_reply</option>
            <option value="phone_screen">phone_screen</option>
            <option value="interview_round">interview_round</option>
            <option value="offer">offer</option>
            <option value="rejection">rejection</option>
          </select>
        </label>

        <label>
          Occurred At
          <input name="occurredAt" type="datetime-local" />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</button>
        {success ? <span className="success-text">{success}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>
    </form>
  );
}
