import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

function resolveDataDir(): string {
  if (process.env.JOBTRACKER_DATA_DIR) {
    return path.resolve(process.env.JOBTRACKER_DATA_DIR);
  }
  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    return appData
      ? path.join(appData, "job-tracker")
      : path.join(os.homedir(), "AppData", "Roaming", "job-tracker");
  }
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "job-tracker");
  }
  return path.join(os.homedir(), ".local", "share", "job-tracker");
}

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // Fall back to .env file so standalone `pnpm db:deploy` respects the current mode.
  try {
    const envContent = fs.readFileSync(path.resolve(".env"), "utf-8");
    const match = envContent.match(/^DATABASE_URL=(.+)$/m);
    if (match?.[1]?.trim()) return match[1].trim();
  } catch {
    // fall through
  }
  return `file:${path.join(resolveDataDir(), "job-tracker.sqlite").replace(/\\/g, "/")}`;
}

const databaseUrl = resolveDatabaseUrl();
console.log(`Deploying migrations to: ${databaseUrl}`);

const result = spawnSync("pnpm", ["--filter", "@job-tracker/web", "prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: databaseUrl },
  shell: true,
});

if (typeof result.status === "number") {
  process.exit(result.status);
}

if (result.error) {
  console.error(result.error);
}

process.exit(1);
