import os from "node:os";
import path from "node:path";

const APP_DIR_NAME = "job-tracker";
const DB_FILE_NAME = "job-tracker.sqlite";
const CONTROL_FILE_NAME = "control.txt";

function windowsDataDir(): string {
  const appData = process.env.APPDATA;
  return appData ? path.join(appData, APP_DIR_NAME) : path.join(os.homedir(), "AppData", "Roaming", APP_DIR_NAME);
}

function darwinDataDir(): string {
  return path.join(os.homedir(), "Library", "Application Support", APP_DIR_NAME);
}

function linuxDataDir(): string {
  return path.join(os.homedir(), ".local", "share", APP_DIR_NAME);
}

export function resolveDataDir(): string {
  if (process.env.JOBTRACKER_DATA_DIR) {
    return path.resolve(process.env.JOBTRACKER_DATA_DIR);
  }

  switch (process.platform) {
    case "win32":
      return windowsDataDir();
    case "darwin":
      return darwinDataDir();
    default:
      return linuxDataDir();
  }
}

export function resolveDatabasePath(): string {
  return path.join(resolveDataDir(), DB_FILE_NAME);
}

export function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const dbPath = resolveDatabasePath().replace(/\\/g, "/");
  return `file:${dbPath}`;
}

export function resolveControlFilePath(): string {
  return path.join(resolveDataDir(), CONTROL_FILE_NAME);
}

export function resolveResumeDir(): string {
  return path.join(resolveDataDir(), "resumes");
}

export function resolveMasterResumeDir(): string {
  return path.join(resolveDataDir(), "master-resumes");
}
