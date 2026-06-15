"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridRowId,
} from "@mui/x-data-grid";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import { fmtLocalDateTime, toTitleCaseLabel } from "@/lib/format";

export interface EventRow {
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
  if (!raw) return new Date().toISOString();
  return new Date(`${raw}T12:00:00`).toISOString();
}

export function EngagementEventsCrudTable({ events }: EngagementEventsCrudTableProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [viewingEvent, setViewingEvent] = useState<EventRow | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [deleteEvent, setDeleteEvent] = useState<EventRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const id = window.setTimeout(() => setSuccess(null), 3000);
    return () => window.clearTimeout(id);
  }, [success]);

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingEvent) return;
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
      const res = await fetch(`/api/engagement-events/${editingEvent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Unable to update engagement event");
      setEditingEvent(null);
      setSuccess("Event updated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteEvent) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/engagement-events/${deleteEvent.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Unable to delete engagement event");
      setDeleteEvent(null);
      setSuccess("Event deleted.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setDeleting(false);
    }
  }

  const columns = useMemo<GridColDef<EventRow>[]>(
    () => [
      {
        field: "eventType",
        headerName: "Event Type",
        flex: 1,
        minWidth: 160,
        headerAlign: "center",
        align: "center",
        valueGetter: (_v, row) => toTitleCaseLabel(row.eventType),
      },
      {
        field: "occurredAtIso",
        headerName: "Occurred",
        flex: 1,
        minWidth: 160,
        headerAlign: "center",
        align: "center",
        valueGetter: (_v, row) => fmtLocalDateTime(row.occurredAtIso),
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 100,
        sortable: false,
        filterable: false,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<EventRow>) => (
          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
            <IconButton
              size="small"
              title="Edit"
              sx={{ backgroundColor: "transparent", border: 0, boxShadow: "none", "&:hover": { backgroundColor: "transparent" } }}
              onClick={(e) => { e.stopPropagation(); setEditingEvent(params.row); setError(null); }}
            >
              <EditIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
            <IconButton
              size="small"
              title="Delete"
              sx={{ backgroundColor: "transparent", border: 0, boxShadow: "none", "&:hover": { backgroundColor: "transparent" } }}
              onClick={(e) => { e.stopPropagation(); setDeleteEvent(params.row); setError(null); }}
            >
              <DeleteIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
          </Box>
        ),
      },
    ],
    [],
  );

  if (events.length === 0) {
    return <p className="muted">No engagement events.</p>;
  }

  return (
    <>
      {success ? <p className="success-text">{success}</p> : null}
      {error && !editingEvent && !deleteEvent ? <p className="error-text">{error}</p> : null}

      <Box sx={{ width: "100%", overflowX: "hidden", border: "1px solid rgba(15, 74, 134, 0.22)", borderRadius: "8px" }}>
        <DataGrid
          rows={events}
          columns={columns}
          autoHeight
          getRowId={(row: EventRow): GridRowId => row.id}
          rowHeight={58}
          onRowClick={(params) => { setViewingEvent(params.row); setError(null); }}
          disableRowSelectionOnClick
          disableColumnResize
          pageSizeOptions={isMobile ? [5, 10] : [10, 25]}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
          sx={{
            backgroundColor: "#fff",
            border: "none",
            width: "100%",
            "& .MuiDataGrid-columnHeader, & .MuiDataGrid-scrollbarFiller": { backgroundColor: "rgba(15, 74, 134, 0.06)" },
            "--DataGrid-t-color-border-base": "rgba(15, 74, 134, 0.22)",
            "& .MuiDataGrid-footerContainer": { backgroundColor: "rgba(15, 74, 134, 0.04)" },
            "& .MuiDataGrid-row": { cursor: "pointer" },
            "& .MuiDataGrid-cell": { display: "flex", alignItems: "center" },
          }}
        />
      </Box>

      {/* View dialog */}
      <Dialog open={Boolean(viewingEvent)} onClose={() => { setViewingEvent(null); setError(null); }} maxWidth="xs" fullWidth>
        <DialogTitle>{viewingEvent ? toTitleCaseLabel(viewingEvent.eventType) : ""}</DialogTitle>
        <DialogContent>
          {viewingEvent ? (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", pt: 0.5 }}>
              <Chip size="small" label={toTitleCaseLabel(viewingEvent.eventType)} />
              <Chip size="small" label={fmtLocalDateTime(viewingEvent.occurredAtIso)} variant="outlined" />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setEditingEvent(viewingEvent); setViewingEvent(null); setError(null); }}
            endIcon={<EditIcon sx={{ fontSize: "1rem" }} />}
          >
            Edit
          </Button>
          <Button onClick={() => { setViewingEvent(null); setError(null); }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={Boolean(editingEvent)}
        onClose={(_e, reason) => { if (reason === "backdropClick" || saving) return; setEditingEvent(null); setError(null); }}
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
                    <option key={eventType} value={eventType}>{toTitleCaseLabel(eventType)}</option>
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
          <Button onClick={() => { setEditingEvent(null); setError(null); }} disabled={saving}>Cancel</Button>
          <Button type="submit" form="edit-event-form" disabled={saving} endIcon={<SaveIcon sx={{ fontSize: "1rem" }} />}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={Boolean(deleteEvent)}
        onClose={(_e, reason) => { if (reason === "backdropClick" || deleting) return; setDeleteEvent(null); setError(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Event?</DialogTitle>
        <DialogContent>
          Delete <strong>{deleteEvent ? toTitleCaseLabel(deleteEvent.eventType) : ""}</strong>?
          {error ? <p className="error-text">{error}</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteEvent(null); setError(null); }} disabled={deleting}>Cancel</Button>
          <Button onClick={() => void handleDeleteConfirmed()} disabled={deleting} endIcon={<DeleteIcon sx={{ fontSize: "1rem" }} />}>
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
