"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataGrid, GridColDef, GridPaginationModel, GridRenderCellParams, GridRowId } from "@mui/x-data-grid";
import { Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, IconButton, InputLabel, ListItemText, MenuItem, Select, Stack, TextField, Typography, useMediaQuery, useTheme } from "@mui/material";
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

interface EmailLogRow {
  id: string;
  applicationId: string | null;
  companyName: string;
  channel: "email" | "linkedin";
  direction: "inbound" | "outbound";
  isHuman: boolean;
  subject: string;
  body: string;
  notes: string | null;
  createdAtIso: string;
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));
  const companyOptions = Array.from(
    new Set([
      ...applications.map((application) => application.companyName),
      ...emails.map((email) => email.companyName),
    ]),
  ).sort((a, b) => a.localeCompare(b));
  const [viewingEmail, setViewingEmail] = useState<EmailLogRow | null>(null);
  const [editingEmail, setEditingEmail] = useState<EmailLogRow | null>(null);
  const [editTargetMode, setEditTargetMode] = useState<"application" | "applications" | "company">("application");
  const [editApplicationIds, setEditApplicationIds] = useState<string[]>([]);
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
    const targetMode = String(data.get("targetMode") ?? "application");
    const payload: Record<string, unknown> = {
      channel: String(data.get("channel") ?? "email"),
      direction: String(data.get("direction") ?? "inbound"),
      isHuman: data.get("isHuman") === "on",
      subject: String(data.get("subject") ?? "").trim(),
      body: String(data.get("body") ?? "").trim(),
      notes: nullableTrimmedText(data.get("notes")),
    };
    if (targetMode === "company") {
      payload.companyName = String(data.get("companyName") ?? "").trim();
    } else if (targetMode === "applications") {
      if (editApplicationIds.length === 0) {
        setError("Select at least one application.");
        setSaving(false);
        return;
      }
      payload.applicationIds = editApplicationIds;
    } else {
      payload.applicationId = String(data.get("applicationId") ?? "").trim();
    }

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
    return <Typography variant="body2" color="text.secondary">No communication logs yet.</Typography>;
  }

  const columns: GridColDef<EmailLogRow>[] = [
    {
      field: "companyName",
      headerName: "Company",
      flex: 1,
      minWidth: isMobile ? 110 : 150,
      headerAlign: "center",
      align: "left",
    },
    {
      field: "direction",
      headerName: "Direction",
      flex: 0.7,
      minWidth: 95,
      headerAlign: "center",
      align: "center",
      valueGetter: (_value, row) => toTitleCaseLabel(row.direction),
    },
    {
      field: "channel",
      headerName: "Channel",
      flex: 0.7,
      minWidth: 95,
      headerAlign: "center",
      align: "center",
      valueGetter: (_value, row) => toTitleCaseLabel(row.channel),
    },
    {
      field: "subject",
      headerName: "Subject",
      flex: 1.6,
      minWidth: isMobile ? 180 : 260,
      headerAlign: "center",
      align: "left",
      renderCell: (params: GridRenderCellParams<EmailLogRow>) => (
        <Box sx={{ width: "100%", minWidth: 0, overflow: "hidden" }} title={params.row.subject}>
          <span style={{ display: "block", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {params.row.subject}
          </span>
        </Box>
      ),
    },
    {
      field: "createdAtIso",
      headerName: "Created",
      width: isMobile ? 110 : 160,
      headerAlign: "center",
      align: "center",
      valueGetter: (_value, row) =>
        new Intl.DateTimeFormat(undefined, {
          month: "numeric",
          day: "numeric",
          year: "2-digit",
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(row.createdAtIso)),
    },
    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      width: 100,
      headerAlign: "center",
      align: "center",
      renderCell: (params: GridRenderCellParams<EmailLogRow>) => {
        const email = params.row;
        return (
          <Box sx={{ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 0.5 }}>
            <IconButton
              size={isMobile ? "small" : "medium"}
              aria-label={`Edit communication log ${email.subject}`}
              title="Edit"
              onClick={(e) => {
                e.stopPropagation();
                setEditingEmail(email);
                if (email.applicationId) {
                  setEditTargetMode("application");
                  setEditApplicationIds([email.applicationId]);
                } else {
                  setEditTargetMode("company");
                  setEditApplicationIds([]);
                }
                setError(null);
              }}
              sx={{ backgroundColor: "transparent", border: 0, boxShadow: "none", "&:hover": { backgroundColor: "transparent" } }}
            >
              <EditIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
            <IconButton
              size={isMobile ? "small" : "medium"}
              aria-label={`Delete communication log ${email.subject}`}
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteEmail(email);
                setError(null);
              }}
              sx={{ backgroundColor: "transparent", border: 0, boxShadow: "none", "&:hover": { backgroundColor: "transparent" } }}
            >
              <DeleteIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
          </Box>
        );
      },
    },
  ];

  const paginationModel: GridPaginationModel = isMobile
    ? { pageSize: 5, page: 0 }
    : { pageSize: 10, page: 0 };

  return (
    <>
      {success && <Typography variant="body2" color="success.main">{success}</Typography>}
      {error && <Typography variant="body2" color="error">{error}</Typography>}
      <Box sx={{ width: "100%", maxWidth: "100%", overflowX: "hidden", border: "1px solid rgba(15, 74, 134, 0.22)", borderRadius: "8px" }}>
        <DataGrid
          rows={emails}
          columns={columns}
          autoHeight
          getRowId={(row: EmailLogRow): GridRowId => row.id}
          onRowClick={(params) => { setViewingEmail(params.row); setError(null); }}
          disableRowSelectionOnClick
          disableColumnResize
          rowHeight={58}
          columnVisibilityModel={{
            companyName: !isMobile || !isTablet,
          }}
          pageSizeOptions={isMobile ? [5, 10, 25] : [10, 25, 50]}
          initialState={{
            pagination: { paginationModel },
          }}
          sx={{
            backgroundColor: "#fff",
            border: "none",
            width: "100%",
            maxWidth: "100%",
            "& .MuiDataGrid-columnHeader, & .MuiDataGrid-scrollbarFiller": { backgroundColor: "rgba(15, 74, 134, 0.06)" },
            "--DataGrid-t-color-border-base": "rgba(15, 74, 134, 0.22)",
            "& .MuiDataGrid-footerContainer": { backgroundColor: "rgba(15, 74, 134, 0.04)" },
            "& .MuiDataGrid-row": { cursor: "pointer" },
            "& .MuiDataGrid-row:hover": { backgroundColor: "rgba(15, 74, 134, 0.13)" },
            "& .MuiDataGrid-cell": {
              display: "flex",
              alignItems: "center",
              overflow: "hidden",
              minWidth: 0,
            },
            "& .MuiDataGrid-columnHeaderTitleContainer": {
              justifyContent: "center",
            },
            "& .MuiDataGrid-cell[data-field='companyName'], & .MuiDataGrid-cell[data-field='subject']": {
              justifyContent: "flex-start",
            },
            "& .MuiDataGrid-cell[data-field='direction'], & .MuiDataGrid-cell[data-field='channel'], & .MuiDataGrid-cell[data-field='createdAtIso'], & .MuiDataGrid-cell[data-field='actions']": {
              justifyContent: "center",
            },
            "& .MuiDataGrid-cell, & .MuiDataGrid-columnHeaderTitleContainer": {
              px: isMobile ? 1 : 2,
            },
          }}
        />
      </Box>

      {/* View */}
      <Dialog open={Boolean(viewingEmail)} onClose={() => setViewingEmail(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          {viewingEmail?.companyName} — {viewingEmail?.subject}
          <IconButton size="small" onClick={() => setViewingEmail(null)}>
            <CloseIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {viewingEmail ? (
            <Box sx={{ display: "grid", gap: 2 }}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Chip size="small" label={toTitleCaseLabel(viewingEmail.channel)} />
                <Chip size="small" label={toTitleCaseLabel(viewingEmail.direction)} />
                <Chip size="small" label={viewingEmail.isHuman ? "Human" : "Automated"} />
                <Chip size="small" variant="outlined" label={new Intl.DateTimeFormat(undefined, { month: "numeric", day: "numeric", year: "2-digit", hour: "numeric", minute: "2-digit" }).format(new Date(viewingEmail.createdAtIso))} />
              </Box>
              {viewingEmail.notes ? (
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Notes</Typography>
                  <Typography variant="body2">{viewingEmail.notes}</Typography>
                </Box>
              ) : null}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Message</Typography>
                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, px: 1.5, py: 1.2, backgroundColor: "#fff" }}>
                  <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{viewingEmail.body}</Typography>
                </Box>
              </Box>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              const email = viewingEmail;
              setViewingEmail(null);
              if (email) {
                setEditingEmail(email);
                if (email.applicationId) {
                  setEditTargetMode("application");
                  setEditApplicationIds([email.applicationId]);
                } else {
                  setEditTargetMode("company");
                  setEditApplicationIds([]);
                }
              }
            }}
            endIcon={<EditIcon sx={{ fontSize: "1rem" }} />}
          >
            Edit
          </Button>
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
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          Edit Communication Log
          <IconButton
            size="small"
            aria-label="Close edit communication dialog"
            title="Close"
            onClick={() => {
              if (saving) {
                return;
              }
              setEditingEmail(null);
              setError(null);
            }}
          >
            <CloseIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {editingEmail ? (
            <Stack id="edit-email-log-form" component="form" spacing={2} onSubmit={handleEditSubmit} sx={{ pt: 0.5 }}>
              <TextField
                select label="Link To" name="targetMode" size="small" fullWidth
                value={editTargetMode}
                onChange={(e) => {
                  const nextMode = e.target.value as "application" | "applications" | "company";
                  setEditTargetMode(nextMode);
                  if (nextMode === "applications" && editingEmail?.applicationId) {
                    setEditApplicationIds([editingEmail.applicationId]);
                  }
                }}
              >
                <MenuItem value="application">Single Application</MenuItem>
                <MenuItem value="applications">Multiple Applications</MenuItem>
                <MenuItem value="company">Company</MenuItem>
              </TextField>

              {editTargetMode === "application" && (
                <TextField select label="Application" name="applicationId" required size="small" fullWidth
                  defaultValue={editingEmail.applicationId ?? ""}>
                  <MenuItem value="" disabled>Select application</MenuItem>
                  {applications.map((application) => (
                    <MenuItem key={application.id} value={application.id}>
                      {application.companyName} - {application.roleTitle}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              {editTargetMode === "applications" && (
                <FormControl size="small">
                  <InputLabel id="edit-application-ids-label">Applications</InputLabel>
                  <Select
                    labelId="edit-application-ids-label"
                    multiple
                    value={editApplicationIds}
                    onChange={(event) => {
                      const value = event.target.value;
                      setEditApplicationIds(typeof value === "string" ? value.split(",") : value);
                    }}
                    renderValue={(selected) => {
                      const selectedIds = selected as string[];
                      return applications
                        .filter((application) => selectedIds.includes(application.id))
                        .map((application) => `${application.companyName} - ${application.roleTitle}`)
                        .join(", ");
                    }}
                    label="Applications"
                  >
                    {applications.map((application) => (
                      <MenuItem key={application.id} value={application.id}>
                        <Checkbox checked={editApplicationIds.includes(application.id)} />
                        <ListItemText primary={`${application.companyName} - ${application.roleTitle}`} />
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}

              {editTargetMode === "company" && (
                <TextField select label="Company" name="companyName" required size="small" fullWidth
                  defaultValue={editingEmail.companyName}>
                  {companyOptions.map((name) => (
                    <MenuItem key={name} value={name}>{name}</MenuItem>
                  ))}
                </TextField>
              )}

              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 1.5 }}>
                <TextField select label="Channel" name="channel" size="small" fullWidth defaultValue={editingEmail.channel}>
                  <MenuItem value="email">Email</MenuItem>
                  <MenuItem value="linkedin">LinkedIn</MenuItem>
                </TextField>
                <TextField select label="Direction" name="direction" size="small" fullWidth defaultValue={editingEmail.direction}>
                  <MenuItem value="inbound">Inbound</MenuItem>
                  <MenuItem value="outbound">Outbound</MenuItem>
                </TextField>
              </Box>

              <FormControlLabel
                control={<Checkbox name="isHuman" defaultChecked={editingEmail.isHuman} size="small" />}
                label="Human sender/recipient"
              />

              <TextField label="Subject" name="subject" required size="small" fullWidth
                defaultValue={editingEmail.subject} slotProps={{ htmlInput: { maxLength: 300 } }} />

              <TextField multiline rows={6} label="Body" name="body" required size="small" fullWidth
                defaultValue={editingEmail.body} slotProps={{ htmlInput: { maxLength: 12000 } }} />

              <TextField multiline rows={3} label="Notes (optional)" name="notes" size="small" fullWidth
                defaultValue={editingEmail.notes ?? ""} slotProps={{ htmlInput: { maxLength: 4000 } }} />
            </Stack>
          ) : null}
          {error && <Typography variant="body2" color="error" sx={{ mt: 1 }}>{error}</Typography>}
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
          {error && <Typography variant="body2" color="error" sx={{ mt: 1 }}>{error}</Typography>}
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
