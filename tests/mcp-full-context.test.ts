import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
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

async function importFullContextTool() {
  const absolute = path.join(repoRoot, "apps/mcp-server/src/tools/getFullContextDump.ts");
  const href = `${pathToFileURL(absolute).href}?t=${Date.now()}-${Math.random()}`;
  return import(href) as Promise<{
    getFullContextDump: (input: unknown) => Promise<Record<string, unknown>>;
  }>;
}

async function importGetMasterResumeTool() {
  const absolute = path.join(repoRoot, "apps/mcp-server/src/tools/getMasterResume.ts");
  const href = `${pathToFileURL(absolute).href}?t=${Date.now()}-${Math.random()}`;
  return import(href) as Promise<{
    getMasterResume: (input: unknown) => Promise<Record<string, unknown>>;
  }>;
}

test("mcp full-context dump includes warning, filters, truncation, and stays read-only", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-tracker-mcp-full-context-"));
  const dbPath = path.join(tempDir, "mcp-full-context.sqlite");
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = sqliteFileUrl(dbPath);

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

    await prisma.resume.create({
      data: {
        name: "Resume A",
        filePath: "/tmp/resume-a.txt",
        extractedText: "TypeScript, Node.js, PostgreSQL",
      },
    });

    for (let index = 0; index < 80; index += 1) {
      // eslint-disable-next-line no-await-in-loop
      await prisma.application.create({
        data: {
          companyName: `Company ${index + 1}`,
          roleTitle: "Backend Engineer",
          genericStatus: "applied",
          appliedAt: new Date(`2026-02-${String((index % 28) + 1).padStart(2, "0")}T12:00:00.000Z`),
        },
      });
    }

    const { getFullContextDump } = await importFullContextTool();

    const dump = (await getFullContextDump({
      since: "2026-01-01T00:00:00.000Z",
      limit_per_table: 60,
    })) as {
      warning?: { message?: string };
      filters?: { limit_per_table?: number; since?: string | null };
      meta?: {
        table_counts?: Record<string, number>;
        likely_truncated_tables?: string[];
      };
      data?: {
        applications?: unknown[];
        resumes?: Array<{
          content?: {
            source?: string;
            text?: string;
          } | null;
        }>;
      };
    };

    assert.match(String(dump.warning?.message ?? ""), /explicitly asked for full\/system-wide context/i);
    assert.equal(dump.filters?.limit_per_table, 60);
    assert.equal(dump.filters?.since, "2026-01-01T00:00:00.000Z");
    assert.equal((dump.meta?.table_counts?.applications ?? 0) >= 60, true);
    assert.equal(dump.meta?.likely_truncated_tables?.includes("applications"), true);

    // Global truncation policy caps array payloads for safety.
    assert.equal(Array.isArray(dump.data?.applications), true);
    assert.equal((dump.data?.applications?.length ?? 0) <= 50, true);
    assert.equal(Array.isArray(dump.data?.resumes), true);
    assert.equal(dump.data?.resumes?.[0]?.content?.source, "db_extracted_text");
    assert.match(String(dump.data?.resumes?.[0]?.content?.text ?? ""), /TypeScript/);

    const source = await fs.readFile(
      path.join(repoRoot, "apps/mcp-server/src/tools/getFullContextDump.ts"),
      "utf8",
    );
    const mutationPattern = /prisma\.[a-zA-Z0-9_]+\.(create|update|upsert|delete|createMany|updateMany|deleteMany)\(/;
    assert.doesNotMatch(source, mutationPattern);
  } finally {
    await prisma.$disconnect();
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("mcp get_master_resume reads owner-specific managed master resume", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-tracker-mcp-master-resume-"));
  const dataDir = path.join(tempDir, "data");
  const masterResumeDir = path.join(dataDir, "master-resumes");

  try {
    process.env.JOBTRACKER_DATA_DIR = dataDir;
    await fs.mkdir(masterResumeDir, { recursive: true });
    await fs.writeFile(
      path.join(masterResumeDir, "Alex.json"),
      JSON.stringify({
        name: "Alex Resume",
        sections: [{ name: "Experience", type: "timeline", items: [] }],
      }),
      "utf8",
    );

    const { getMasterResume } = await importGetMasterResumeTool();
    const defaultResult = await getMasterResume({});
    assert.equal(defaultResult.owner, "default");
    assert.match(String(defaultResult.path ?? ""), /khaleel-master-resume\.json$/);
    assert.equal((defaultResult.master_resume as { name?: string }).name, "Khaleel Zindel Clark");

    const patrickResult = await getMasterResume({ owner: "Patrick" });
    assert.equal(patrickResult.owner, "Patrick");
    assert.match(String(patrickResult.path ?? ""), /patrick-master-resume\.json$/);
    assert.equal((patrickResult.master_resume as { name?: string }).name, "Patrick Michael Tobey");

    const managedResult = await getMasterResume({ owner: "Alex" });
    assert.equal(managedResult.owner, "Alex");
    assert.match(String(managedResult.path ?? ""), /Alex\.json$/);
    assert.equal((managedResult.master_resume as { name?: string }).name, "Alex Resume");
  } finally {
    delete process.env.JOBTRACKER_DATA_DIR;
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
