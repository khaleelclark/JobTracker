"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { toTitleCaseLabel } from "@/lib/format";

interface EventRow {
  id: string;
  applicationId: string;
  eventType: "recruiter_reply" | "phone_screen" | "interview_round" | "offer" | "rejection_automated" | "rejection_human" | "rejection";
  occurredAtIso: string;
}

interface EngagementEventsCrudTableProps {
  events: EventRow[];
}

const EVENT_TYPES = [
  "recruiter_reply",
  "phone_screen",
  "interview_round",
  "offer",
  "rejection_automated",
  "rejection_human",
] as const;

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

export function EngagementEventsCrudTable({ events }: EngagementEventsCrudTableProps) {
  const router = useRouter();
  const [viewingEvent, setViewingEvent] = useState<EventRow | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [deleteEvent, setDeleteEvent] = useState<EventRow | null>(null);
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
    if (!editingEvent) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const data = new FormData(event.currentTarget);
    const payload = {
      applicationId: editingEvent.applicationId,
      eventType: String(data.get("eventType") ?? "recruiter_reply"),
      occurredAt: toIsoFromDateInput(String(data.get("occurredAt") ?? "")),
    };

    try {
      const response = await fetch(`/api/engagement-events/${editingEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Unable to update engagement event");
      }

      setEditingEvent(null);
      setSuccess("Engagement event updated.");
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteEvent) {
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/engagement-events/${deleteEvent.id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Unable to delete engagement event");
      }

      setDeleteEvent(null);
      setSuccess("Engagement event deleted.");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unknown error");
      setDeleting(false);
    }
  }

  if (events.length === 0) {
    return <p className="muted">No events.</p>;
  }

  return (
    <>
      {success ? <p className="success-text">{success}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <table>
        <thead>
          <tr>
            <th>Event Type</th>
            <th>Occurred</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((item) => (
            <tr key={item.id}>
              <td>{toTitleCaseLabel(item.eventType)}</td>
              <td>{new Date(item.occurredAtIso).toLocaleString()}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <IconButton size="small" title="View" onClick={() => setViewingEvent(item)}>
                    <VisibilityIcon sx={{ fontSize: "1rem" }} />
                  </IconButton>
                  <IconButton size="small" title="Edit" onClick={() => setEditingEvent(item)}>
                    <EditIcon sx={{ fontSize: "1rem" }} />
                  </IconButton>
                  <IconButton size="small" title="Delete" onClick={() => setDeleteEvent(item)}>
                    <DeleteIcon sx={{ fontSize: "1rem" }} />
                  </IconButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog
        open={Boolean(viewingEvent)}
        onClose={(_event, reason) => {
          if (reason === "backdropClick") {
            return;
          }
          setViewingEvent(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Engagement Event Details</DialogTitle>
        <DialogContent>
          {viewingEvent ? (
            <div className="stack-md">
              <p><strong>Event Type:</strong> {toTitleCaseLabel(viewingEvent.eventType)}</p>
              <p><strong>Occurred At:</strong> {new Date(viewingEvent.occurredAtIso).toLocaleString()}</p>
            </div>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingEvent(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editingEvent)}
        onClose={(_event, reason) => {
          if (reason === "backdropClick" || saving) {
            return;
          }
          setEditingEvent(null);
          setError(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Engagement Event</DialogTitle>
        <DialogContent>
          {editingEvent ? (
            <form id="edit-event-form" className="form-card" onSubmit={handleEditSubmit}>
              <label>
                Event Type
                <select name="eventType" defaultValue={editingEvent.eventType}>
                  {EVENT_TYPES.map((eventType) => (
                    <option key={eventType} value={eventType}>
                      {toTitleCaseLabel(eventType)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Occurred Date
                <input name="occurredAt" type="date" required defaultValue={toDateInputValue(editingEvent.occurredAtIso)} />
              </label>
            </form>
          ) : null}
          {error ? <p className="error-text">{error}</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingEvent(null)} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="edit-event-form" disabled={saving} endIcon={<SaveIcon sx={{ fontSize: "1rem" }} />}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(deleteEvent)}
        onClose={(_event, reason) => {
          if (reason === "backdropClick" || deleting) {
            return;
          }
          setDeleteEvent(null);
          setError(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Event?</DialogTitle>
        <DialogContent>
          Delete event <strong>{deleteEvent ? toTitleCaseLabel(deleteEvent.eventType) : ""}</strong>?
          {error ? <p className="error-text">{error}</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteEvent(null)} disabled={deleting}>
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
