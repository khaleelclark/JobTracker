import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { resolveDataDir } from "./paths";

export const DATA_DIR = resolveDataDir();

const SELECTOR_PATH = path.join(DATA_DIR, "active-db.txt");
const globalSelectionLock = globalThis as typeof globalThis & {
  databaseSelectionQueue?: Promise<void>;
};

export function resolveDatabasePath(candidate: string): string {
  if (!path.isAbsolute(candidate)) throw new Error("Database path must be absolute");
  const resolved = path.resolve(candidate);
  const relative = path.relative(DATA_DIR, resolved);
  if (relative === "" || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
    throw new Error("Database path must be inside the application data directory");
  }
  return resolved;
}

export function databaseUrl(databasePath: string): string {
  return `file:${databasePath.replace(/\\/g, "/")}`;
}

export function migrateDatabase(databasePath: string): string | null {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  const result = spawnSync(
    "npx",
    ["prisma", "migrate", "deploy", "--schema", schemaPath],
    {
      env: { ...process.env, DATABASE_URL: databaseUrl(databasePath) },
      encoding: "utf8",
      cwd: process.cwd(),
    },
  );
  if (result.status === 0) return null;
  return result.stderr || result.stdout || "Unknown error";
}

export function publishDatabaseSelection(databasePath: string): string {
  const url = databaseUrl(resolveDatabasePath(databasePath));
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporaryPath = path.join(DATA_DIR, `.active-db.${process.pid}.${crypto.randomUUID()}.tmp`);
  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(temporaryPath, "wx", 0o600);
    fs.writeFileSync(descriptor, url, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    fs.renameSync(temporaryPath, SELECTOR_PATH);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
  return url;
}

export async function withDatabaseSelectionLock<T>(operation: () => Promise<T> | T): Promise<T> {
  const previous = globalSelectionLock.databaseSelectionQueue ?? Promise.resolve();
  let release!: () => void;
  globalSelectionLock.databaseSelectionQueue = new Promise<void>(resolve => { release = resolve; });
  await previous.catch(() => {});
  try {
    return await operation();
  } finally {
    release();
  }
}
