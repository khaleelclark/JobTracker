"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataGrid, GridColDef, GridRenderCellParams, GridRowId } from "@mui/x-data-grid";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  SelectChangeEvent,
  TextField,
} from "@mui/material";

interface ResumeOption {
  id: string;
  name: string;
}

interface SkillRow {
  id: string;
  name: string;
  category: string | null;
  notes: string | null;
  linkedResumeIds: string[];
  linkedResumeCount: number;
}

interface SkillsInventoryGridProps {
  title?: string;
  skills: SkillRow[];
  resumeOptions: ResumeOption[];
}

const APP_BUTTON_SX = {
  fontFamily: "var(--font-body)",
  textTransform: "none",
  fontWeight: 400,
  lineHeight: 1.2,
  border: "1px solid rgba(15, 74, 134, 0.25)",
  background: "linear-gradient(145deg, #ffffff 0%, #e5efff 100%)",
  color: "var(--brand-strong)",
  borderRadius: "10px",
  padding: "0.43rem 0.75rem",
  minWidth: "auto",
  "&:hover": {
    background: "linear-gradient(145deg, #f7fbff 0%, #dceafe 100%)",
    border: "1px solid rgba(15, 74, 134, 0.25)",
  },
  "&.Mui-disabled": {
    opacity: 0.55,
    color: "var(--brand-strong)",
  },
} as const;

const APP_BUTTON_LG_SX = {
  ...APP_BUTTON_SX,
  padding: "0.55rem 0.95rem",
  fontSize: "0.95rem",
} as const;

