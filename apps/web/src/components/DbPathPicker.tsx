"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import AddIcon from "@mui/icons-material/Add";

type FileEntry = { name: string; path: string; isDir: boolean; size: number | null };
type BrowseResult = { dir: string; parent: string | null; files: FileEntry[] };

function isSqlite(name: string) {
  return name.endsWith(".sqlite") || name.endsWith(".db");
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DbPathPicker({ currentUrl }: { currentUrl: string }) {
  const currentPath = currentUrl.replace(/^file:/, "");
  const currentFilename = currentPath.split("/").pop() ?? currentPath;

  const [mode, setMode] = useState<"idle" | "browse" | "new">("idle");
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [browseResult, setBrowseResult] = useState<BrowseResult | null>(null);
  const [dataDir, setDataDir] = useState<string | null>(null);

  const [status, setStatus] = useState<"idle" | "switching" | "restarting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const [copyStatus, setCopyStatus] = useState<"idle" | "copying" | "done" | "error">("idle");
  const [copyPath, setCopyPath] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteChecked, setDeleteChecked] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "restarting" | "error">("idle");
  const [deleteError, setDeleteError] = useState("");

  const newInputRef = useRef<HTMLInputElement>(null);

  async function loadDir(dir?: string) {
    const url = dir ? `/api/db-path/browse?dir=${encodeURIComponent(dir)}` : "/api/db-path/browse";
    const res = await fetch(url);
    const data = (await res.json()) as BrowseResult & { error?: string };
    if (!res.ok || data.error) {
      setErrorMsg(data.error ?? "Cannot read directory");
      setMode("idle");
      return null;
    }
    setBrowseResult(data);
    if (!dataDir) setDataDir(data.dir);
    return data;
  }

  function openBrowse() {
    setPendingPath(null);
    setMode("browse");
    loadDir();
  }

  function openNew() {
    setPendingPath(null);
    setNewName("");
    setMode("new");
    if (!dataDir) loadDir().then((r) => { if (r) setDataDir(r.dir); });
    setTimeout(() => newInputRef.current?.focus(), 50);
  }

  function cancel() {
    setMode("idle");
    setPendingPath(null);
    setNewName("");
    setErrorMsg("");
  }

  function selectFile(filePath: string) {
    setPendingPath(filePath);
    setMode("idle");
  }

  function applyNewName() {
    if (!newName.trim() || !dataDir) return;
    const name = newName.trim().replace(/\.sqlite$/, "");
    setPendingPath(`${dataDir}/${name}.sqlite`);
    setMode("idle");
    setNewName("");
  }

  async function handleSwitch(path: string) {
    setStatus("switching");
    setErrorMsg("");
    const res = await fetch("/api/db-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    });
    const data = (await res.json()) as { url?: string; restarting?: boolean; error?: string };
    if (!res.ok) {
      setErrorMsg(data.error ?? "Failed to switch");
      setStatus("error");
      return;
    }
    data.restarting ? setStatus("restarting") : window.location.reload();
  }

  async function handleCopy() {
    setCopyStatus("copying");
    setCopyPath(null);
    const res = await fetch("/api/db-path/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "copy", path: currentPath }),
    });
    const data = (await res.json()) as { copyPath?: string; error?: string };
    if (!res.ok) { setCopyStatus("error"); setErrorMsg(data.error ?? "Copy failed"); return; }
    setCopyPath(data.copyPath ?? null);
    setCopyStatus("done");
  }

  async function handleDelete() {
    if (!deleteChecked) return;
    setDeleteStatus("deleting");
    setDeleteError("");
    const res = await fetch("/api/db-path/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", path: currentPath }),
    });
    const data = (await res.json()) as { deleted?: boolean; restarting?: boolean; error?: string };
    if (!res.ok) { setDeleteError(data.error ?? "Delete failed"); setDeleteStatus("error"); return; }
    if (data.restarting) setDeleteStatus("restarting");
    else { setShowDeleteModal(false); window.location.reload(); }
  }

  useEffect(() => {
    if (status !== "restarting" && deleteStatus !== "restarting") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) { clearInterval(interval); window.location.reload(); }
      } catch { /* still restarting */ }
    }, 1000);
    return () => clearInterval(interval);
  }, [status, deleteStatus]);

  const busy = status === "switching" || status === "restarting";
  const pendingFilename = pendingPath?.split("/").pop() ?? pendingPath;

  return (
    <Stack spacing={1.5}>

      {/* Active database */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.2, border: "1px solid rgba(15,74,134,0.18)", borderRadius: "12px", background: "rgba(15,74,134,0.04)" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ fontSize: "0.7rem", color: "var(--ink-soft)", mb: 0.3, textTransform: "uppercase", letterSpacing: "0.06em" }}>Active database</Box>
          <Box sx={{ fontFamily: "monospace", fontSize: "0.875rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentFilename}
          </Box>
          <Box sx={{ fontFamily: "monospace", fontSize: "0.72rem", color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", mt: 0.2 }}>
            {currentPath}
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5, flexShrink: 0 }}>
          <Tooltip title="Download">
            <IconButton size="small" component="a" href="/api/db-path/download">
              <DownloadIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={copyStatus === "copying" ? "Copying…" : copyStatus === "done" ? "Copied!" : "Save a copy"}>
            <IconButton size="small" onClick={handleCopy} disabled={copyStatus === "copying"}>
              <ContentCopyIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete this database">
            <IconButton size="small" onClick={() => { setDeleteChecked(false); setDeleteStatus("idle"); setDeleteError(""); setShowDeleteModal(true); }} sx={{ color: "var(--danger)" }}>
              <DeleteIcon sx={{ fontSize: "1rem" }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {copyStatus === "done" && copyPath && (
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
          Copy saved to <Box component="span" sx={{ fontFamily: "monospace" }}>{copyPath}</Box>
        </Typography>
      )}

      <Divider><Chip label="Switch database" size="small" /></Divider>

      {/* Action buttons */}
      {mode === "idle" && (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button startIcon={<FolderOpenIcon />} onClick={openBrowse} disabled={busy} sx={{ flex: 1, border: "1px solid var(--line) !important", justifyContent: "center" }}>
            Open existing
          </Button>
          <Button startIcon={<AddIcon />} onClick={openNew} disabled={busy} sx={{ flex: 1, border: "1px solid var(--line) !important", justifyContent: "center" }}>
            Create new
          </Button>
        </Box>
      )}

      {/* Browse panel */}
      {mode === "browse" && (
        <Box sx={{ border: "1px solid var(--line)", borderRadius: "12px", overflow: "hidden" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", px: 1.5, py: 1, borderBottom: "1px solid var(--line)", background: "rgba(15,74,134,0.04)" }}>
            <Box sx={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {browseResult?.dir ?? "Loading…"}
            </Box>
            <Button onClick={cancel} size="small">Cancel</Button>
          </Box>
          <Box sx={{ fontFamily: "monospace", fontSize: "0.8rem", maxHeight: "14rem", overflowY: "auto" }}>
            {browseResult && (
              <>
                {browseResult.parent && (
                  <Box
                    component="button"
                    onClick={() => loadDir(browseResult.parent!)}
                    sx={{ display: "block", width: "100%", textAlign: "left", px: 1.5, py: 0.8, border: "none", background: "none", cursor: "pointer", "&:hover": { background: "rgba(15,74,134,0.05)" } }}
                  >
                    ../
                  </Box>
                )}
                {browseResult.files.map((f) => {
                  const selectable = f.isDir || isSqlite(f.name);
                  const isSelected = f.path === (pendingPath ?? currentPath);
                  return (
                    <Box
                      component="button"
                      key={f.path}
                      onClick={() => { if (f.isDir) loadDir(f.path); else if (isSqlite(f.name)) selectFile(f.path); }}
                      disabled={!selectable}
                      sx={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        width: "100%", textAlign: "left", px: 1.5, py: 0.8,
                        border: "none", gap: 2,
                        background: isSelected ? "rgba(15,74,134,0.08)" : "none",
                        color: isSelected ? "var(--brand-strong)" : "inherit",
                        cursor: selectable ? "pointer" : "default",
                        opacity: selectable ? 1 : 0.35,
                        "&:hover": selectable ? { background: "rgba(15,74,134,0.05)" } : {},
                      }}
                    >
                      <span>{f.isDir ? `${f.name}/` : f.name}</span>
                      {!f.isDir && f.size !== null && (
                        <span style={{ color: "var(--ink-soft)", fontSize: "0.72rem" }}>{formatSize(f.size)}</span>
                      )}
                    </Box>
                  );
                })}
              </>
            )}
          </Box>
        </Box>
      )}

      {/* New database panel */}
      {mode === "new" && (
        <Box sx={{ border: "1px solid var(--line)", borderRadius: "12px", p: 1.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ fontSize: "0.85rem", fontWeight: 600 }}>Create new database</Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{dataDir ?? "…"}/</Box>
            <TextField
              inputRef={newInputRef}
              size="small"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") applyNewName(); if (e.key === "Escape") cancel(); }}
              placeholder="my-database"
              sx={{ flex: 1, "& input": { fontFamily: "monospace", fontSize: "0.8rem" } }}
            />
            <Box sx={{ fontFamily: "monospace", fontSize: "0.78rem", color: "var(--ink-soft)" }}>.sqlite</Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
            <Button onClick={cancel} size="small">Cancel</Button>
            <Button onClick={applyNewName} disabled={!newName.trim()} size="small" sx={{ border: "1px solid rgba(15,74,134,0.25) !important" }}>
              Set path
            </Button>
          </Box>
        </Box>
      )}

      {/* Pending switch confirmation */}
      {pendingPath && pendingPath !== currentPath && mode === "idle" && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.2, border: "1px solid rgba(15,74,134,0.25)", borderRadius: "12px", background: "rgba(15,74,134,0.04)" }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ fontSize: "0.7rem", color: "var(--ink-soft)", mb: 0.3, textTransform: "uppercase", letterSpacing: "0.06em" }}>Switch to</Box>
            <Box sx={{ fontFamily: "monospace", fontSize: "0.875rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {pendingFilename}
            </Box>
            <Box sx={{ fontFamily: "monospace", fontSize: "0.72rem", color: "var(--ink-soft)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", mt: 0.2 }}>
              {pendingPath}
            </Box>
          </Box>
          <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
            <Button onClick={() => setPendingPath(null)} size="small" disabled={busy}>Cancel</Button>
            <Button
              onClick={() => void handleSwitch(pendingPath)}
              disabled={busy}
              size="small"
              sx={{ border: "1px solid rgba(15,74,134,0.35) !important", background: "rgba(15,74,134,0.1) !important" }}
            >
              {status === "switching" ? "Switching…" : status === "restarting" ? "Restarting…" : `Switch to ${pendingFilename}`}
            </Button>
          </Box>
        </Box>
      )}

      {errorMsg && <Typography variant="body2" color="error" sx={{ fontSize: "0.8rem" }}>{errorMsg}</Typography>}
      {status === "restarting" && <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>Container is restarting — page will reload automatically.</Typography>}

      {/* Delete dialog */}
      <Dialog open={showDeleteModal} onClose={() => { if (deleteStatus === "idle" || deleteStatus === "error") setShowDeleteModal(false); }} maxWidth="xs" fullWidth>
        <DialogTitle>Delete database?</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ fontFamily: "monospace", fontSize: "0.8rem", wordBreak: "break-all" }}>{currentPath}</Box>
            <Box sx={{ p: 1.2, borderRadius: "8px", background: "rgba(185,28,28,0.07)", border: "1px solid rgba(185,28,28,0.2)", fontSize: "0.85rem", color: "var(--danger)" }}>
              ⚠ All data in this database will be permanently deleted and cannot be undone.
            </Box>
            <FormControlLabel
              control={<Checkbox checked={deleteChecked} onChange={(e) => setDeleteChecked(e.target.checked)} disabled={deleteStatus !== "idle" && deleteStatus !== "error"} size="small" />}
              label={<span style={{ fontSize: "0.875rem" }}>I understand <strong>{currentFilename}</strong> will be deleted forever</span>}
            />
            {deleteError && <Typography variant="body2" color="error" sx={{ fontSize: "0.8rem" }}>{deleteError}</Typography>}
            {deleteStatus === "restarting" && <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>Container is restarting…</Typography>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteModal(false)} disabled={deleteStatus === "deleting" || deleteStatus === "restarting"}>Cancel</Button>
          <Button
            onClick={() => void handleDelete()}
            disabled={!deleteChecked || deleteStatus === "deleting" || deleteStatus === "restarting"}
            sx={{ color: "var(--danger) !important" }}
          >
            {deleteStatus === "deleting" ? "Deleting…" : deleteStatus === "restarting" ? "Restarting…" : "Delete database"}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
