import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function resolveDataDir(): string {
  if (process.env.JOBTRACKER_DATA_DIR) {
    return path.resolve(process.env.JOBTRACKER_DATA_DIR);
  }

  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    return appData ? path.join(appData, "job-tracker") : path.join(os.homedir(), "AppData", "Roaming", "job-tracker");
  }

  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "job-tracker");
  }

  return path.join(os.homedir(), ".local", "share", "job-tracker");
}

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const dbPath = path.join(resolveDataDir(), "job-tracker.sqlite").replace(/\\/g, "/");
  return `file:${dbPath}`;
}

const env = {
  ...process.env,
  DATABASE_URL: resolveDatabaseUrl(),
};

const cmd = process.platform === "win32" ? "pnpm" : "pnpm";
const result = spawnSync(cmd, ["--filter", "@job-tracker/web", "prisma", "migrate", "dev"], {
  stdio: "inherit",
  env,
  shell: true,
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

if (result.error) {
  // eslint-disable-next-line no-console
  console.error(result.error);
}

process.exit(1);
