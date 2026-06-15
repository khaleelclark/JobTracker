"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import SaveIcon from "@mui/icons-material/Save";
import { toTitleCaseLabel, todayDateInputValue } from "@/lib/format";

interface FollowupCreateFormProps {
  applicationId: string;
  defaultAttemptIndex: number;
  hideHeader?: boolean;
  onSaved?: () => void;
}

const FOLLOWUP_CHANNEL_OPTIONS = ["email", "linkedin", "portal", "other"] as const;

function toIsoFromDate(raw: string): string {
  if (!raw) {
    return new Date().toISOString();
  }

  return new Date(`${raw}T12:00:00`).toISOString();
}

export function FollowupCreateForm({ applicationId, defaultAttemptIndex, hideHeader, onSaved }: FollowupCreateFormProps) {
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
      onSaved?.();
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
          <h3>Log Follow-up</h3>
        </div>
      )}

      <div className="form-grid form-grid-2">
        <label>
          Attempt Index
          <input name="attemptIndex" type="number" min={1} max={20} defaultValue={defaultAttemptIndex} required />
        </label>

        <label>
          Channel
          <select name="channel" defaultValue="email">
            {FOLLOWUP_CHANNEL_OPTIONS.map((channel) => (
              <option key={channel} value={channel}>
                {toTitleCaseLabel(channel)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Sent Date
        <input name="sentAt" type="date" defaultValue={todayDateInputValue()} />
      </label>

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
