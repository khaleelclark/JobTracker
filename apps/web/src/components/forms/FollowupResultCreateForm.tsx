"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import SaveIcon from "@mui/icons-material/Save";
import { toTitleCaseLabel } from "@/lib/format";

interface FollowupOption {
  id: string;
  attemptIndex: number;
  sentAtIso: string;
}

interface FollowupResultCreateFormProps {
  followups: FollowupOption[];
  applicationId: string;
}

const RESULT_STATUS_OPTIONS = ["pending", "resolved", "expired_no_response"] as const;
const RESPONSE_TYPE_OPTIONS = [
  "human_reply",
  "rejection_reply",
  "screen_scheduled",
  "interview_scheduled",
] as const;

function toIsoFromDate(raw: string): string | null {
  if (!raw) {
    return null;
  }

  return new Date(`${raw}T12:00:00`).toISOString();
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

export function FollowupResultCreateForm({ followups, applicationId }: FollowupResultCreateFormProps) {
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

      if (payload.responseType === "rejection_reply") {
        notifyRejectedStatus(applicationId);
      } else {
        router.refresh();
      }
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
            {RESULT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {toTitleCaseLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Response Type
          <select name="responseType" defaultValue="">
            <option value="">None</option>
            {RESPONSE_TYPE_OPTIONS.map((responseType) => (
              <option key={responseType} value={responseType}>
                {toTitleCaseLabel(responseType)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Resolved Date
          <input name="resolvedAt" type="date" />
        </label>
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting || followups.length === 0}>
          {submitting ? "Saving..." : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              Save
              <SaveIcon sx={{ fontSize: "1rem" }} />
            </span>
          )}
        </button>
        {followups.length === 0 ? <span className="error-text">No follow-up attempts available.</span> : null}
        {success ? <span className="success-text">{success}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>
    </form>
  );
}
