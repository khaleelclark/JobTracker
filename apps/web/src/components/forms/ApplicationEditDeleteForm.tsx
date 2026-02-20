"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toTitleCaseLabel } from "@/lib/format";

const STATUS_OPTIONS = [
  "interested",
  "applied",
  "under_review",
  "interviewing",
  "offered",
  "rejected",
  "withdrawn",
  "archived",
] as const;

interface ApplicationEditDeleteFormProps {
  application: {
    id: string;
    companyName: string;
    roleTitle: string;
    genericStatus: string;
    preciseStatus: string | null;
    roleFamily: string | null;
    roleLevel: string | null;
    appliedAtIso: string;
    notes: string | null;
  };
}

function toDateInputValue(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toIsoFromDateInput(raw: string): string {
  if (!raw) {
    return new Date().toISOString();
  }

  return new Date(`${raw}T12:00:00`).toISOString();
}

export function ApplicationEditDeleteForm({ application }: ApplicationEditDeleteFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      companyName: String(data.get("companyName") ?? "").trim(),
      roleTitle: String(data.get("roleTitle") ?? "").trim(),
      genericStatus: String(data.get("genericStatus") ?? "applied"),
      preciseStatus: String(data.get("preciseStatus") ?? "").trim() || null,
      roleFamily: String(data.get("roleFamily") ?? "").trim() || null,
      roleLevel: String(data.get("roleLevel") ?? "").trim() || null,
      appliedAt: toIsoFromDateInput(String(data.get("appliedAt") ?? "")),
      notes: String(data.get("notes") ?? "").trim() || null,
    };

    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to update application");
      }

      setSuccess("Application updated.");
      router.refresh();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unknown error";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm("Delete this application record and all linked activity?");
    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/applications/${application.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to delete application");
      }

      router.push("/applications");
      router.refresh();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Unknown error";
      setError(message);
      setDeleting(false);
    }
  }

  return (
    <form className="card stack-md" onSubmit={handleSave}>
      <h2>Edit Application</h2>

      <div className="form-grid form-grid-2">
        <label>
          Company
          <input name="companyName" required maxLength={200} defaultValue={application.companyName} />
        </label>

        <label>
          Role Title
          <input name="roleTitle" required maxLength={200} defaultValue={application.roleTitle} />
        </label>

        <label>
          Status
          <select name="genericStatus" defaultValue={application.genericStatus}>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {toTitleCaseLabel(status)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Applied Date
          <input name="appliedAt" type="date" defaultValue={toDateInputValue(application.appliedAtIso)} />
        </label>

        <label>
          Role Family
          <input name="roleFamily" maxLength={120} defaultValue={application.roleFamily ?? ""} />
        </label>

        <label>
          Role Level
          <input name="roleLevel" maxLength={120} defaultValue={application.roleLevel ?? ""} />
        </label>
      </div>

      <label>
        Precise Status
        <input name="preciseStatus" maxLength={200} defaultValue={application.preciseStatus ?? ""} />
      </label>

      <label>
        Notes
        <textarea name="notes" rows={4} maxLength={4000} defaultValue={application.notes ?? ""} />
      </label>

      <div className="form-actions">
        <button type="submit" disabled={saving || deleting}>
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button type="button" disabled={saving || deleting} onClick={handleDelete}>
          {deleting ? "Deleting..." : "Delete Application"}
        </button>
        {success ? <span className="success-text">{success}</span> : null}
        {error ? <span className="error-text">{error}</span> : null}
      </div>
    </form>
  );
}
