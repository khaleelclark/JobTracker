"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { toTitleCaseLabel } from "@/lib/format";

interface InterviewRow {
  id: string;
  applicationId: string;
  roundIndex: number;
  roundLabel: string;
  scheduledAtIso: string;
  status: "scheduled" | "completed" | "cancelled";
}

interface InterviewsCrudTableProps {
  interviews: InterviewRow[];
}

const INTERVIEW_STATUS_OPTIONS = ["scheduled", "completed", "cancelled"] as const;

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

export function InterviewsCrudTable({ interviews }: InterviewsCrudTableProps) {
  const router = useRouter();
  const [viewingInterview, setViewingInterview] = useState<InterviewRow | null>(null);
  const [editingInterview, setEditingInterview] = useState<InterviewRow | null>(null);
  const [deleteInterview, setDeleteInterview] = useState<InterviewRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!success) {
      return;
    }
    const timeoutId = window.setTimeout(() => setSuccess(null), 3000);
    return () => window.clearTimeout(timeoutId);
  }, [success]);

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingInterview) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const data = new FormData(event.currentTarget);
    const payload = {
      applicationId: editingInterview.applicationId,
      roundIndex: Number(data.get("roundIndex")),
      roundLabel: String(data.get("roundLabel") ?? "").trim(),
      scheduledAt: toIsoFromDateInput(String(data.get("scheduledAt") ?? "")),
      status: String(data.get("status") ?? "scheduled"),
    };

    try {
      const response = await fetch(`/api/interviews/${editingInterview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { detail?: unknown };
        const detail = typeof body.detail === "string" ? body.detail : null;
        throw new Error(detail ?? "Unable to update interview");
      }

      setEditingInterview(null);
      setSuccess("Interview updated.");
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteInterview) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/interviews/${deleteInterview.id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Unable to delete interview");
      }

      setDeleteInterview(null);
      setSuccess("Interview deleted.");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unknown error");
      setDeleting(false);
    }
  }

  if (interviews.length === 0) {
    return <p className="muted">No interviews logged.</p>;
  }

  return (
    <>
      {success ? <p className="success-text">{success}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>Round</th>
            <th>Status</th>
            <th>Scheduled</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {interviews.map((interview) => (
            <tr key={interview.id}>
              <td>
                {interview.roundLabel} ({interview.roundIndex})
              </td>
              <td>{toTitleCaseLabel(interview.status)}</td>
              <td>{new Date(interview.scheduledAtIso).toLocaleString()}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <IconButton size="small" title="View" onClick={() => setViewingInterview(interview)}>
                    <VisibilityIcon sx={{ fontSize: "1rem" }} />
                  </IconButton>
                  <IconButton size="small" title="Edit" onClick={() => setEditingInterview(interview)}>
                    <EditIcon sx={{ fontSize: "1rem" }} />
                  </IconButton>
                  <IconButton size="small" title="Delete" onClick={() => setDeleteInterview(interview)}>
                    <DeleteIcon sx={{ fontSize: "1rem" }} />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog
        open={Boolean(viewingInterview)}
        onClose={(_event, reason) => {
          if (reason === "backdropClick") {
            return;
          }
          setViewingInterview(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Interview Details</DialogTitle>
        <DialogContent>
          {viewingInterview ? (
            <div className="stack-md">
              <p><strong>Round Index:</strong> {viewingInterview.roundIndex}</p>
              <p><strong>Round Label:</strong> {viewingInterview.roundLabel}</p>
              <p><strong>Status:</strong> {toTitleCaseLabel(viewingInterview.status)}</p>
              <p><strong>Scheduled At:</strong> {new Date(viewingInterview.scheduledAtIso).toLocaleString()}</p>
            </div>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingInterview(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editingInterview)}
        onClose={(_event, reason) => {
          if (reason === "backdropClick" || saving) {
            return;
          }
          setEditingInterview(null);
          setError(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Interview</DialogTitle>
        <DialogContent>
          {editingInterview ? (
            <form id="edit-interview-form" className="form-card" onSubmit={handleEditSubmit}>
              <label>
                Round Index
                <input name="roundIndex" type="number" min={1} max={20} required defaultValue={editingInterview.roundIndex} />
              </label>
              <label>
                Round Label
                <input name="roundLabel" maxLength={100} required defaultValue={editingInterview.roundLabel} />
              </label>
              <label>
                Scheduled Date
                <input name="scheduledAt" type="date" required defaultValue={toDateInputValue(editingInterview.scheduledAtIso)} />
              </label>
              <label>
                Status
                <select name="status" defaultValue={editingInterview.status}>
                  {INTERVIEW_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {toTitleCaseLabel(status)}
                    </option>
                  ))}
                </select>
              </label>
            </form>
          ) : null}
          {error ? <p className="error-text">{error}</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingInterview(null)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-interview-form" disabled={saving} endIcon={<SaveIcon sx={{ fontSize: "1rem" }} />}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteInterview)}
        onClose={(_event, reason) => {
          if (reason === "backdropClick" || deleting) {
            return;
          }
          setDeleteInterview(null);
          setError(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Interview?</DialogTitle>
        <DialogContent>
          Delete interview <strong>{deleteInterview?.roundLabel}</strong>?
          {error ? <p className="error-text">{error}</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteInterview(null)} disabled={deleting}>
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
