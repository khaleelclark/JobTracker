import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PrismaClient } from "../apps/web/node_modules/@prisma/client/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(repoRoot, "apps/web/prisma/migrations");

function sqliteFileUrl(filePath: string): string {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => `${part};`);
}

async function applyMigrations(prisma: PrismaClient): Promise<void> {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const migrationFolders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  for (const folder of migrationFolders) {
    const sqlPath = path.join(migrationsDir, folder, "migration.sql");
    const sql = await fs.readFile(sqlPath, "utf8");
    const statements = splitSqlStatements(sql);

    for (const statement of statements) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.$executeRawUnsafe(statement);
    }
  }
}

async function importRunQueueModule() {
  const absolute = path.join(repoRoot, "apps/web/src/server/worker/runQueue.ts");
  const href = `${pathToFileURL(absolute).href}?t=${Date.now()}-${Math.random()}`;
  return import(href) as Promise<{
    ensureRunQueueRow: () => Promise<void>;
    markWorkerPending: () => Promise<void>;
    canRunNow: (now?: Date) => Promise<{ allowed: boolean; reason?: string }>;
    beginRun: (now?: Date) => Promise<void>;
    finishRun: (now?: Date) => Promise<void>;
    isPending: () => Promise<boolean>;
  }>;
}

test("worker queue/run CRUD state transitions are covered", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "job-tracker-worker-queue-"));
  const dbPath = path.join(tempRoot, "worker-queue.sqlite");
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = sqliteFileUrl(dbPath);
  process.env.LLM_WORKER_MIN_GAP_MINUTES = "1";

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: sqliteFileUrl(dbPath),
      },
    },
  });

  try {
    await prisma.$connect();
    await applyMigrations(prisma);

    const runQueue = await importRunQueueModule();

    await runQueue.ensureRunQueueRow();
    const queueAfterEnsure = await prisma.llmRunQueue.findUnique({ where: { id: 1 } });
    assert.ok(queueAfterEnsure);
    assert.equal(queueAfterEnsure?.pending, false);

    await runQueue.markWorkerPending();
    assert.equal(await runQueue.isPending(), true);

    const gateWhenPending = await runQueue.canRunNow(new Date("2026-03-02T12:00:00.000Z"));
    assert.equal(gateWhenPending.allowed, true);

    const startedAt = new Date("2026-03-02T12:00:00.000Z");
    await runQueue.beginRun(startedAt);
    const queueAfterBegin = await prisma.llmRunQueue.findUnique({ where: { id: 1 } });
    assert.equal(queueAfterBegin?.pending, false);
    assert.equal(queueAfterBegin?.lastRunStartedAt?.toISOString(), startedAt.toISOString());

    const blockedByMinGap = await runQueue.canRunNow(new Date("2026-03-02T12:00:20.000Z"));
    assert.equal(blockedByMinGap.allowed, false);
    assert.equal(blockedByMinGap.reason, "min_gap");

    const finishedAt = new Date("2026-03-02T12:01:00.000Z");
    await runQueue.finishRun(finishedAt);
    const queueAfterFinish = await prisma.llmRunQueue.findUnique({ where: { id: 1 } });
    assert.equal(queueAfterFinish?.lastRunFinishedAt?.toISOString(), finishedAt.toISOString());
    assert.ok(queueAfterFinish?.cooldownUntil);

    const blockedByCooldown = await runQueue.canRunNow(new Date("2026-03-02T12:01:20.000Z"));
    assert.equal(blockedByCooldown.allowed, false);
    assert.equal(blockedByCooldown.reason, "cooldown");

    await prisma.llmRun.createMany({
      data: [
        { startedAt: new Date("2026-03-02T14:00:00.000Z"), finishedAt: new Date("2026-03-02T14:01:00.000Z") },
        { startedAt: new Date("2026-03-02T14:10:00.000Z"), finishedAt: new Date("2026-03-02T14:11:00.000Z") },
        { startedAt: new Date("2026-03-02T14:20:00.000Z"), finishedAt: new Date("2026-03-02T14:21:00.000Z") },
      ],
    });
    await prisma.llmRunQueue.update({
      where: { id: 1 },
      data: {
        cooldownUntil: null,
        lastRunStartedAt: new Date("2026-03-02T12:00:00.000Z"),
      },
    });

    const blockedByHourlyLimit = await runQueue.canRunNow(new Date("2026-03-02T14:30:00.000Z"));
    assert.equal(blockedByHourlyLimit.allowed, false);
    assert.equal(blockedByHourlyLimit.reason, "max_runs_per_hour");
  } finally {
    await prisma.$disconnect();
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