export function SkillsInventoryGrid({ title, skills, resumeOptions }: SkillsInventoryGridProps) {
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState("");
  const [addNotes, setAddNotes] = useState("");
  const [addLinkedResumeIds, setAddLinkedResumeIds] = useState<string[]>([]);
  const [editingSkill, setEditingSkill] = useState<SkillRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editLinkedResumeIds, setEditLinkedResumeIds] = useState<string[]>([]);
  const [deleteSkill, setDeleteSkill] = useState<SkillRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function openEditDialog(row: SkillRow) {
    setEditingSkill(row);
    setEditName(row.name);
    setEditCategory(row.category ?? "");
    setEditNotes(row.notes ?? "");
    setEditLinkedResumeIds(row.linkedResumeIds);
  }

  function handleEditDialogClose(
    _event: object,
    reason: "backdropClick" | "escapeKeyDown",
  ) {
    if (reason === "backdropClick" || saving) {
      return;
    }
    setEditingSkill(null);
  }

  function handleAddDialogClose(
    _event: object,
    reason: "backdropClick" | "escapeKeyDown",
  ) {
    if (reason === "backdropClick" || creating) {
      return;
    }
    setIsAddDialogOpen(false);
  }

  function handleDeleteDialogClose(
    _event: object,
    reason: "backdropClick" | "escapeKeyDown",
  ) {
    if (reason === "backdropClick" || deleting) {
      return;
    }
    setDeleteSkill(null);
  }

  const columns = useMemo<GridColDef<SkillRow>[]>(
    () => [
      { field: "name", headerName: "Skill", flex: 1.1, minWidth: 180 },
      {
        field: "category",
        headerName: "Category",
        flex: 0.9,
        minWidth: 160,
        valueGetter: (_value, row) => row.category ?? "Uncategorized",
      },
      {
        field: "notes",
        headerName: "Notes",
        flex: 1.6,
        minWidth: 220,
        valueGetter: (_value, row) => row.notes ?? "",
      },
      {
        field: "linkedResumeCount",
        headerName: "Linked Resumes",
        type: "number",
        width: 150,
      },
      {
        field: "actions",
        headerName: "Actions",
        sortable: false,
        filterable: false,
        width: 180,
        renderCell: (params: GridRenderCellParams<SkillRow>) => {
          const row = params.row;
          return (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", height: "100%" }}>
              <Button size="small" onClick={() => openEditDialog(row)} sx={APP_BUTTON_SX}>
                Edit
              </Button>
              <Button size="small" onClick={() => setDeleteSkill(row)} sx={APP_BUTTON_SX}>
                Delete
              </Button>
            </Box>
          );
        },
      },
    ],
    [],
  );

  async function handleSaveEdit() {
    if (!editingSkill) {
      return;
    }

    setSaving(true);

    const payload = {
      name: editName.trim(),
      category: editCategory.trim() || null,
      notes: editNotes.trim() || null,
      linkedResumeIds: editLinkedResumeIds,
    };

    try {
      const response = await fetch(`/api/master-skills/${editingSkill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to update skill");
      }

      setEditingSkill(null);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      window.alert(message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateSkill() {
    setCreating(true);

    const payload = {
      name: addName.trim(),
      category: addCategory.trim() || null,
      notes: addNotes.trim() || null,
      linkedResumeIds: addLinkedResumeIds,
    };

    try {
      const response = await fetch("/api/master-skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to create skill");
      }

      setIsAddDialogOpen(false);
      setAddName("");
      setAddCategory("");
      setAddNotes("");
      setAddLinkedResumeIds([]);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      window.alert(message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteSkill) {
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch(`/api/master-skills/${deleteSkill.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to delete skill");
      }

      setDeleteSkill(null);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      window.alert(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="section-head">
        {title ? <h2 className="no-margin">{title}</h2> : <span />}
        <Button onClick={() => setIsAddDialogOpen(true)} sx={APP_BUTTON_LG_SX}>
          Add Skill
        </Button>
      </div>
      <Box sx={{ width: "100%", minHeight: 420 }}>
        <DataGrid
          rows={skills}
          columns={columns}
          getRowId={(row: SkillRow): GridRowId => row.id}
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
          sx={{ backgroundColor: "#fff" }}
        />
      </Box>

      <Dialog
        open={isAddDialogOpen}
        onClose={handleAddDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pr: 7 }}>
          Add Skill
          <IconButton
            aria-label="Close add dialog"
            onClick={() => setIsAddDialogOpen(false)}
            disabled={creating}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              borderRadius: 0,
              backgroundColor: "transparent",
              "&:hover": { backgroundColor: "transparent" },
            }}
          >
            x
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Paper variant="outlined" sx={{ p: 2, display: "grid", gap: 2 }}>
            <TextField
              name="name"
              label="Skill Name"
              value={addName}
              onChange={(event) => setAddName(event.target.value)}
              required
              inputProps={{ maxLength: 120 }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px" } }}
            />
            <TextField
              name="category"
              label="Category"
              value={addCategory}
              onChange={(event) => setAddCategory(event.target.value)}
              inputProps={{ maxLength: 120 }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px" } }}
            />
            <FormControl>
              <InputLabel id="add-skill-linked-resumes-label">Linked Resumes</InputLabel>
              <Select<string[]>
                labelId="add-skill-linked-resumes-label"
                multiple
                value={addLinkedResumeIds}
                onChange={(event: SelectChangeEvent<string[]>) => {
                  const value = event.target.value;
                  setAddLinkedResumeIds(typeof value === "string" ? value.split(",") : value);
                }}
                input={<OutlinedInput label="Linked Resumes" />}
                sx={{ borderRadius: "14px" }}
                renderValue={(selected) =>
                  resumeOptions
                    .filter((resume) => selected.includes(resume.id))
                    .map((resume) => resume.name)
                    .join(", ")
                }
              >
                {resumeOptions.map((resume) => (
                  <MenuItem key={resume.id} value={resume.id}>
                    {resume.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              name="notes"
              label="Notes"
              value={addNotes}
              onChange={(event) => setAddNotes(event.target.value)}
              multiline
              minRows={3}
              inputProps={{ maxLength: 2000 }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px" } }}
            />
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)} disabled={creating} sx={APP_BUTTON_SX}>
            Cancel
          </Button>
          <Button onClick={() => void handleCreateSkill()} disabled={creating} sx={APP_BUTTON_SX}>
            {creating ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(editingSkill)}
        onClose={handleEditDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pr: 7 }}>
          Edit Skill
          <IconButton
            aria-label="Close edit dialog"
            onClick={() => setEditingSkill(null)}
            disabled={saving}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              borderRadius: 0,
              backgroundColor: "transparent",
              "&:hover": { backgroundColor: "transparent" },
            }}
          >
            x
          </IconButton>
        </DialogTitle>
        {editingSkill ? (
          <>
            <DialogContent sx={{ pt: 1 }}>
              <Paper variant="outlined" sx={{ p: 2, display: "grid", gap: 2 }}>
                <TextField
                  name="name"
                  label="Skill Name"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  required
                  inputProps={{ maxLength: 120 }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px" } }}
                />
                <TextField
                  name="category"
                  label="Category"
                  value={editCategory}
                  onChange={(event) => setEditCategory(event.target.value)}
                  inputProps={{ maxLength: 120 }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px" } }}
                />
                <FormControl>
                  <InputLabel id="edit-skill-linked-resumes-label">Linked Resumes</InputLabel>
                  <Select<string[]>
                    labelId="edit-skill-linked-resumes-label"
                    multiple
                    value={editLinkedResumeIds}
                    onChange={(event: SelectChangeEvent<string[]>) => {
                      const value = event.target.value;
                      setEditLinkedResumeIds(typeof value === "string" ? value.split(",") : value);
                    }}
                    input={<OutlinedInput label="Linked Resumes" />}
                    sx={{ borderRadius: "14px" }}
                    renderValue={(selected) =>
                      resumeOptions
                        .filter((resume) => selected.includes(resume.id))
                        .map((resume) => resume.name)
                        .join(", ")
                    }
                  >
                    {resumeOptions.map((resume) => (
                      <MenuItem key={resume.id} value={resume.id}>
                        {resume.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  name="notes"
                  label="Notes"
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                  multiline
                  minRows={3}
                  inputProps={{ maxLength: 2000 }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px" } }}
                />
              </Paper>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditingSkill(null)} disabled={saving} sx={APP_BUTTON_SX}>
                Cancel
              </Button>
              <Button onClick={() => void handleSaveEdit()} disabled={saving} sx={APP_BUTTON_SX}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogActions>
          </>
        ) : null}
      </Dialog>

      <Dialog
        open={Boolean(deleteSkill)}
        onClose={handleDeleteDialogClose}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ pr: 7 }}>
          Delete Skill
          <IconButton
            aria-label="Close delete dialog"
            onClick={() => setDeleteSkill(null)}
            disabled={deleting}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              borderRadius: 0,
              backgroundColor: "transparent",
              "&:hover": { backgroundColor: "transparent" },
            }}
          >
            x
          </IconButton>
        </DialogTitle>
        <DialogContent>
          Delete <strong>{deleteSkill?.name}</strong> from your master skills list?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteSkill(null)} disabled={deleting} sx={APP_BUTTON_SX}>
            Cancel
          </Button>
          <Button onClick={() => void handleDeleteConfirmed()} disabled={deleting} sx={APP_BUTTON_SX}>
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
