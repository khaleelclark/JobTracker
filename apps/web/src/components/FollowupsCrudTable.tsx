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
  MenuItem,
  Stack,
  TextField,
  Typography,
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
import { fmtLocalDate, toTitleCaseLabel } from "@/lib/format";

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
  if (!raw) return new Date().toISOString();
  return new Date(`${raw}T12:00:00`).toISOString();
}

export function FollowupsCrudTable({ followups }: FollowupsCrudTableProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [viewingFollowup, setViewingFollowup] = useState<FollowupRow | null>(null);
  const [editingFollowup, setEditingFollowup] = useState<FollowupRow | null>(null);
  const [deleteFollowup, setDeleteFollowup] = useState<FollowupRow | null>(null);
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
    if (!editingFollowup) return;
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
      if (!resultRes.ok) throw new Error("Unable to save follow-up result");
      setEditingFollowup(null);
      setSuccess("Follow-up updated.");
      if (responseType === "rejection_reply") notifyRejectedStatus(editingFollowup.applicationId);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteFollowup) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/followups/${deleteFollowup.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Unable to delete follow-up");
      setDeleteFollowup(null);
      setSuccess("Follow-up deleted.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setDeleting(false);
    }
  }

  const columns = useMemo<GridColDef<FollowupRow>[]>(
    () => [
      {
        field: "attemptIndex",
        headerName: "#",
        width: 60,
        headerAlign: "center",
        align: "center",
      },
      {
        field: "channel",
        headerName: "Channel",
        flex: 1,
        minWidth: 100,
        headerAlign: "center",
        align: "center",
        valueGetter: (_v, row) => toTitleCaseLabel(row.channel),
      },
      {
        field: "sentAtIso",
        headerName: "Sent",
        flex: 1,
        minWidth: 110,
        headerAlign: "center",
        align: "center",
        valueGetter: (_v, row) => fmtLocalDate(row.sentAtIso),
      },
      {
        field: "resultStatus",
        headerName: "Result",
        flex: 1,
        minWidth: 120,
        headerAlign: "center",
        align: "center",
        valueGetter: (_v, row) => toTitleCaseLabel(row.resultStatus),
      },
      {
        field: "actions",
        headerName: "Actions",
        width: 100,
        sortable: false,
        filterable: false,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<FollowupRow>) => (
          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
            <IconButton
              size="small"
              title="Edit"
              sx={{ backgroundColor: "transparent", border: 0, boxShadow: "none", "&:hover": { backgroundColor: "transparent" } }}
              onClick={(e) => { e.stopPropagation(); setEditingFollowup(params.row); setError(null); }}
            >
              <EditIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
            <IconButton
              size="small"
              title="Delete"
              sx={{ backgroundColor: "transparent", border: 0, boxShadow: "none", "&:hover": { backgroundColor: "transparent" } }}
              onClick={(e) => { e.stopPropagation(); setDeleteFollowup(params.row); setError(null); }}
            >
              <DeleteIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
          </Box>
        ),
      },
    ],
    [],
  );

  if (followups.length === 0) {
    return <Typography variant="body2" color="text.secondary">No follow-up attempts.</Typography>;
  }

  return (
    <>
      {success && <Typography variant="body2" color="success.main">{success}</Typography>}
      {error && !editingFollowup && !deleteFollowup && <Typography variant="body2" color="error">{error}</Typography>}

      <Box sx={{ width: "100%", overflowX: "hidden", border: "1px solid rgba(15, 74, 134, 0.22)", borderRadius: "8px" }}>
        <DataGrid
          rows={followups}
          columns={columns}
          autoHeight
          getRowId={(row: FollowupRow): GridRowId => row.id}
          rowHeight={58}
          onRowClick={(params) => { setViewingFollowup(params.row); setError(null); }}
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
            "& .MuiDataGrid-row:hover": { backgroundColor: "rgba(15, 74, 134, 0.13)" },
            "& .MuiDataGrid-cell": { display: "flex", alignItems: "center" },
          }}
        />
      </Box>

      {/* View dialog */}
      <Dialog open={Boolean(viewingFollowup)} onClose={() => { setViewingFollowup(null); setError(null); }} maxWidth="xs" fullWidth>
        <DialogTitle>Follow-up #{viewingFollowup?.attemptIndex}</DialogTitle>
        <DialogContent>
          {viewingFollowup ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 0.5 }}>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip size="small" label={toTitleCaseLabel(viewingFollowup.channel)} />
                <Chip size="small" label={fmtLocalDate(viewingFollowup.sentAtIso)} variant="outlined" />
                <Chip size="small" label={toTitleCaseLabel(viewingFollowup.resultStatus)} variant="outlined" />
                {viewingFollowup.responseType && (
                  <Chip size="small" label={toTitleCaseLabel(viewingFollowup.responseType)} variant="outlined" />
                )}
                {viewingFollowup.resolvedAtIso && (
                  <Chip size="small" label={`Resolved ${fmtLocalDate(viewingFollowup.resolvedAtIso)}`} variant="outlined" />
                )}
              </Box>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => { setEditingFollowup(viewingFollowup); setViewingFollowup(null); setError(null); }}
            endIcon={<EditIcon sx={{ fontSize: "1rem" }} />}
          >
            Edit
          </Button>
          <Button onClick={() => { setViewingFollowup(null); setError(null); }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={Boolean(editingFollowup)}
        onClose={(_e, reason) => { if (reason === "backdropClick" || saving) return; setEditingFollowup(null); setError(null); }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit Follow-up</DialogTitle>
        <DialogContent>
          {editingFollowup ? (
            <Stack id="edit-followup-form" component="form" spacing={2} onSubmit={handleEditSubmit} sx={{ pt: 0.5 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1.5 }}>
                <TextField
                  label="Attempt Index" name="attemptIndex" type="number" required size="small" fullWidth
                  defaultValue={editingFollowup.attemptIndex}
                  slotProps={{ htmlInput: { min: 1, max: 20 } }}
                />
                <TextField select label="Channel" name="channel" size="small" fullWidth defaultValue={editingFollowup.channel}>
                  {FOLLOWUP_CHANNELS.map((ch) => (
                    <MenuItem key={ch} value={ch}>{toTitleCaseLabel(ch)}</MenuItem>
                  ))}
                </TextField>
              </Box>
              <TextField label="Sent Date" name="sentAt" type="date" required size="small" fullWidth
                defaultValue={toDateInputValue(editingFollowup.sentAtIso)} />
              <Typography variant="body2" color="text.secondary">Result</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1.5 }}>
                <TextField select label="Result Status" name="resultStatus" size="small" fullWidth defaultValue={editingFollowup.resultStatus}>
                  {RESULT_STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s}>{toTitleCaseLabel(s)}</MenuItem>
                  ))}
                </TextField>
                <TextField select label="Response Type" name="responseType" size="small" fullWidth defaultValue={editingFollowup.responseType ?? ""}>
                  <MenuItem value="">None</MenuItem>
                  {RESPONSE_TYPE_OPTIONS.map((r) => (
                    <MenuItem key={r} value={r}>{toTitleCaseLabel(r)}</MenuItem>
                  ))}
                </TextField>
                <TextField label="Resolved Date" name="resolvedAt" type="date" size="small" fullWidth
                  defaultValue={editingFollowup.resolvedAtIso ? toDateInputValue(editingFollowup.resolvedAtIso) : ""} />
              </Box>
            </Stack>
          ) : null}
          {error && <Typography variant="body2" color="error" sx={{ mt: 1 }}>{error}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditingFollowup(null); setError(null); }} disabled={saving}>Cancel</Button>
          <Button type="submit" form="edit-followup-form" disabled={saving} endIcon={<SaveIcon sx={{ fontSize: "1rem" }} />}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={Boolean(deleteFollowup)}
        onClose={(_e, reason) => { if (reason === "backdropClick" || deleting) return; setDeleteFollowup(null); setError(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Follow-up?</DialogTitle>
        <DialogContent>
          Delete follow-up attempt <strong>#{deleteFollowup?.attemptIndex}</strong>?
          {error && <Typography variant="body2" color="error" sx={{ mt: 1 }}>{error}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteFollowup(null); setError(null); }} disabled={deleting}>Cancel</Button>
          <Button onClick={() => void handleDeleteConfirmed()} disabled={deleting} endIcon={<DeleteIcon sx={{ fontSize: "1rem" }} />}>
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
