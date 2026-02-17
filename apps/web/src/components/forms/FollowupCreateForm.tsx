"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface FollowupCreateFormProps {
  applicationId: string;
  defaultAttemptIndex: number;
}

function toIsoFromDate(raw: string): string {
  if (!raw) {
    return new Date().toISOString();
  }

  return new Date(`${raw}T12:00:00`).toISOString();
}

export function FollowupCreateForm({ applicationId, defaultAttemptIndex }: FollowupCreateFormProps) {
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
      attemptIndex: Number(data.get("attemptIndex") ?? defaultAttemptIndex),
      channel: String(data.get("channel") ?? "email"),
      sentAt: toIsoFromDate(String(data.get("sentAt") ?? "")),
    };

    try {
      const response = await fetch("/api/followups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to log follow-up");
      }

      const attemptField = form.elements.namedItem("attemptIndex") as HTMLInputElement | null;
      if (attemptField) {
        attemptField.value = String(payload.attemptIndex + 1);
      }
      setSuccess("Follow-up logged.");
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
        <h3>Log Follow-up</h3>
      </div>

      <div className="form-grid form-grid-2">
        <label>
          Attempt Index
          <input name="attemptIndex" type="number" min={1} max={20} defaultValue={defaultAttemptIndex} required />
        </label>

        <label>
          Channel
          <select name="channel" defaultValue="email">
            <option value="email">email</option>
            <option value="linkedin">linkedin</option>
            <option value="portal">portal</option>
            <option value="other">other</option>
          </select>
        </label>
      </div>

      <label>
        Sent Date
        <input name="sentAt" type="date" />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save"}</button>
        {success ? <span className="success-text">{success}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>
    </form>
  );
}
