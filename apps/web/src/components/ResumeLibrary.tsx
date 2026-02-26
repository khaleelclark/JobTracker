"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";

interface ResumeOption {
  id: string;
  name: string;
  filePath: string;
  extractedText: string | null;
  linkedApplicationIds: string[];
  linkedSkillIds: string[];
}

interface ApplicationOption {
  id: string;
  companyName: string;
  roleTitle: string;
}

interface SkillOption {
  id: string;
  name: string;
  category: string | null;
}

interface ResumeLibraryProps {
  resumes: ResumeOption[];
  applications: ApplicationOption[];
  skills: SkillOption[];
}

export function ResumeLibrary({ resumes, applications, skills }: ResumeLibraryProps) {
  const router = useRouter();
  const [editingResume, setEditingResume] = useState<ResumeOption | null>(null);
  const [deleteResume, setDeleteResume] = useState<ResumeOption | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingResume) {
      return;
    }

    setSaving(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name") ?? "").trim(),
      filePath: String(data.get("filePath") ?? "").trim(),
      extractedText: String(data.get("extractedText") ?? "").trim() || null,
      linkedApplicationIds: data.getAll("linkedApplicationIds").map((value) => String(value)),
      linkedSkillIds: data.getAll("linkedSkillIds").map((value) => String(value)),
    };

    try {
      const response = await fetch(`/api/resumes/${editingResume.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        const message = typeof body.error === "string" ? body.error : `Unable to update resume (${response.status})`;
        throw new Error(message);
      }

      setEditingResume(null);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteResume) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/resumes/${deleteResume.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        const message = typeof body.error === "string" ? body.error : `Unable to delete resume (${response.status})`;
        throw new Error(message);
      }

      setDeleteResume(null);
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unknown error");
      setDeleting(false);
    }
  }

  if (resumes.length === 0) {
    return <p className="muted">No resumes uploaded yet.</p>;
  }

  return (
    <>
      <ul className="clean-list">
        {resumes.map((resume) => (
          <li key={resume.id} className="list-row">
            <div>
              <strong>{resume.name}</strong>
              <div className="muted">{resume.filePath}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <IconButton
                size="small"
                aria-label={`Download resume ${resume.name}`}
                title="Download"
                component="a"
                href={`/api/resumes/${resume.id}/download`}
              >
                <DownloadIcon sx={{ fontSize: "1rem" }} />
              </IconButton>
              <IconButton
                size="small"
                aria-label={`Edit resume ${resume.name}`}
                title="Edit"
                onClick={() => setEditingResume(resume)}
              >
                <EditIcon sx={{ fontSize: "1rem" }} />
              </IconButton>
              <IconButton
                size="small"
                aria-label={`Delete resume ${resume.name}`}
                title="Delete"
                onClick={() => setDeleteResume(resume)}
              >
                <DeleteIcon sx={{ fontSize: "1rem" }} />
              </IconButton>
            </div>
          </li>
        ))}
      </ul>

      <Dialog
        open={Boolean(editingResume)}
        onClose={(_event, reason) => {
          if (reason === "backdropClick" || saving) {
            return;
          }
          setEditingResume(null);
          setError(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Resume</DialogTitle>
        <DialogContent>
          {editingResume ? (
            <form id="edit-resume-form" className="form-card" onSubmit={handleEditSubmit}>
              <label>
                Display Name
                <input name="name" maxLength={200} required defaultValue={editingResume.name} />
              </label>
              <label>
                File Path
                <input name="filePath" maxLength={1000} required defaultValue={editingResume.filePath} />
              </label>
              <label>
                Link to Applications
                <select
                  name="linkedApplicationIds"
                  multiple
                  defaultValue={editingResume.linkedApplicationIds}
                  size={Math.min(8, Math.max(3, applications.length))}
                >
                  {applications.map((application) => (
                    <option key={application.id} value={application.id}>
                      {application.companyName} - {application.roleTitle}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Link to Master Skills
                <select
                  name="linkedSkillIds"
                  multiple
                  defaultValue={editingResume.linkedSkillIds}
                  size={Math.min(8, Math.max(3, skills.length))}
                >
                  {skills.map((skill) => (
                    <option key={skill.id} value={skill.id}>
                      {skill.name}
                      {skill.category ? ` (${skill.category})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Extracted Text (optional)
                <textarea name="extractedText" rows={5} maxLength={50000} defaultValue={editingResume.extractedText ?? ""} />
              </label>
            </form>
          ) : null}
          {error ? <p className="error-text">{error}</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingResume(null)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-resume-form" disabled={saving} endIcon={<SaveIcon sx={{ fontSize: "1rem" }} />}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteResume)}
        onClose={(_event, reason) => {
          if (reason === "backdropClick" || deleting) {
            return;
          }
          setDeleteResume(null);
          setError(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Resume?</DialogTitle>
        <DialogContent>
          Delete <strong>{deleteResume?.name}</strong> and remove its links from applications and skills?
          {error ? <p className="error-text">{error}</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteResume(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={() => void handleDeleteConfirmed()} disabled={deleting} endIcon={<DeleteIcon sx={{ fontSize: "1rem" }} />}>
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
