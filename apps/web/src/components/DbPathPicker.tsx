"use client";

import { useEffect, useRef, useState } from "react";

type FileEntry = {
  name: string;
  path: string;
  isDir: boolean;
  size: number | null;
};

type BrowseResult = {
  dir: string;
  parent: string | null;
  files: FileEntry[];
};

function isSqlite(name: string) {
  return name.endsWith(".sqlite") || name.endsWith(".db");
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const btnBase: React.CSSProperties = {
  padding: "0.4rem 0.75rem",
  borderRadius: "var(--radius)",
  border: "1px solid var(--color-border)",
  background: "var(--color-surface)",
  color: "var(--color-text)",
  cursor: "pointer",
  fontSize: "0.875rem",
  whiteSpace: "nowrap",
};

export function DbPathPicker({ currentUrl }: { currentUrl: string }) {
  const currentPath = currentUrl.replace(/^file:/, "");
  const [inputPath, setInputPath] = useState(currentPath);

  // browser
  const [showBrowser, setShowBrowser] = useState(false);
  const [browseResult, setBrowseResult] = useState<BrowseResult | null>(null);
  const [dataDir, setDataDir] = useState<string | null>(null);

  // new db
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  // switch
  const [status, setStatus] = useState<"idle" | "switching" | "restarting" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // dropdown (•••)
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // copy
  const [copyStatus, setCopyStatus] = useState<"idle" | "copying" | "done" | "error">("idle");
  const [copyPath, setCopyPath] = useState<string | null>(null);

  // delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteChecked, setDeleteChecked] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "restarting" | "error">("idle");
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!showDropdown) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  async function loadDir(dir?: string) {
    const url = dir
      ? `/api/db-path/browse?dir=${encodeURIComponent(dir)}`
      : "/api/db-path/browse";
    const res = await fetch(url);
    const data = (await res.json()) as BrowseResult;
    setBrowseResult(data);
    if (!dataDir) setDataDir(data.dir);
    return data;
  }

  function openBrowser() {
    setShowNew(false);
    setShowBrowser(true);
    loadDir();
  }

  function openNew() {
    setShowBrowser(false);
    setNewName("");
    setShowNew(true);
    if (!dataDir) loadDir().then((r) => setDataDir(r.dir));
  }

  function selectFile(filePath: string) {
    setInputPath(filePath);
    setShowBrowser(false);
  }

  function applyNewName() {
    if (!newName.trim() || !dataDir) return;
    const name = newName.trim().replace(/\.sqlite$/, "");
    setInputPath(`${dataDir}/${name}.sqlite`);
    setShowNew(false);
    setNewName("");
  }

  async function handleSwitch() {
    if (!inputPath || inputPath === currentPath) return;
    setStatus("switching");
    setErrorMsg("");
    const res = await fetch("/api/db-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: inputPath }),
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
    setShowDropdown(false);
    setCopyStatus("copying");
    setCopyPath(null);
    const res = await fetch("/api/db-path/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "copy", path: inputPath }),
    });
    const data = (await res.json()) as { copyPath?: string; error?: string };
    if (!res.ok) {
      setCopyStatus("error");
      setErrorMsg(data.error ?? "Copy failed");
      return;
    }
    setCopyPath(data.copyPath ?? null);
    setCopyStatus("done");
  }

  function openDeleteModal() {
    setShowDropdown(false);
    setDeleteChecked(false);
    setDeleteStatus("idle");
    setDeleteError("");
    setShowDeleteModal(true);
  }

  async function handleDelete() {
    if (!deleteChecked) return;
    setDeleteStatus("deleting");
    setDeleteError("");
    const res = await fetch("/api/db-path/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", path: inputPath }),
    });
    const data = (await res.json()) as { deleted?: boolean; restarting?: boolean; error?: string };
    if (!res.ok) {
      setDeleteError(data.error ?? "Delete failed");
      setDeleteStatus("error");
      return;
    }
    if (data.restarting) {
      setDeleteStatus("restarting");
    } else {
      setShowDeleteModal(false);
      setInputPath(currentPath);
      window.location.reload();
    }
  }

  useEffect(() => {
    if (status !== "restarting" && deleteStatus !== "restarting") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          clearInterval(interval);
          window.location.reload();
        }
      } catch { /* still restarting */ }
    }, 1000);
    return () => clearInterval(interval);
  }, [status, deleteStatus]);

  const busy = status === "switching" || status === "restarting";
  const changed = inputPath !== currentPath;
  const targetFilename = inputPath.split("/").pop() ?? inputPath;
  const newPath = newName.trim()
    ? `${dataDir ?? "…"}/${newName.trim().replace(/\.sqlite$/, "")}.sqlite`
    : null;

  return (
    <div className="stack-sm">
      {/* Main controls */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "stretch" }}>
        <input
          type="text"
          value={inputPath}
          onChange={(e) => setInputPath(e.target.value)}
          disabled={busy}
          style={{
            flex: 1,
            fontFamily: "monospace",
            fontSize: "0.875rem",
            padding: "0.4rem 0.6rem",
            borderRadius: "var(--radius)",
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
            color: "var(--color-text)",
          }}
          placeholder="/data/job-tracker.sqlite"
        />
        <button onClick={openNew} disabled={busy} style={btnBase}>New</button>
        <button onClick={openBrowser} disabled={busy} style={btnBase}>Browse</button>

        {/* ••• dropdown */}
        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            onClick={() => setShowDropdown((v) => !v)}
            disabled={busy}
            style={{ ...btnBase, letterSpacing: "0.05em" }}
            title="More options"
          >
            •••
          </button>
          {showDropdown && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 4px)",
                zIndex: 50,
                minWidth: "10rem",
                background: "#ffffff",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                overflow: "hidden",
              }}
            >
              <a
                href="/api/db-path/download"
                style={{
                  display: "block",
                  width: "100%",
                  padding: "0.5rem 0.75rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: "var(--color-text)",
                  textDecoration: "none",
                }}
                onClick={() => setShowDropdown(false)}
              >
                Download
              </a>
              <div style={{ height: "1px", background: "var(--color-border)" }} />
              <button
                onClick={handleCopy}
                disabled={copyStatus === "copying"}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.5rem 0.75rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: "var(--color-text)",
                }}
              >
                {copyStatus === "copying" ? "Copying…" : "Save a copy"}
              </button>
              <div style={{ height: "1px", background: "var(--color-border)" }} />
              <button
                onClick={openDeleteModal}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "0.5rem 0.75rem",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  color: "var(--color-error, #c0392b)",
                }}
              >
                Delete…
              </button>
            </div>
          )}
        </div>

        <button
          onClick={handleSwitch}
          disabled={!changed || busy}
          style={{
            ...btnBase,
            border: changed ? "1px solid rgba(15, 74, 134, 0.25)" : "1px solid var(--color-border)",
            background: changed ? "rgba(15, 74, 134, 0.1)" : "#e8e8e8",
            color: changed ? "#0f4a86" : "var(--color-muted)",
            cursor: changed ? "pointer" : "default",
          }}
        >
          {status === "switching" ? "Switching…" : status === "restarting" ? "Restarting…" : "Switch"}
        </button>
      </div>

      {/* New database row */}
      {showNew && (
        <div
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            padding: "0.75rem",
            borderRadius: "var(--radius)",
            border: "1px solid var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          <span className="muted" style={{ fontFamily: "monospace", fontSize: "0.8rem", whiteSpace: "nowrap" }}>
            {dataDir ?? "…"}/
          </span>
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyNewName();
              if (e.key === "Escape") setShowNew(false);
            }}
            placeholder="my-database"
            style={{
              flex: 1,
              fontFamily: "monospace",
              fontSize: "0.8rem",
              padding: "0.3rem 0.5rem",
              borderRadius: "var(--radius)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
            }}
          />
          <span className="muted" style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>.sqlite</span>
          <button
            onClick={applyNewName}
            disabled={!newName.trim()}
            style={{
              ...btnBase,
              border: "none",
              background: newName.trim() ? "var(--color-primary)" : "var(--color-surface)",
              color: newName.trim() ? "#fff" : "var(--color-muted)",
              padding: "0.3rem 0.6rem",
              fontSize: "0.8rem",
            }}
          >
            Use
          </button>
          <button onClick={() => setShowNew(false)} style={{ ...btnBase, padding: "0.3rem 0.5rem", fontSize: "0.8rem" }}>
            Cancel
          </button>
        </div>
      )}
      {showNew && newPath && (
        <p className="muted" style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
          Will create: {newPath}
        </p>
      )}

      {/* Copy feedback */}
      {copyStatus === "done" && copyPath && (
        <p className="muted" style={{ fontSize: "0.8rem" }}>
          Copy saved to <span style={{ fontFamily: "monospace" }}>{copyPath}</span>
        </p>
      )}

      {/* Switch errors */}
      {errorMsg && (
        <p style={{ fontSize: "0.8rem", color: "var(--color-error, #c0392b)" }}>{errorMsg}</p>
      )}
      {status === "restarting" && (
        <p className="muted" style={{ fontSize: "0.8rem" }}>
          Container is restarting — page will reload automatically.
        </p>
      )}

      {/* Browse panel */}
      {showBrowser && (
        <div
          className="card"
          style={{ fontFamily: "monospace", fontSize: "0.8rem", maxHeight: "16rem", overflowY: "auto" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span className="muted" style={{ fontSize: "0.75rem" }}>{browseResult?.dir ?? "Loading…"}</span>
            <button
              onClick={() => setShowBrowser(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", fontSize: "1rem", lineHeight: 1 }}
            >
              ✕
            </button>
          </div>
          {browseResult && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {browseResult.parent && (
                <button
                  onClick={() => loadDir(browseResult.parent!)}
                  style={{ textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: "0.25rem 0.4rem", borderRadius: "var(--radius)", color: "var(--color-text)" }}
                >
                  ../
                </button>
              )}
              {browseResult.files.map((f) => {
                const selectable = f.isDir || isSqlite(f.name);
                const isSelected = f.path === inputPath;
                return (
                  <button
                    key={f.path}
                    onClick={() => { if (f.isDir) loadDir(f.path); else if (isSqlite(f.name)) selectFile(f.path); }}
                    disabled={!selectable}
                    style={{
                      textAlign: "left",
                      background: isSelected ? "var(--color-primary-subtle, #eef)" : "none",
                      border: "none",
                      cursor: selectable ? "pointer" : "default",
                      padding: "0.25rem 0.4rem",
                      borderRadius: "var(--radius)",
                      opacity: selectable ? 1 : 0.35,
                      color: isSelected ? "var(--color-primary)" : "var(--color-text)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "1rem",
                    }}
                  >
                    <span>{f.isDir ? `${f.name}/` : f.name}</span>
                    {!f.isDir && f.size !== null && (
                      <span className="muted" style={{ fontSize: "0.75rem" }}>{formatSize(f.size)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete modal */}
      {showDeleteModal && (
        <>
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 100,
            }}
            onClick={() => { if (deleteStatus === "idle" || deleteStatus === "error") setShowDeleteModal(false); }}
          />

          {/* Dialog */}
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 101,
              width: "min(28rem, calc(100vw - 2rem))",
              background: "#ffffff",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius)",
              padding: "1.5rem",
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Delete database?</h3>
                <p className="muted" style={{ margin: "0.4rem 0 0", fontSize: "0.875rem" }}>
                  This will permanently delete:
                </p>
                <p style={{ margin: "0.4rem 0 0", fontFamily: "monospace", fontSize: "0.8rem", wordBreak: "break-all" }}>
                  {inputPath}
                </p>
              </div>

              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "var(--radius)",
                  background: "rgba(192, 57, 43, 0.08)",
                  border: "1px solid rgba(192, 57, 43, 0.25)",
                  fontSize: "0.85rem",
                  color: "var(--color-error, #c0392b)",
                }}
              >
                ⚠ All application data stored in this database will be gone forever. This cannot be undone.
              </div>

              <label style={{ cursor: "pointer", fontSize: "0.875rem" }}>
                <input
                  type="checkbox"
                  checked={deleteChecked}
                  onChange={(e) => setDeleteChecked(e.target.checked)}
                  disabled={deleteStatus === "deleting" || deleteStatus === "restarting"}
                  style={{ marginRight: "0.5rem" }}
                />
                I understand that <strong style={{ margin: "0 0.2em" }}>{targetFilename}</strong> and all its data will be permanently deleted
              </label>

              {deleteError && (
                <p style={{ fontSize: "0.8rem", color: "var(--color-error, #c0392b)", margin: 0 }}>
                  {deleteError}
                </p>
              )}

              {deleteStatus === "restarting" && (
                <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
                  Container is restarting — page will reload automatically.
                </p>
              )}

              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleteStatus === "deleting" || deleteStatus === "restarting"}
                  style={btnBase}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!deleteChecked || deleteStatus === "deleting" || deleteStatus === "restarting"}
                  style={{
                    ...btnBase,
                    border: "none",
                    background: deleteChecked ? "var(--color-error, #c0392b)" : "var(--color-surface)",
                    color: deleteChecked ? "#fff" : "var(--color-muted)",
                    cursor: deleteChecked ? "pointer" : "default",
                  }}
                >
                  {deleteStatus === "deleting" ? "Deleting…" : deleteStatus === "restarting" ? "Restarting…" : "Delete database"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
