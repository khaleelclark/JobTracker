"use client";

import { useRouter } from "next/navigation";
import { FormEvent, WheelEvent, useRef, useState } from "react";
import {
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
} from "@mui/material";
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
}

interface ApplicationOption {
  id: string;
  companyName: string;
  roleTitle: string;
}

interface ResumeLibraryProps {
  resumes: ResumeOption[];
  applications: ApplicationOption[];
}

export function ResumeLibrary({ resumes, applications }: ResumeLibraryProps) {
  const router = useRouter();
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const [editingResume, setEditingResume] = useState<ResumeOption | null>(null);
  const [editLinkedApplications, setEditLinkedApplications] = useState<ApplicationOption[]>([]);
  const [deleteResume, setDeleteResume] = useState<ResumeOption | null>(null);
  const [previewResume, setPreviewResume] = useState<ResumeOption | null>(null);
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

    try {
      const data = new FormData(event.currentTarget);
      const payload = {
        name: String(data.get("name") ?? "").trim(),
        filePath: String(data.get("filePath") ?? "").trim(),
        extractedText: String(data.get("extractedText") ?? "").trim() || null,
        linkedApplicationIds: editLinkedApplications.map((a) => a.id),
      };

      const response = await fetch(`/api/resumes/${editingResume.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: unknown;
        };
        const message =
          typeof body.error === "string"
            ? body.error
            : `Unable to update resume (${response.status})`;
        throw new Error(message);
      }

      setEditingResume(null);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "Unknown error",
      );
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
        const body = (await response.json().catch(() => ({}))) as {
          error?: unknown;
        };
        const message =
          typeof body.error === "string"
            ? body.error
            : `Unable to delete resume (${response.status})`;
        throw new Error(message);
      }

      setDeleteResume(null);
      router.refresh();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Unknown error",
      );
      setDeleting(false);
    }
  }

  function handlePreviewWheel(event: WheelEvent<HTMLDivElement>) {
    const frameWindow = previewFrameRef.current?.contentWindow;
    if (!frameWindow) {
      return;
    }

    event.preventDefault();
    frameWindow.scrollBy({
      top: event.deltaY,
      left: event.deltaX,
      behavior: "auto",
    });
  }

  if (resumes.length === 0) {
    return <p className="muted">No resumes uploaded yet.</p>;
  }

  return (
    <>
      <ul className="clean-list">
        {resumes.map(resume => (
          <li key={resume.id} className="list-row">
            <div className="resume-library-text">
              <button
                type="button"
                className="text-link-button"
                onClick={() => setPreviewResume(resume)}
              >
                <strong>{resume.name}</strong>
              </button>
              <div className="muted resume-library-path">{resume.filePath}</div>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                flexShrink: 0,
                gap: "0.35rem",
              }}
            >
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
                onClick={() => {
                  setEditingResume(resume);
                  setEditLinkedApplications(
                    applications.filter((a) => resume.linkedApplicationIds.includes(a.id)),
                  );
                }}
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
        open={Boolean(previewResume)}
        onClose={() => setPreviewResume(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>{previewResume?.name}</DialogTitle>
        <DialogContent onWheel={handlePreviewWheel}>
          {previewResume ? (
            <div className="stack-md">
              <iframe
                ref={previewFrameRef}
                title={`Preview ${previewResume.name}`}
                src={`/api/resumes/${previewResume.id}/preview`}
                className="resume-preview-frame"
              />
              <div>
                <h3>Extracted Text</h3>
                {previewResume.extractedText ? (
                  <pre className="resume-preview-text">
                    {previewResume.extractedText}
                  </pre>
                ) : (
                  <p className="muted">No extracted text stored.</p>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
        <DialogActions>
          {previewResume ? (
            <Button
              component="a"
              href={`/api/resumes/${previewResume.id}/download`}
              endIcon={<DownloadIcon sx={{ fontSize: "1rem" }} />}
            >
              Download
            </Button>
          ) : null}
          <Button onClick={() => setPreviewResume(null)}>Close</Button>
        </DialogActions>
      </Dialog>

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
            <form
              id="edit-resume-form"
              className="form-card"
              onSubmit={handleEditSubmit}
            >
              <label>
                Display Name
                <input
                  name="name"
                  maxLength={200}
                  required
                  defaultValue={editingResume.name}
                />
              </label>
              <label>
                File Path
                <input
                  name="filePath"
                  maxLength={1000}
                  required
                  defaultValue={editingResume.filePath}
                />
              </label>
              <Autocomplete
                multiple
                options={applications}
                getOptionLabel={(o) => `${o.companyName} - ${o.roleTitle}`}
                value={editLinkedApplications}
                onChange={(_, val) => setEditLinkedApplications(val)}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                renderOption={(props, option) => <li {...props} key={option.id}>{option.companyName} - {option.roleTitle}</li>}
                renderInput={(params) => <TextField {...params} label="Link to Applications" size="small" />}
              />
              <label>
                Extracted Text (optional)
                <textarea
                  name="extractedText"
                  rows={5}
                  maxLength={50000}
                  defaultValue={editingResume.extractedText ?? ""}
                />
              </label>
            </form>
          ) : null}
          {error ? <p className="error-text">{error}</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingResume(null)} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-resume-form"
            disabled={saving}
            endIcon={<SaveIcon sx={{ fontSize: "1rem" }} />}
          >
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
          Delete <strong>{deleteResume?.name}</strong> and remove its links from
          applications and skills?
          {error ? <p className="error-text">{error}</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteResume(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleDeleteConfirmed()}
            disabled={deleting}
            endIcon={<DeleteIcon sx={{ fontSize: "1rem" }} />}
          >
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
