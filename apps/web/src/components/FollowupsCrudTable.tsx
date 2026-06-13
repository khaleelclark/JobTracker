"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import { toTitleCaseLabel } from "@/lib/format";

export interface FollowupRow {
  id: string;
  applicationId: string;
  attemptIndex: number;
  channel: "email" | "linkedin" | "portal" | "other";
  sentAtIso: string;
  resultStatus: string;
  responseType: string | null;
  resolvedAtIso: string | null;
}

interface FollowupsCrudTableProps {
  followups: FollowupRow[];
}

const FOLLOWUP_CHANNELS = ["email", "linkedin", "portal", "other"] as const;
const RESULT_STATUS_OPTIONS = ["pending", "resolved", "expired_no_response"] as const;
const RESPONSE_TYPE_OPTIONS = ["human_reply", "rejection_reply", "screen_scheduled", "interview_scheduled"] as const;

function notifyRejectedStatus(applicationId: string) {
  window.dispatchEvent(
    new CustomEvent("application-status-updated", { detail: { applicationId, status: "rejected" } }),
  );
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

export function FollowupsCrudTable({ followups }: FollowupsCrudTableProps) {
  const router = useRouter();
  const [editingFollowup, setEditingFollowup] = useState<FollowupRow | null>(null);
  const [deleteFollowup, setDeleteFollowup] = useState<FollowupRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccess(null);
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [success]);

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingFollowup) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const data = new FormData(event.currentTarget);
    const followupPayload = {
      applicationId: editingFollowup.applicationId,
      attemptIndex: Number(data.get("attemptIndex")),
      channel: String(data.get("channel") ?? "email"),
      sentAt: toIsoFromDateInput(String(data.get("sentAt") ?? "")),
    };
    const responseType = String(data.get("responseType") ?? "").trim() || null;
    const resolvedAtRaw = String(data.get("resolvedAt") ?? "").trim();
    const resultPayload = {
      followupAttemptId: editingFollowup.id,
      resultStatus: String(data.get("resultStatus") ?? "pending"),
      responseType,
      resolvedAt: resolvedAtRaw ? new Date(`${resolvedAtRaw}T12:00:00`).toISOString() : null,
    };

    try {
      const [followupRes, resultRes] = await Promise.all([
        fetch(`/api/followups/${editingFollowup.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(followupPayload),
        }),
        fetch("/api/followup-results", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(resultPayload),
        }),
      ]);

      if (!followupRes.ok) {
        const body = (await followupRes.json().catch(() => ({}))) as { detail?: unknown };
        throw new Error(typeof body.detail === "string" ? body.detail : "Unable to update follow-up");
      }
      if (!resultRes.ok) {
        throw new Error("Unable to save follow-up result");
      }

      setEditingFollowup(null);
      setSuccess("Follow-up updated.");
      if (responseType === "rejection_reply") {
        notifyRejectedStatus(editingFollowup.applicationId);
      }
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteFollowup) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/followups/${deleteFollowup.id}`, { method: "DELETE" });

      if (!response.ok) {
        throw new Error("Unable to delete follow-up");
      }

      setDeleteFollowup(null);
      setSuccess("Follow-up deleted.");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unknown error");
      setDeleting(false);
    }
  }

  if (followups.length === 0) {
    return <p className="muted">No follow-up attempts.</p>;
  }

  return (
    <>
      {success ? <p className="success-text">{success}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>Attempt</th>
            <th>Channel</th>
            <th>Sent At</th>
            <th>Result</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {followups.map((followup) => (
            <tr key={followup.id}>
              <td>{followup.attemptIndex}</td>
              <td>{toTitleCaseLabel(followup.channel)}</td>
              <td>{new Date(followup.sentAtIso).toLocaleDateString()}</td>
              <td>{toTitleCaseLabel(followup.resultStatus)}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <IconButton size="small" title="Edit" onClick={() => setEditingFollowup(followup)}>
                    <EditIcon sx={{ fontSize: "1rem" }} />
                  </IconButton>
                  <IconButton size="small" title="Delete" onClick={() => setDeleteFollowup(followup)}>
                    <DeleteIcon sx={{ fontSize: "1rem" }} />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog
        open={Boolean(editingFollowup)}
        onClose={(_event, reason) => {
          if (reason === "backdropClick" || saving) {
            return;
          }
          setEditingFollowup(null);
          setError(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Follow-up</DialogTitle>
        <DialogContent>
          {editingFollowup ? (
            <form id="edit-followup-form" className="form-card" onSubmit={handleEditSubmit}>
              <div className="form-grid form-grid-2">
                <label>
                  Attempt Index
                  <input name="attemptIndex" type="number" min={1} max={20} required defaultValue={editingFollowup.attemptIndex} />
                </label>
                <label>
                  Channel
                  <select name="channel" defaultValue={editingFollowup.channel}>
                    {FOLLOWUP_CHANNELS.map((ch) => (
                      <option key={ch} value={ch}>{toTitleCaseLabel(ch)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Sent Date
                <input name="sentAt" type="date" required defaultValue={toDateInputValue(editingFollowup.sentAtIso)} />
              </label>
              <p className="muted" style={{ fontSize: "0.8rem", margin: "0.75rem 0 0.25rem" }}>Result</p>
              <div className="form-grid form-grid-2">
                <label>
                  Status
                  <select name="resultStatus" defaultValue={editingFollowup.resultStatus}>
                    {RESULT_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{toTitleCaseLabel(s)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Response Type
                  <select name="responseType" defaultValue={editingFollowup.responseType ?? ""}>
                    <option value="">None</option>
                    {RESPONSE_TYPE_OPTIONS.map((r) => (
                      <option key={r} value={r}>{toTitleCaseLabel(r)}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Resolved Date
                  <input name="resolvedAt" type="date" defaultValue={editingFollowup.resolvedAtIso ? toDateInputValue(editingFollowup.resolvedAtIso) : ""} />
                </label>
              </div>
            </form>
          ) : null}
          {error ? <p className="error-text">{error}</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingFollowup(null)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-followup-form" disabled={saving} endIcon={<SaveIcon sx={{ fontSize: "1rem" }} />}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteFollowup)}
        onClose={(_event, reason) => {
          if (reason === "backdropClick" || deleting) {
            return;
          }
          setDeleteFollowup(null);
          setError(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Follow-up?</DialogTitle>
        <DialogContent>
          Delete follow-up attempt <strong>{deleteFollowup?.attemptIndex}</strong>?
          {error ? <p className="error-text">{error}</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteFollowup(null)} disabled={deleting}>
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
