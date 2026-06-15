"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  Autocomplete,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  TextField,
} from "@mui/material";
import { DataGrid, GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
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
  const [editingResume, setEditingResume] = useState<ResumeOption | null>(null);
  const [editLinkedApplications, setEditLinkedApplications] = useState<ApplicationOption[]>([]);
  const [deleteResume, setDeleteResume] = useState<ResumeOption | null>(null);
  const [previewResume, setPreviewResume] = useState<ResumeOption | null>(null);
  const [previewLinkedApplications, setPreviewLinkedApplications] = useState<ApplicationOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingLinks, setSavingLinks] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });

  function openPreview(resume: ResumeOption) {
    setPreviewResume(resume);
    setPreviewLinkedApplications(applications.filter((a) => resume.linkedApplicationIds.includes(a.id)));
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingResume) return;
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
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : `Unable to update resume (${response.status})`);
      }
      setEditingResume(null);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePreviewLinks() {
    if (!previewResume) return;
    setSavingLinks(true);
    setError(null);
    try {
      const payload = {
        name: previewResume.name,
        filePath: previewResume.filePath,
        extractedText: previewResume.extractedText,
        linkedApplicationIds: previewLinkedApplications.map((a) => a.id),
      };
      const response = await fetch(`/api/resumes/${previewResume.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : `Unable to update links (${response.status})`);
      }
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unknown error");
    } finally {
      setSavingLinks(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteResume) return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/resumes/${deleteResume.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : `Unable to delete resume (${response.status})`);
      }
      setDeleteResume(null);
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unknown error");
      setDeleting(false);
    }
  }

  const appMap = new Map(applications.map((a) => [a.id, a]));

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 2,
      minWidth: 180,
      renderCell: (params: GridRenderCellParams<ResumeOption>) => (
        <span style={{ fontWeight: 500, textDecoration: "underline" }}>{params.row.name}</span>
      ),
    },
    {
      field: "linkedApplicationIds",
      headerName: "Linked Applications",
      width: 200,
      sortable: false,
      headerAlign: "center",
      align: "center",
      renderCell: (params: GridRenderCellParams<ResumeOption>) => {
        const count = params.row.linkedApplicationIds.length;
        if (count === 0) return <span className="muted">—</span>;
        return <Chip label={count} size="small" />;
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      sortable: false,
      headerAlign: "center",
      align: "center",
      renderCell: (params: GridRenderCellParams<ResumeOption>) => (
        <div style={{ display: "flex", gap: "0.25rem", alignItems: "center", justifyContent: "center", width: "100%" }}>
          <IconButton
            size="small"
            title="Download"
            aria-label={`Download ${params.row.name}`}
            component="a"
            href={`/api/resumes/${params.row.id}/download`}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <DownloadIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
          <IconButton
            size="small"
            title="Edit"
            aria-label={`Edit ${params.row.name}`}
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setEditingResume(params.row);
              setEditLinkedApplications(
                applications.filter((a) => params.row.linkedApplicationIds.includes(a.id)),
              );
            }}
          >
            <EditIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
          <IconButton
            size="small"
            title="Delete"
            aria-label={`Delete ${params.row.name}`}
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); setDeleteResume(params.row); }}
          >
            <DeleteIcon sx={{ fontSize: "1rem" }} />
          </IconButton>
        </div>
      ),
    },
  ];

  if (resumes.length === 0) {
    return <p className="muted">No resumes uploaded yet.</p>;
  }

  return (
    <>
      <DataGrid
        rows={resumes}
        columns={columns}
        paginationModel={pagination}
        onPaginationModelChange={setPagination}
        pageSizeOptions={[10, 25, 50]}
        onRowClick={(params) => openPreview(params.row)}
        disableRowSelectionOnClick
        sx={{
          border: "1px solid rgba(15, 74, 134, 0.22)",
          borderRadius: "8px",
          "& .MuiDataGrid-columnHeader, & .MuiDataGrid-scrollbarFiller": { backgroundColor: "rgba(15, 74, 134, 0.06)" },
          "--DataGrid-t-color-border-base": "rgba(15, 74, 134, 0.22)",
          "& .MuiDataGrid-footerContainer": { backgroundColor: "rgba(15, 74, 134, 0.04)" },
          "& .MuiDataGrid-row": { cursor: "pointer" },
            "& .MuiDataGrid-row:hover": { backgroundColor: "rgba(15, 74, 134, 0.13)" },
          "& .MuiDataGrid-cell": { display: "flex", alignItems: "center" },
        }}
      />

      {/* Preview dialog */}
      <Dialog open={Boolean(previewResume)} onClose={() => { setPreviewResume(null); setError(null); }} maxWidth="lg" fullWidth>
        <DialogTitle>{previewResume?.name}</DialogTitle>
        <DialogContent>
          {previewResume ? (
            <div className="stack-md">
              <iframe
                title={`Preview ${previewResume.name}`}
                src={`/api/resumes/${previewResume.id}/preview`}
                className="resume-preview-frame"
              />
              <Divider />
              <div className="stack-sm">
                <p style={{ margin: 0, fontWeight: 600, fontSize: "0.9rem" }}>Linked Applications</p>
                <Autocomplete
                  multiple
                  options={applications}
                  getOptionLabel={(o) => `${o.companyName} - ${o.roleTitle}`}
                  value={previewLinkedApplications}
                  onChange={(_, val) => setPreviewLinkedApplications(val)}
                  isOptionEqualToValue={(o, v) => o.id === v.id}
                  renderOption={(props, option) => <li {...props} key={option.id}>{option.companyName} - {option.roleTitle}</li>}
                  renderInput={(params) => <TextField {...params} placeholder="Search applications..." size="small" />}
                />
                {error ? <p className="error-text">{error}</p> : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
        <DialogActions>
          {previewResume ? (
            <>
              <Button component="a" href={`/api/resumes/${previewResume.id}/download`} endIcon={<DownloadIcon sx={{ fontSize: "1rem" }} />}>
                Download
              </Button>
              <Button onClick={() => void handleSavePreviewLinks()} disabled={savingLinks} endIcon={<SaveIcon sx={{ fontSize: "1rem" }} />}>
                {savingLinks ? "Saving..." : "Save Links"}
              </Button>
            </>
          ) : null}
          <Button onClick={() => { setPreviewResume(null); setError(null); }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={Boolean(editingResume)}
        onClose={(_e, reason) => { if (reason === "backdropClick" || saving) return; setEditingResume(null); setError(null); }}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Edit Resume</DialogTitle>
        <DialogContent>
          {editingResume ? (
            <form id="edit-resume-form" className="form-card" onSubmit={handleEditSubmit}>
              <label>
                Display Name
                <input name="name" maxLength={200} required defaultValue={editingResume.name} />
              </label>
              <label>
                File Path
                <input name="filePath" maxLength={1000} required defaultValue={editingResume.filePath} />
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
                <textarea name="extractedText" rows={5} maxLength={50000} defaultValue={editingResume.extractedText ?? ""} />
              </label>
            </form>
          ) : null}
          {error ? <p className="error-text">{error}</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditingResume(null); setError(null); }} disabled={saving}>Cancel</Button>
          <Button type="submit" form="edit-resume-form" disabled={saving} endIcon={<SaveIcon sx={{ fontSize: "1rem" }} />}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={Boolean(deleteResume)}
        onClose={(_e, reason) => { if (reason === "backdropClick" || deleting) return; setDeleteResume(null); setError(null); }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete Resume?</DialogTitle>
        <DialogContent>
          Delete <strong>{deleteResume?.name}</strong> and remove its application links?
          {error ? <p className="error-text">{error}</p> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteResume(null); setError(null); }} disabled={deleting}>Cancel</Button>
          <Button onClick={() => void handleDeleteConfirmed()} disabled={deleting} endIcon={<DeleteIcon sx={{ fontSize: "1rem" }} />}>
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
