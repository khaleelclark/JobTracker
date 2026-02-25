"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

interface GoalsProfileFormProps {
  initialProfile: {
    missionStatement: string;
    compensationPreference: string;
    preferredLocations: string;
    employmentTypes: string[];
    workplaceModes: string[];
    priorityNotes: string;
  };
}

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "temporary", label: "Temporary" },
] as const;

const WORKPLACE_MODE_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" },
] as const;

export function GoalsProfileForm({ initialProfile }: GoalsProfileFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const initialEmploymentTypeSet = useMemo(
    () => new Set(initialProfile.employmentTypes),
    [initialProfile.employmentTypes],
  );
  const initialWorkplaceModeSet = useMemo(
    () => new Set(initialProfile.workplaceModes),
    [initialProfile.workplaceModes],
  );

  useEffect(() => {
    if (!success) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccess(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [success]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    const payload = {
      missionStatement: String(data.get("missionStatement") ?? "").trim(),
      compensationPreference: String(
        data.get("compensationPreference") ?? "",
      ).trim(),
      preferredLocations: String(data.get("preferredLocations") ?? "").trim(),
      employmentTypes: data
        .getAll("employmentTypes")
        .map(value => String(value)),
      workplaceModes: data.getAll("workplaceModes").map(value => String(value)),
      priorityNotes: String(data.get("priorityNotes") ?? "").trim(),
    };

    try {
      const response = await fetch("/api/goals-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: unknown;
        };
        const fieldErrors =
          typeof body.error === "object" &&
          body.error &&
          "fieldErrors" in body.error
            ? (
                body.error as {
                  fieldErrors?: Record<string, string[] | undefined>;
                }
              ).fieldErrors
            : undefined;
        const firstFieldError = fieldErrors
          ? Object.values(fieldErrors)
              .flat()
              .find((message): message is string => Boolean(message))
          : null;
        throw new Error(
          firstFieldError ?? `Unable to save goals (${response.status})`,
        );
      }

      setSuccess("Goals profile saved.");
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unknown error";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack-xl">
      <div className="grid grid-2">
        <div className="card">
          <h2>Resources</h2>
          <p className="muted">
            Keep your resumes and skills aligned with your priorities.
          </p>
          <p>
            <Link href="/resumes">Go to Resumes</Link>
          </p>
          <p>
            <Link href="/skills">Go to Skills</Link>
          </p>
        </div>
      </div>

      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-header">
          <h2>Goal & Mission Statement</h2>
          <p className="muted">
            Saved as structured context for external AI analysis.
          </p>
        </div>

        <label>
          Mission Statement
          <textarea
            name="missionStatement"
            rows={6}
            maxLength={8000}
            defaultValue={initialProfile.missionStatement}
            placeholder="Describe what success looks like for this search."
          />
        </label>

        <div className="form-grid form-grid-2">
          <label>
            Compensation Preference
            <input
              name="compensationPreference"
              maxLength={300}
              defaultValue={initialProfile.compensationPreference}
              placeholder="$140k-$170k base, equity preferred"
            />
          </label>

          <label>
            Preferred Locations
            <input
              name="preferredLocations"
              maxLength={500}
              defaultValue={initialProfile.preferredLocations}
              placeholder="Austin, TX; Remote (US)"
            />
          </label>
        </div>

        <div className="form-grid form-grid-2">
          <fieldset>
            <legend>Employment Type</legend>
            {EMPLOYMENT_TYPE_OPTIONS.map(option => (
              <label key={option.value} className="checkbox-row">
                <input
                  type="checkbox"
                  name="employmentTypes"
                  value={option.value}
                  defaultChecked={initialEmploymentTypeSet.has(option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>Workplace Mode</legend>
            {WORKPLACE_MODE_OPTIONS.map(option => (
              <label key={option.value} className="checkbox-row">
                <input
                  type="checkbox"
                  name="workplaceModes"
                  value={option.value}
                  defaultChecked={initialWorkplaceModeSet.has(option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>
        </div>

        <label>
          Priority Notes
          <textarea
            name="priorityNotes"
            rows={6}
            maxLength={8000}
            defaultValue={initialProfile.priorityNotes}
            placeholder="List preferences, non-negotiables, and tradeoffs."
          />
        </label>

        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save Goals"}
          </button>
          {success ? <span className="success-text">{success}</span> : null}
          {error ? <span className="error-text">{error}</span> : null}
        </div>
      </form>
    </div>
  );
}
