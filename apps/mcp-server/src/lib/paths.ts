import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const APP_DIR_NAME = "job-tracker";

function resolveDataDir(): string {
  if (process.env.JOBTRACKER_DATA_DIR) {
    return path.resolve(process.env.JOBTRACKER_DATA_DIR);
  }

  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    return appData ? path.join(appData, APP_DIR_NAME) : path.join(os.homedir(), "AppData", "Roaming", APP_DIR_NAME);
  }

  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", APP_DIR_NAME);
  }

  return path.join(os.homedir(), ".local", "share", APP_DIR_NAME);
}

export function resolveActiveDatabaseUrl(): string | null {
  const dataDir = resolveDataDir();
  const activeDatabasePath = path.join(resolveDataDir(), "active-db.txt");
  try {
    const activeDatabaseUrl = fs.readFileSync(activeDatabasePath, "utf8").trim();
    if (!activeDatabaseUrl.startsWith("file:") || activeDatabaseUrl.length <= "file:".length) return null;
    const databasePath = activeDatabaseUrl.slice("file:".length);
    if (!path.isAbsolute(databasePath)) return null;
    const resolved = path.resolve(databasePath);
    if (!fs.existsSync(resolved) || fs.lstatSync(resolved).isSymbolicLink()) return null;
    const canonicalDataDir = fs.realpathSync(dataDir);
    const canonicalDatabasePath = fs.realpathSync(resolved);
    const relative = path.relative(canonicalDataDir, canonicalDatabasePath);
    if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
    return `file:${canonicalDatabasePath.replace(/\\/g, "/")}`;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) return null;
  }
  return null;
}

export function resolveDatabaseUrl(): string {
  const activeDatabaseUrl = resolveActiveDatabaseUrl();
  if (activeDatabaseUrl) return activeDatabaseUrl;

  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const dbPath = path.join(resolveDataDir(), "job-tracker.sqlite").replace(/\\/g, "/");
  return `file:${dbPath}`;
}

export function resolveControlFilePath(): string {
  return path.join(resolveDataDir(), "control.txt");
}

export function resolveOauthStorePath(): string {
  return path.join(resolveDataDir(), "oauth_tokens.json");
}

export function resolveMasterResumeDir(): string {
  return path.join(resolveDataDir(), "master-resumes");
}

export function resolveGeneratedResumeDir(): string {
  if (process.env.GENERATED_RESUME_DIR) {
    return path.resolve(process.env.GENERATED_RESUME_DIR);
  }

  // Windows and macOS: user-visible Documents folder
  if (process.platform === "win32" || process.platform === "darwin") {
    return path.join(os.homedir(), "Documents", "Job App Resumes");
  }

  // Linux (including Docker via JOBTRACKER_DATA_DIR): keep it alongside the database
  return path.join(resolveDataDir(), "generated-resumes");
}
