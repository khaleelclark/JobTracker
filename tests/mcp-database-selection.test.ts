import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { PrismaClient } from "../apps/web/node_modules/@prisma/client/index.js";

function sqliteFileUrl(filePath: string): string {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

async function createMarkerDatabase(filePath: string, marker: string): Promise<void> {
  const client = new PrismaClient({ datasources: { db: { url: sqliteFileUrl(filePath) } } });
  try {
    await client.$executeRawUnsafe("CREATE TABLE marker (value TEXT NOT NULL)");
    await client.$executeRawUnsafe("INSERT INTO marker (value) VALUES (?)", marker);
  } finally {
    await client.$disconnect();
  }
}

test("MCP follows the database selected by the web UI", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDataDir = process.env.JOBTRACKER_DATA_DIR;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-tracker-mcp-database-selection-"));
  const firstPath = path.join(tempDir, "first.sqlite");
  const secondPath = path.join(tempDir, "second.sqlite");
  const activeDatabasePath = path.join(tempDir, "active-db.txt");
  const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-tracker-mcp-outside-"));
  const outsidePath = path.join(outsideDir, "outside.sqlite");
  const symlinkPath = path.join(tempDir, "linked.sqlite");
  const danglingTargetPath = path.join(outsideDir, "not-created.sqlite");
  const danglingSymlinkPath = path.join(tempDir, "dangling.sqlite");

  await createMarkerDatabase(firstPath, "first");
  await createMarkerDatabase(secondPath, "second");
  await createMarkerDatabase(outsidePath, "outside");
  await fs.symlink(outsidePath, symlinkPath);
  await fs.symlink(danglingTargetPath, danglingSymlinkPath);

  process.env.NODE_ENV = "test";
  process.env.JOBTRACKER_DATA_DIR = tempDir;
  process.env.DATABASE_URL = sqliteFileUrl(firstPath);

  const selectionModuleUrl = pathToFileURL(path.resolve("apps/web/src/lib/databaseSelection.ts")).href;
  const selection = await import(`${selectionModuleUrl}?test=${Date.now()}`) as {
    publishDatabaseSelection: (databasePath: string) => string;
    resolveDatabasePath: (databasePath: string) => string;
  };
  assert.throws(() => selection.resolveDatabasePath("relative.sqlite"), /absolute/);
  assert.throws(() => selection.resolveDatabasePath(path.join(os.tmpdir(), "outside.sqlite")), /data directory/);
  assert.throws(() => selection.resolveDatabasePath(symlinkPath), /symbolic link/);
  assert.throws(() => selection.resolveDatabasePath(danglingSymlinkPath), /symbolic link/);
  await assert.rejects(fs.access(danglingTargetPath));
  assert.equal(selection.publishDatabaseSelection(firstPath), sqliteFileUrl(firstPath));
  assert.equal(await fs.readFile(activeDatabasePath, "utf8"), sqliteFileUrl(firstPath));

  const dbModuleUrl = pathToFileURL(path.resolve("apps/mcp-server/src/lib/db.ts")).href;
  const { prisma } = await import(`${dbModuleUrl}?test=${Date.now()}`) as {
    prisma: PrismaClient;
  };

  try {
    const fallbackRows = await prisma.$queryRawUnsafe<Array<{ value: string }>>("SELECT value FROM marker");
    assert.equal(fallbackRows[0]?.value, "first");

    await fs.writeFile(activeDatabasePath, "file:relative.sqlite", "utf8");
    const relativeRows = await prisma.$queryRawUnsafe<Array<{ value: string }>>("SELECT value FROM marker");
    assert.equal(relativeRows[0]?.value, "first");

    await fs.writeFile(activeDatabasePath, sqliteFileUrl(path.join(os.tmpdir(), "outside.sqlite")), "utf8");
    const outsideRows = await prisma.$queryRawUnsafe<Array<{ value: string }>>("SELECT value FROM marker");
    assert.equal(outsideRows[0]?.value, "first");

    await fs.writeFile(activeDatabasePath, sqliteFileUrl(symlinkPath), "utf8");
    const symlinkRows = await prisma.$queryRawUnsafe<Array<{ value: string }>>("SELECT value FROM marker");
    assert.equal(symlinkRows[0]?.value, "first");

    await fs.writeFile(activeDatabasePath, sqliteFileUrl(secondPath), "utf8");

    const selectedRows = await prisma.$queryRawUnsafe<Array<{ value: string }>>("SELECT value FROM marker");
    assert.equal(selectedRows[0]?.value, "second");

    await fs.writeFile(activeDatabasePath, "file:", "utf8");
    const malformedRows = await prisma.$queryRawUnsafe<Array<{ value: string }>>("SELECT value FROM marker");
    assert.equal(malformedRows[0]?.value, "second");
  } finally {
    await prisma.$disconnect();
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousDataDir === undefined) delete process.env.JOBTRACKER_DATA_DIR;
    else process.env.JOBTRACKER_DATA_DIR = previousDataDir;
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.rm(outsideDir, { recursive: true, force: true });
  }
});
