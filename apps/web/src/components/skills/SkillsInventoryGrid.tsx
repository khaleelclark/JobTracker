"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataGrid, GridColDef, GridRenderCellParams, GridRowId } from "@mui/x-data-grid";
import NumberSpinner from "@/components/NumberSpinner";
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  SelectChangeEvent,
  TextField,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";

interface ResumeOption {
  id: string;
  name: string;
}

interface SkillRow {
  id: string;
  name: string;
  category: string | null;
  experienceYears: number | null;
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
  const [addExperienceYears, setAddExperienceYears] = useState<number | null>(0);
  const [addNotes, setAddNotes] = useState("");
  const [addLinkedResumeIds, setAddLinkedResumeIds] = useState<string[]>([]);
  const [editingSkill, setEditingSkill] = useState<SkillRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editExperienceYears, setEditExperienceYears] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const [editLinkedResumeIds, setEditLinkedResumeIds] = useState<string[]>([]);
  const [deleteSkill, setDeleteSkill] = useState<SkillRow | null>(null);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [deleteAllAcknowledge, setDeleteAllAcknowledge] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);

  function openEditDialog(row: SkillRow) {
    setEditingSkill(row);
    setEditName(row.name);
    setEditCategory(row.category ?? "");
    setEditExperienceYears(row.experienceYears ?? null);
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

  function handleDeleteAllDialogClose(
    _event: object,
    reason: "backdropClick" | "escapeKeyDown",
  ) {
    if (reason === "backdropClick" || deletingAll) {
      return;
    }
    setIsDeleteAllDialogOpen(false);
    setDeleteAllAcknowledge(false);
  }

  function parseExperienceYearsInput(value: number | null): number | null {
    if (value === null || !Number.isFinite(value)) {
      return null;
    }
    return Number((Math.round(value * 2) / 2).toFixed(1));
  }

  const columns = useMemo<GridColDef<SkillRow>[]>(
    () => [
      { field: "name", headerName: "Skill", flex: 1.1, minWidth: 180 },
      {
        field: "category",
        headerName: "Category",
        flex: 0.9,
        minWidth: 160,
        align: "center",
        valueGetter: (_value, row) => row.category ?? "Uncategorized",
      },
      {
        field: "experienceYears",
        headerName: "Experience (Years)",
        width: 180,
        align: "center",
        valueGetter: (_value, row) =>
          row.experienceYears === null ? "Not set" : `${row.experienceYears.toFixed(1)} years`,
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
        align: "center",
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
            <Box sx={{ display: "flex", gap: 1, alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>
              <IconButton
                size="small"
                aria-label={`Edit skill ${row.name}`}
                title="Edit"
                onClick={() => openEditDialog(row)}
                sx={APP_BUTTON_SX}
              >
                <EditIcon sx={{ fontSize: "1rem" }} />
              </IconButton>
              <IconButton
                size="small"
                aria-label={`Delete skill ${row.name}`}
                title="Delete"
                onClick={() => setDeleteSkill(row)}
                sx={APP_BUTTON_SX}
              >
                <DeleteIcon sx={{ fontSize: "1rem" }} />
              </IconButton>
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
      experienceYears: parseExperienceYearsInput(editExperienceYears),
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
      experienceYears: parseExperienceYearsInput(addExperienceYears),
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
      setAddExperienceYears(0);
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

  async function handleDeleteAllSkills() {
    setDeletingAll(true);

    try {
      const response = await fetch("/api/master-skills", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmDeleteAll: true }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "Unable to delete all skills");
      }

      setIsDeleteAllDialogOpen(false);
      setDeleteAllAcknowledge(false);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      window.alert(message);
    } finally {
      setDeletingAll(false);
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
          sx={{
            backgroundColor: "#fff",
            "& .MuiDataGrid-columnHeaderTitleContainer": {
              justifyContent: "center",
            },
            "& .MuiDataGrid-columnHeaderTitleContainerContent": {
              justifyContent: "center",
              width: "100%",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              textAlign: "center",
              width: "100%",
            },
          }}
        />
      </Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          onClick={() => setIsDeleteAllDialogOpen(true)}
          disabled={skills.length === 0}
          sx={APP_BUTTON_LG_SX}
          endIcon={<DeleteIcon sx={{ fontSize: "1rem" }} />}
        >
          Delete All Skills
        </Button>
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
              slotProps={{ htmlInput: { maxLength: 120 } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px" } }}
            />
            <TextField
              name="category"
              label="Category"
              value={addCategory}
              onChange={(event) => setAddCategory(event.target.value)}
              slotProps={{ htmlInput: { maxLength: 120 } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px" } }}
            />
            <NumberSpinner
              label="Experience (Years)"
              value={addExperienceYears}
              onValueChange={setAddExperienceYears}
              min={0}
              max={60}
              step={0.5}
              size="small"
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
              slotProps={{ htmlInput: { maxLength: 2000 } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px" } }}
            />
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddDialogOpen(false)} disabled={creating} sx={APP_BUTTON_SX}>
            Cancel
          </Button>
          <Button
            onClick={() => void handleCreateSkill()}
            disabled={creating}
            sx={APP_BUTTON_SX}
            endIcon={creating ? undefined : <SaveIcon sx={{ fontSize: "1rem" }} />}
          >
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
                  slotProps={{ htmlInput: { maxLength: 120 } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px" } }}
                />
                <TextField
                  name="category"
                  label="Category"
                  value={editCategory}
                  onChange={(event) => setEditCategory(event.target.value)}
                  slotProps={{ htmlInput: { maxLength: 120 } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px" } }}
                />
                <NumberSpinner
                  label="Experience (Years)"
                  value={editExperienceYears}
                  onValueChange={setEditExperienceYears}
                  min={0}
                  max={60}
                  step={0.5}
                  size="small"
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
                  slotProps={{ htmlInput: { maxLength: 2000 } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px" } }}
                />
              </Paper>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditingSkill(null)} disabled={saving} sx={APP_BUTTON_SX}>
                Cancel
              </Button>
              <Button
                onClick={() => void handleSaveEdit()}
                disabled={saving}
                sx={APP_BUTTON_SX}
                endIcon={saving ? undefined : <SaveIcon sx={{ fontSize: "1rem" }} />}
              >
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
          <Button
            onClick={() => void handleDeleteConfirmed()}
            disabled={deleting}
            sx={APP_BUTTON_SX}
            endIcon={<DeleteIcon sx={{ fontSize: "1rem" }} />}
          >
            {deleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isDeleteAllDialogOpen}
        onClose={handleDeleteAllDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pr: 7 }}>
          Delete All Skills
          <IconButton
            aria-label="Close delete-all dialog"
            onClick={() => {
              if (deletingAll) {
                return;
              }
              setIsDeleteAllDialogOpen(false);
              setDeleteAllAcknowledge(false);
            }}
            disabled={deletingAll}
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
          <Paper variant="outlined" sx={{ p: 2, display: "grid", gap: 1.5 }}>
            <p>
              This will permanently delete all master skills and all corresponding resume links.
              This cannot be undone.
            </p>
            <FormControlLabel
              control={
                <Checkbox
                  checked={deleteAllAcknowledge}
                  onChange={(event) => setDeleteAllAcknowledge(event.target.checked)}
                  disabled={deletingAll}
                />
              }
              label="I understand this will delete all my skills and corresponding links."
            />
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (deletingAll) {
                return;
              }
              setIsDeleteAllDialogOpen(false);
              setDeleteAllAcknowledge(false);
            }}
            disabled={deletingAll}
            sx={APP_BUTTON_SX}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleDeleteAllSkills()}
            disabled={deletingAll || !deleteAllAcknowledge}
            sx={APP_BUTTON_SX}
            endIcon={<DeleteIcon sx={{ fontSize: "1rem" }} />}
          >
            {deletingAll ? "Deleting..." : "Confirm Delete All"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
