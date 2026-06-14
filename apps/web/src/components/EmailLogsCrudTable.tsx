"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataGrid, GridColDef, GridPaginationModel, GridRenderCellParams, GridRowId } from "@mui/x-data-grid";
import { Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Divider, FormControl, IconButton, InputLabel, ListItemText, MenuItem, Select, Typography, useMediaQuery, useTheme } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import VisibilityIcon from "@mui/icons-material/Visibility";
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
  const [editingEmail, setEditingEmail] = useState<EmailLogRow | null>(null);
  const [editTargetMode, setEditTargetMode] = useState<"application" | "applications" | "company">("application");
  const [editApplicationIds, setEditApplicationIds] = useState<string[]>([]);
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
    return <p className="muted">No communication logs yet.</p>;
  }

  const columns: GridColDef<EmailLogRow>[] = [
    {
      field: "view",
      headerName: "View",
      sortable: false,
      filterable: false,
      width: 80,
      headerAlign: "center",
      align: "center",
      renderCell: (params: GridRenderCellParams<EmailLogRow>) => {
        const email = params.row;
        return (
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
        );
      },
    },
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
      headerName: "Message",
      flex: 1.6,
      minWidth: isMobile ? 180 : 260,
      headerAlign: "center",
      align: "left",
      renderCell: (params: GridRenderCellParams<EmailLogRow>) => {
        const notes = params.row.notes?.trim();
        return (
          <Box sx={{ width: "100%", py: 0.35, textAlign: "left" }}>
            <span
              style={{
                display: "block",
                fontWeight: 500,
                whiteSpace: "normal",
                wordBreak: "break-word",
              }}
            >
              {params.row.subject}
            </span>
            {notes ? (
              <span
                style={{
                  display: "block",
                  marginTop: "0.2rem",
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  fontSize: "0.8rem",
                  color: "rgba(19, 33, 48, 0.72)",
                }}
              >
                {notes}
              </span>
            ) : null}
          </Box>
        );
      },
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
          <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
            <IconButton
              size="small"
              aria-label={`Edit communication log ${email.subject}`}
              title="Edit"
              onClick={() => {
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
        );
      },
    },
  ];

  const paginationModel: GridPaginationModel = isMobile
    ? { pageSize: 5, page: 0 }
    : { pageSize: 10, page: 0 };

  return (
    <>
      {success ? <p className="success-text">{success}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
      <Box sx={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}>
        <DataGrid
          rows={emails}
          columns={columns}
          autoHeight
          getRowId={(row: EmailLogRow): GridRowId => row.id}
          disableRowSelectionOnClick
          disableColumnResize
          getRowHeight={() => "auto"}
          columnVisibilityModel={{
            companyName: !isMobile || !isTablet,
          }}
          pageSizeOptions={isMobile ? [5, 10, 25] : [10, 25, 50]}
          density="compact"
          initialState={{
            pagination: { paginationModel },
          }}
          sx={{
            backgroundColor: "#fff",
            width: "100%",
            maxWidth: "100%",
            "& .MuiDataGrid-columnHeaderTitleContainer, & .MuiDataGrid-cell": {
              justifyContent: "center",
              alignItems: "center",
            },
            "& .MuiDataGrid-cell": {
              display: "flex",
              textAlign: "center",
            },
            "& .MuiDataGrid-cell[data-field='companyName'], & .MuiDataGrid-cell[data-field='subject']": {
              justifyContent: "flex-start",
              textAlign: "left",
            },
            "& .MuiDataGrid-cell, & .MuiDataGrid-columnHeaderTitleContainer": {
              px: isMobile ? 1 : 2,
            },
          }}
        />
      </Box>

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
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pr: 1 }}>
          Communication Log Details
          <IconButton
            size="small"
            aria-label="Close communication log details dialog"
            title="Close"
            onClick={() => setViewingEmail(null)}
          >
            <CloseIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {viewingEmail ? (
            <Box sx={{ display: "grid", gap: 2 }}>
              <Box>
                <Typography variant="overline" sx={{ color: "text.secondary", letterSpacing: 0.4 }}>
                  {viewingEmail.companyName}
                </Typography>
                <Typography variant="h6" sx={{ lineHeight: 1.3 }}>
                  {viewingEmail.subject}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                <Chip size="small" label={`Channel: ${toTitleCaseLabel(viewingEmail.channel)}`} />
                <Chip size="small" label={`Direction: ${toTitleCaseLabel(viewingEmail.direction)}`} />
                <Chip size="small" label={viewingEmail.isHuman ? "Human" : "Automated"} />
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Created: ${new Intl.DateTimeFormat(undefined, {
                    month: "numeric",
                    day: "numeric",
                    year: "2-digit",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(viewingEmail.createdAtIso))}`}
                />
              </Box>

              {viewingEmail.notes ? (
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1.5,
                    px: 1.5,
                    py: 1.1,
                    backgroundColor: "rgba(15, 23, 42, 0.02)",
                  }}
                >
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Notes
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.4 }}>
                    {viewingEmail.notes}
                  </Typography>
                </Box>
              ) : null}

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 0.8 }}>
                  Message
                </Typography>
                <Box
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 1.5,
                    px: 1.5,
                    py: 1.2,
                    backgroundColor: "#fff",
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {viewingEmail.body}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ) : null}
        </DialogContent>
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
            <form id="edit-email-log-form" className="form-card" onSubmit={handleEditSubmit}>
              <label>
                Link To
                <select
                  name="targetMode"
                  value={editTargetMode}
                  onChange={(event) => {
                    const nextMode = event.target.value as "application" | "applications" | "company";
                    setEditTargetMode(nextMode);
                    if (nextMode === "applications" && editingEmail?.applicationId) {
                      setEditApplicationIds([editingEmail.applicationId]);
                    }
                  }}
                >
                  <option value="application">Single Application</option>
                  <option value="applications">Multiple Applications</option>
                  <option value="company">Company</option>
                </select>
              </label>

              {editTargetMode === "application" ? (
                <label>
                  Application
                  <select name="applicationId" required defaultValue={editingEmail.applicationId ?? ""}>
                    <option value="" disabled>
                      Select application
                    </option>
                    {applications.map((application) => (
                      <option key={application.id} value={application.id}>
                        {application.companyName} - {application.roleTitle}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {editTargetMode === "applications" ? (
                <FormControl>
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
              ) : null}

              {editTargetMode === "company" ? (
                <label>
                  Company
                  <select name="companyName" required defaultValue={editingEmail.companyName}>
                    {companyOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

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
