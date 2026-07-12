import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";

test("active default database cannot be deleted through canonical or aliased paths", async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousDataDir = process.env.JOBTRACKER_DATA_DIR;
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-tracker-selection-safety-"));
  const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-tracker-selection-outside-"));
  const defaultPath = path.join(tempDir, "job-tracker.sqlite");
  const outsidePath = path.join(outsideDir, "outside.sqlite");
  const symlinkPath = path.join(tempDir, "linked.sqlite");
  const danglingTargetPath = path.join(outsideDir, "not-created.sqlite");
  const danglingSymlinkPath = path.join(tempDir, "dangling.sqlite");
  const originalContents = Buffer.from("original database contents");

  try {
    await fs.writeFile(defaultPath, originalContents);
    await fs.writeFile(outsidePath, "outside");
    await fs.symlink(outsidePath, symlinkPath);
    await fs.symlink(danglingTargetPath, danglingSymlinkPath);
    await fs.mkdir(path.join(tempDir, "sub"));
    process.env.NODE_ENV = "test";
    process.env.JOBTRACKER_DATA_DIR = tempDir;
    process.env.DATABASE_URL = `file:${defaultPath}`;

    const routeUrl = `${pathToFileURL(path.resolve("src/app/api/db-path/manage/route.ts")).href}?test=${Date.now()}`;
    const { POST } = await import(routeUrl) as { POST: (request: Request) => Promise<Response> };

    for (const requestedPath of [defaultPath, path.join(tempDir, "sub", "..", "job-tracker.sqlite")]) {
      const response = await POST(new Request("http://localhost/api/db-path/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", path: requestedPath }),
      }));
      assert.equal(response.status, 400);
      assert.deepEqual(await fs.readFile(defaultPath), originalContents);
    }

    const selectionUrl = `${pathToFileURL(path.resolve("src/lib/databaseSelection.ts")).href}?test=${Date.now()}`;
    const { resolveDatabasePath } = await import(selectionUrl) as {
      resolveDatabasePath: (candidate: string) => string;
    };
    assert.throws(() => resolveDatabasePath(symlinkPath), /symbolic link/);
    assert.throws(() => resolveDatabasePath(danglingSymlinkPath), /symbolic link/);

    const selectionRouteUrl = `${pathToFileURL(path.resolve("src/app/api/db-path/route.ts")).href}?test=${Date.now()}`;
    const { POST: selectDatabase } = await import(selectionRouteUrl) as {
      POST: (request: Request) => Promise<Response>;
    };
    const response = await selectDatabase(new Request("http://localhost/api/db-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: danglingSymlinkPath }),
    }));
    assert.equal(response.status, 400);
    await assert.rejects(fs.access(danglingTargetPath));
  } finally {
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
