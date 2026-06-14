import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

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

function resolveDbPath(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl?.startsWith("file:")) {
    const raw = databaseUrl.slice("file:".length);
    return path.resolve(raw);
  }

  return path.join(resolveDataDir(), "job-tracker.sqlite");
}

function stamp(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(
    date.getMinutes(),
  )}${pad(date.getSeconds())}`;
}

async function main() {
  const sourceDbPath = resolveDbPath();
  const dataDir = resolveDataDir();
  const backupDir = path.join(dataDir, "backups");

  await fs.mkdir(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `job-tracker-${stamp(new Date())}.sqlite`);

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: `file:${sourceDbPath.replace(/\\/g, "/")}`,
      },
    },
  });

  try {
    await prisma.$connect();
    await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(FULL)");
    await prisma.$executeRawUnsafe(`VACUUM INTO '${toSqliteStringLiteral(backupPath)}'`);
  } finally {
    await prisma.$disconnect();
  }

  const entries = await fs.readdir(backupDir);
  const backupFiles = (
    await Promise.all(
      entries
        .filter((entry) => entry.endsWith(".sqlite"))
        .map(async (entry) => {
          const fullPath = path.join(backupDir, entry);
          const stat = await fs.stat(fullPath);
          return { fullPath, mtimeMs: stat.mtimeMs };
        }),
    )
  ).sort((a, b) => b.mtimeMs - a.mtimeMs);

  const retentionMs = 30 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - retentionMs;

  for (const file of backupFiles) {
    if (file.mtimeMs < cutoff) {
      await fs.unlink(file.fullPath);
    }
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ sourceDbPath, backupPath, retained: backupFiles.length }, null, 2));
}

function toSqliteStringLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
