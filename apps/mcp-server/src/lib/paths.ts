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

export function resolveDatabaseUrl(): string {
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
