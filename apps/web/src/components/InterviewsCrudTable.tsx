"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataGrid, GridColDef, GridPaginationModel, GridRenderCellParams, GridRowId } from "@mui/x-data-grid";
import { Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, TextField, Typography, useMediaQuery, useTheme } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import CloseIcon from "@mui/icons-material/Close";
import { toTitleCaseLabel } from "@/lib/format";

interface ApplicationOption {
  id: string;
  companyName: string;
  roleTitle: string;
}

export interface InterviewRow {
  id: string;
  applicationId: string;
  companyName: string;
  roundIndex: number;
  roundLabel: string;
  scheduledAtIso: string;
  status: "scheduled" | "completed" | "cancelled";
  notes: string | null;
}

interface InterviewsCrudTableProps {
  interviews: InterviewRow[];
  applications: ApplicationOption[];
}

const STATUS_OPTIONS = ["scheduled", "completed", "cancelled"] as const;

function toDateTimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "numeric",
    day: "numeric",
    year: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function InterviewsCrudTable({ interviews, applications }: InterviewsCrudTableProps) {
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [viewingInterview, setViewingInterview] = useState<InterviewRow | null>(null);
  const [editingInterview, setEditingInterview] = useState<InterviewRow | null>(null);
  const [deleteInterview, setDeleteInterview] = useState<InterviewRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // applications is used by parent section for the create form; kept in props for future edit app linking
  void applications;

  useEffect(() => {
    if (!success) return;
    const t = window.setTimeout(() => setSuccess(null), 3000);
    return () => window.clearTimeout(t);
  }, [success]);

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingInterview) return;
    setSaving(true);
    setError(null);

    const data = new FormData(event.currentTarget);
    const payload = {
      applicationId: editingInterview.applicationId,
      roundIndex: Number(data.get("roundIndex")),
      roundLabel: String(data.get("roundLabel") ?? "").trim(),
      scheduledAt: new Date(String(data.get("scheduledAt") ?? "")).toISOString(),
      status: String(data.get("status") ?? "scheduled"),
      notes: String(data.get("notes") ?? "").trim() || null,
    };

    try {
      const res = await fetch(`/api/interviews/${editingInterview.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: unknown };
        throw new Error(typeof body.detail === "string" ? body.detail : "Unable to update interview");
      }
      setEditingInterview(null);
      setSuccess("Interview updated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteInterview) return;
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/interviews/${deleteInterview.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Unable to delete interview");
      setDeleteInterview(null);
      setSuccess("Interview deleted.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setDeleting(false);
    }
  }

  if (interviews.length === 0) {
    return <Typography variant="body2" color="text.secondary">No interviews logged.</Typography>;
  }

  const columns: GridColDef<InterviewRow>[] = [
    {
      field: "companyName",
      headerName: "Company",
      flex: 1,
      minWidth: 120,
    },
    {
      field: "roundLabel",
      headerName: "Round",
      flex: 1,
      minWidth: 110,
      valueGetter: (_value, row) => `${row.roundLabel} (${row.roundIndex})`,
    },
    {
      field: "status",
      headerName: "Status",
      width: 110,
      headerAlign: "center",
      align: "center",
      valueGetter: (_value, row) => toTitleCaseLabel(row.status),
    },
    {
      field: "scheduledAtIso",
      headerName: "Scheduled",
      width: isMobile ? 110 : 160,
      headerAlign: "center",
      align: "center",
      valueGetter: (_value, row) => fmtTime(row.scheduledAtIso),
    },
    {
      field: "notes",
      headerName: "Notes",
      flex: 1.5,
      minWidth: 120,
      sortable: false,
      valueGetter: (_value, row) => row.notes ?? "",
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params: GridRenderCellParams<InterviewRow>) => (
        <Box sx={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 0.5 }}>
          <IconButton
            size={isMobile ? "small" : "medium"}
            title="Edit"
            aria-label={`Edit interview ${params.row.roundLabel}`}
            onClick={(e) => { e.stopPropagation(); setEditingInterview(params.row); setError(null); }}
            sx={{ backgroundColor: "transparent", border: 0, boxShadow: "none", "&:hover": { backgroundColor: "transparent" } }}
          >
            <EditIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
          <IconButton
            size={isMobile ? "small" : "medium"}
            title="Delete"
            aria-label={`Delete interview ${params.row.roundLabel}`}
            onClick={(e) => { e.stopPropagation(); setDeleteInterview(params.row); setError(null); }}
            sx={{ backgroundColor: "transparent", border: 0, boxShadow: "none", "&:hover": { backgroundColor: "transparent" } }}
          >
            <DeleteIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </Box>
      ),
    },
  ];

  const paginationModel: GridPaginationModel = isMobile
    ? { pageSize: 5, page: 0 }
    : { pageSize: 10, page: 0 };

  return (
    <>
      {success && <Typography variant="body2" color="success.main">{success}</Typography>}
      {error && !editingInterview && !deleteInterview && <Typography variant="body2" color="error">{error}</Typography>}

      <Box sx={{ width: "100%", overflowX: "hidden", border: "1px solid rgba(15, 74, 134, 0.22)", borderRadius: "8px" }}>
        <DataGrid
          rows={interviews}
          columns={columns}
          autoHeight
          getRowId={(row: InterviewRow): GridRowId => row.id}
          onRowClick={(params) => { setViewingInterview(params.row); setError(null); }}
          disableRowSelectionOnClick
          disableColumnResize
          rowHeight={58}
          pageSizeOptions={isMobile ? [5, 10] : [10, 25]}
          initialState={{ pagination: { paginationModel } }}
          sx={{
            backgroundColor: "#fff",
            border: "none",
            width: "100%",
            "& .MuiDataGrid-columnHeader, & .MuiDataGrid-scrollbarFiller": { backgroundColor: "rgba(15, 74, 134, 0.06)" },
            "--DataGrid-t-color-border-base": "rgba(15, 74, 134, 0.22)",
            "& .MuiDataGrid-footerContainer": { backgroundColor: "rgba(15, 74, 134, 0.04)" },
            "& .MuiDataGrid-row": { cursor: "pointer" },
            "& .MuiDataGrid-row:hover": { backgroundColor: "rgba(15, 74, 134, 0.13)" },
          }}
        />
      </Box>

      {/* View */}
      <Dialog open={Boolean(viewingInterview)} onClose={() => setViewingInterview(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          {viewingInterview?.companyName} — {viewingInterview?.roundLabel}
          <IconButton size="small" onClick={() => setViewingInterview(null)}>
            <CloseIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {viewingInterview ? (
            <Box sx={{ display: "grid", gap: 2 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Chip size="small" label={`Round ${viewingInterview.roundIndex}`} />
                <Chip size="small" label={toTitleCaseLabel(viewingInterview.status)} />
                <Chip size="small" variant="outlined" label={fmtTime(viewingInterview.scheduledAtIso)} />
              </Box>
              {viewingInterview.notes ? (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Notes</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>{viewingInterview.notes}</Typography>
                </Box>
              ) : null}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditingInterview(viewingInterview); setViewingInterview(null); setError(null); }} endIcon={<EditIcon sx={{ fontSize: "1rem" }} />}>
            Edit
          </Button>
          <Button onClick={() => setViewingInterview(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit */}
      <Dialog
        open={Boolean(editingInterview)}
        onClose={(_e, r) => { if (r !== "backdropClick" && !saving) { setEditingInterview(null); setError(null); } }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          Edit Interview
          <IconButton size="small" onClick={() => { if (!saving) { setEditingInterview(null); setError(null); } }}>
            <CloseIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {editingInterview ? (
            <Stack id="edit-interview-form" component="form" spacing={2} onSubmit={handleEditSubmit} sx={{ pt: 0.5 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1.5 }}>
                <TextField label="Round Index" name="roundIndex" type="number" required size="small" fullWidth
                  defaultValue={editingInterview.roundIndex} slotProps={{ htmlInput: { min: 1, max: 20 } }} />
                <TextField label="Round Label" name="roundLabel" required size="small" fullWidth
                  defaultValue={editingInterview.roundLabel} slotProps={{ htmlInput: { maxLength: 100 } }} />
                <TextField label="Scheduled At" name="scheduledAt" type="datetime-local" required size="small" fullWidth
                  defaultValue={toDateTimeLocalValue(editingInterview.scheduledAtIso)} />
                <TextField select label="Status" name="status" size="small" fullWidth defaultValue={editingInterview.status}>
                  {STATUS_OPTIONS.map((s) => (
                    <MenuItem key={s} value={s}>{toTitleCaseLabel(s)}</MenuItem>
                  ))}
                </TextField>
              </Box>
              <TextField multiline rows={3} label="Notes" name="notes" size="small" fullWidth
                defaultValue={editingInterview.notes ?? ""} placeholder="Meeting link, interviewer name, prep notes…"
                slotProps={{ htmlInput: { maxLength: 4000 } }} />
            </Stack>
          ) : null}
          {error && <Typography variant="body2" color="error" sx={{ mt: 1 }}>{error}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditingInterview(null); setError(null); }} disabled={saving}>Cancel</Button>
          <Button type="submit" form="edit-interview-form" disabled={saving} endIcon={<SaveIcon sx={{ fontSize: "1rem" }} />}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete */}
      <Dialog
        open={Boolean(deleteInterview)}
        onClose={(_e, r) => { if (r !== "backdropClick" && !deleting) { setDeleteInterview(null); setError(null); } }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Interview?</DialogTitle>
        <DialogContent>
          Delete <strong>{deleteInterview?.roundLabel}</strong>?
          {error && <Typography variant="body2" color="error" sx={{ mt: 1 }}>{error}</Typography>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteInterview(null); setError(null); }} disabled={deleting}>Cancel</Button>
          <Button onClick={() => void handleDeleteConfirmed()} disabled={deleting} endIcon={<DeleteIcon sx={{ fontSize: "1rem" }} />}>
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
