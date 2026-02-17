"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

interface FollowupOption {
  id: string;
  attemptIndex: number;
  sentAtIso: string;
}

interface FollowupResultCreateFormProps {
  followups: FollowupOption[];
}

function toIsoFromDate(raw: string): string | null {
  if (!raw) {
    return null;
  }

  return new Date(`${raw}T12:00:00`).toISOString();
}

export function FollowupResultCreateForm({ followups }: FollowupResultCreateFormProps) {
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
      followupAttemptId: String(data.get("followupAttemptId") ?? ""),
      resultStatus: String(data.get("resultStatus") ?? "pending"),
      responseType: String(data.get("responseType") ?? "").trim() || null,
      resolvedAt: toIsoFromDate(String(data.get("resolvedAt") ?? "")),
    };

    try {
      const response = await fetch("/api/followup-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to save follow-up result");
      }

      form.reset();
      setSuccess("Follow-up result saved.");
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
        <h3>Log Follow-up Result</h3>
      </div>

      <div className="form-grid form-grid-2">
        <label>
          Follow-up Attempt
          <select name="followupAttemptId" required defaultValue="">
            <option value="" disabled>
              Select follow-up
            </option>
            {followups.map((followup) => (
              <option key={followup.id} value={followup.id}>
                Attempt {followup.attemptIndex} - {new Date(followup.sentAtIso).toLocaleDateString()}
              </option>
            ))}
          </select>
        </label>

        <label>
          Result Status
          <select name="resultStatus" defaultValue="pending">
            <option value="pending">pending</option>
            <option value="resolved">resolved</option>
            <option value="expired_no_response">expired_no_response</option>
          </select>
        </label>

        <label>
          Response Type
          <select name="responseType" defaultValue="">
            <option value="">none</option>
            <option value="human_reply">human_reply</option>
            <option value="rejection_reply">rejection_reply</option>
            <option value="screen_scheduled">screen_scheduled</option>
            <option value="interview_scheduled">interview_scheduled</option>
          </select>
        </label>

        <label>
          Resolved Date
          <input name="resolvedAt" type="date" />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting || followups.length === 0}>
          {submitting ? "Saving..." : "Save"}
        </button>
        {followups.length === 0 ? <span className="error-text">No follow-up attempts available.</span> : null}
        {success ? <span className="success-text">{success}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>
    </form>
  );
}
