"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import SaveIcon from "@mui/icons-material/Save";

interface InterviewOption {
  id: string;
  roundLabel: string;
  scheduledAtIso: string;
}

interface ReflectionCreateFormProps {
  interviews: InterviewOption[];
}

export function ReflectionCreateForm({ interviews }: ReflectionCreateFormProps) {
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
      interviewId: String(data.get("interviewId") ?? ""),
      outcome: String(data.get("outcome") ?? "pending"),
      summary: String(data.get("summary") ?? "").trim(),
    };

    try {
      const response = await fetch("/api/reflections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to save reflection");
      }

      form.reset();
      setSuccess("Reflection saved.");
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
        <h3>Log Reflection</h3>
      </div>

      <div className="form-grid form-grid-2">
        <label>
          Interview
          <select name="interviewId" required defaultValue="">
            <option value="" disabled>
              Select interview
            </option>
            {interviews.map((interview) => (
              <option key={interview.id} value={interview.id}>
                {interview.roundLabel} - {new Date(interview.scheduledAtIso).toLocaleDateString()}
              </option>
            ))}
          </select>
        </label>

        <label>
          Outcome
          <select name="outcome" defaultValue="pending">
            <option value="pending">pending</option>
            <option value="advanced">advanced</option>
            <option value="rejected">rejected</option>
          </select>
        </label>
      </div>

      <label>
        Summary
        <textarea name="summary" rows={4} required maxLength={5000} placeholder="What happened in this round?" />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={submitting || interviews.length === 0}>
          {submitting ? "Saving..." : (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              Save
              <SaveIcon sx={{ fontSize: "1rem" }} />
            </span>
          )}
        </button>
        {interviews.length === 0 ? <span className="error-text">No interviews available.</span> : null}
        {success ? <span className="success-text">{success}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>
    </form>
  );
}
