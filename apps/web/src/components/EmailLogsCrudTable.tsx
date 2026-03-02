"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { toTitleCaseLabel } from "@/lib/format";

interface ApplicationOption {
  id: string;
  companyName: string;
  roleTitle: string;
}

interface EmailLogRow {
  id: string;
  applicationId: string;
  channel: "email" | "linkedin";
  direction: "inbound" | "outbound";
  isHuman: boolean;
  subject: string;
  body: string;
  notes: string | null;
  createdAtIso: string;
  applicationCompanyName: string;
}

interface EmailLogsCrudTableProps {
  emails: EmailLogRow[];
  applications: ApplicationOption[];
}

function nullableTrimmedText(value: FormDataEntryValue | null): string | null {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export function EmailLogsCrudTable({ emails, applications }: EmailLogsCrudTableProps) {
  const router = useRouter();
  const [editingEmail, setEditingEmail] = useState<EmailLogRow | null>(null);
  const [viewingEmail, setViewingEmail] = useState<EmailLogRow | null>(null);
  const [deleteEmail, setDeleteEmail] = useState<EmailLogRow | null>(null);
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
    if (!editingEmail) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const data = new FormData(event.currentTarget);
    const payload = {
      applicationId: String(data.get("applicationId") ?? "").trim(),
      channel: String(data.get("channel") ?? "email"),
      direction: String(data.get("direction") ?? "inbound"),
      isHuman: data.get("isHuman") === "on",
      subject: String(data.get("subject") ?? "").trim(),
      body: String(data.get("body") ?? "").trim(),
      notes: nullableTrimmedText(data.get("notes")),
    };

    try {
      const response = await fetch(`/api/emails/${editingEmail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to update communication log");
      }

      setEditingEmail(null);
      setSuccess("Communication log updated.");
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteEmail) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/emails/${deleteEmail.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to delete communication log");
      }

      setDeleteEmail(null);
      setSuccess("Communication log deleted.");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unknown error");
      setDeleting(false);
    }
  }

  if (emails.length === 0) {
    return <p className="muted">No communication logs yet.</p>;
  }

  return (
    <>
      {success ? <p className="success-text">{success}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Direction</th>
            <th>Channel</th>
            <th>Human</th>
            <th>Subject</th>
            <th>Notes</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {emails.map((email) => (
            <tr key={email.id}>
              <td>{email.applicationCompanyName}</td>
              <td>{toTitleCaseLabel(email.direction)}</td>
              <td>{toTitleCaseLabel(email.channel)}</td>
              <td>{email.isHuman ? "Yes" : "No"}</td>
              <td>{email.subject}</td>
              <td>{email.notes ?? "-"}</td>
              <td>{new Date(email.createdAtIso).toLocaleString()}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <IconButton
                    size="small"
                    aria-label={`View communication log ${email.subject}`}
                    title="View"
                    onClick={() => {
                      setViewingEmail(email);
                      setError(null);
                    }}
                  >
                    <VisibilityIcon sx={{ fontSize: "1rem" }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={`Edit communication log ${email.subject}`}
                    title="Edit"
                    onClick={() => {
                      setEditingEmail(email);
                      setError(null);
                    }}
                  >
                    <EditIcon sx={{ fontSize: "1rem" }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    aria-label={`Delete communication log ${email.subject}`}
                    title="Delete"
                    onClick={() => {
                      setDeleteEmail(email);
                      setError(null);
                    }}
                  >
                    <DeleteIcon sx={{ fontSize: "1rem" }} />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog
        open={Boolean(viewingEmail)}
        onClose={(_event, reason) => {
          if (reason === "backdropClick") {
            return;
          }
          setViewingEmail(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Communication Log Details</DialogTitle>
        <DialogContent>
          {viewingEmail ? (
            <div className="stack-md">
              <p><strong>Company:</strong> {viewingEmail.applicationCompanyName}</p>
              <p><strong>Channel:</strong> {toTitleCaseLabel(viewingEmail.channel)}</p>
              <p><strong>Direction:</strong> {toTitleCaseLabel(viewingEmail.direction)}</p>
              <p><strong>Human:</strong> {viewingEmail.isHuman ? "Yes" : "No"}</p>
              <p><strong>Subject:</strong> {viewingEmail.subject}</p>
              <p><strong>Notes:</strong> {viewingEmail.notes ?? "-"}</p>
              <p><strong>Created:</strong> {new Date(viewingEmail.createdAtIso).toLocaleString()}</p>
              <div>
                <strong>Body</strong>
                <pre style={{ whiteSpace: "pre-wrap", marginTop: "0.5rem" }}>{viewingEmail.body}</pre>
              </div>
            </div>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingEmail(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editingEmail)}
        onClose={(_event, reason) => {
          if (reason === "backdropClick" || saving) {
            return;
          }
          setEditingEmail(null);
          setError(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Communication Log</DialogTitle>
        <DialogContent>
          {editingEmail ? (
            <form id="edit-email-log-form" className="form-card" onSubmit={handleEditSubmit}>
              <label>
                Application
                <select name="applicationId" required defaultValue={editingEmail.applicationId}>
                  {applications.map((application) => (
                    <option key={application.id} value={application.id}>
                      {application.companyName} - {application.roleTitle}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Channel
                <select name="channel" defaultValue={editingEmail.channel}>
                  <option value="email">Email</option>
                  <option value="linkedin">LinkedIn</option>
                </select>
              </label>

              <label>
                Direction
                <select name="direction" defaultValue={editingEmail.direction}>
                  <option value="inbound">Inbound</option>
                  <option value="outbound">Outbound</option>
                </select>
              </label>

              <label className="checkbox-row">
                <input name="isHuman" type="checkbox" defaultChecked={editingEmail.isHuman} />
                Human sender/recipient
              </label>

              <label>
                Subject
                <input name="subject" maxLength={300} required defaultValue={editingEmail.subject} />
              </label>

              <label>
                Body
                <textarea name="body" rows={6} maxLength={12000} required defaultValue={editingEmail.body} />
              </label>

              <label>
                Notes (optional)
                <textarea name="notes" rows={3} maxLength={4000} defaultValue={editingEmail.notes ?? ""} />
              </label>
            </form>
          ) : null}
          {error ? <p className="error-text">{error}</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingEmail(null)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-email-log-form" disabled={saving} endIcon={<SaveIcon sx={{ fontSize: "1rem" }} />}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteEmail)}
        onClose={(_event, reason) => {
          if (reason === "backdropClick" || deleting) {
            return;
          }
          setDeleteEmail(null);
          setError(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Communication Log?</DialogTitle>
        <DialogContent>
          Delete <strong>{deleteEmail?.subject}</strong>?
          {error ? <p className="error-text">{error}</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteEmail(null)} disabled={deleting}>
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
