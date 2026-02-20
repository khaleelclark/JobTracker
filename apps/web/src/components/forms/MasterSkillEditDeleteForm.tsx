"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface MasterSkillEditDeleteFormProps {
  skill: {
    id: string;
    name: string;
    category: string | null;
    notes: string | null;
    linkedResumeCount: number;
    linkedResumeIds: string[];
  };
  resumeOptions: Array<{ id: string; name: string }>;
}

export function MasterSkillEditDeleteForm({ skill, resumeOptions }: MasterSkillEditDeleteFormProps) {
  const router = useRouter();
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    const payload = {
      name: String(data.get("name") ?? "").trim(),
      category: String(data.get("category") ?? "").trim() || null,
      notes: String(data.get("notes") ?? "").trim() || null,
      linkedResumeIds: data.getAll("linkedResumeIds").map((value) => String(value)),
    };

    try {
      const response = await fetch(`/api/master-skills/${skill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to update skill");
      }

      setSuccess("Skill updated.");
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = setTimeout(() => {
        setSuccess(null);
      }, 3000);
      setIsEditing(false);
      router.refresh();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : "Unknown error";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/master-skills/${skill.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to delete skill");
      }

      setIsDeleteModalOpen(false);
      router.refresh();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Unknown error";
      setError(message);
      setDeleting(false);
    }
  }

  function handleStartEdit() {
    setError(null);
    setSuccess(null);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setError(null);
    setSuccess(null);
    setIsEditing(false);
  }

  return (
    <div className="card">
      {isEditing ? (
        <form className="stack-sm" onSubmit={handleSave}>
          <div className="form-grid form-grid-2">
            <label>
              Skill Name
              <input name="name" required maxLength={120} defaultValue={skill.name} />
            </label>

            <label>
              Category
              <input name="category" maxLength={120} defaultValue={skill.category ?? ""} />
            </label>
          </div>

          <label>
            Linked Resumes
            <select
              name="linkedResumeIds"
              multiple
              size={Math.min(4, Math.max(2, resumeOptions.length))}
              defaultValue={skill.linkedResumeIds}
            >
              {resumeOptions.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Notes
            <textarea name="notes" rows={2} maxLength={2000} defaultValue={skill.notes ?? ""} />
          </label>

          <div className="form-actions">
            <button type="submit" disabled={saving || deleting}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={handleCancelEdit} disabled={saving || deleting}>
              Cancel
            </button>
            <button type="button" onClick={() => setIsDeleteModalOpen(true)} disabled={saving || deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="list-row">
            <div>
              <strong>{skill.name}</strong>
              <span className="muted"> · {skill.category ?? "Uncategorized"}</span>
              {skill.notes ? <span className="muted"> · {skill.notes}</span> : null}
            </div>
            <div className="muted">
              {skill.linkedResumeCount} resume{skill.linkedResumeCount === 1 ? "" : "s"}
            </div>
            <div className="form-actions">
              <button type="button" onClick={handleStartEdit} disabled={deleting}>
                Edit
              </button>
              <button type="button" onClick={() => setIsDeleteModalOpen(true)} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </>
      )}
      {success ? <span className="success-text">{success}</span> : null}
      {error ? <span className="error-text">{error}</span> : null}

      {isDeleteModalOpen ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Delete skill confirmation">
          <div className="modal-card stack-sm">
            <h3>Delete Skill</h3>
            <p className="muted">
              Delete <strong>{skill.name}</strong> from your master skills list?
            </p>
            <div className="form-actions">
              <button type="button" onClick={handleConfirmDelete} disabled={deleting || saving}>
                {deleting ? "Deleting..." : "Confirm Delete"}
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleting || saving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
