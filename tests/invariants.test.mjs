import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

test("write trigger only queues worker runs", () => {
  const source = read("apps/web/src/server/hooks/onWriteTriggers.ts");
  assert.match(source, /queueWorkerRun\(\)/);
  assert.doesNotMatch(source, /runWorkerOnce\(/);
});

test("mcp tools are read-only (no prisma mutations)", () => {
  const toolsDir = path.join(repoRoot, "apps/mcp-server/src/tools");
  const files = fs.readdirSync(toolsDir).filter((file) => file.endsWith(".ts"));

  const mutationPattern = /prisma\.[a-zA-Z0-9_]+\.(create|update|upsert|delete|createMany|updateMany|deleteMany)\(/;

  for (const file of files) {
    const source = fs.readFileSync(path.join(toolsDir, file), "utf8");
    assert.doesNotMatch(source, mutationPattern, `unexpected mutation in ${file}`);
  }
});

test("llm worker mutates only card/run tables", () => {
  const source = read("apps/web/src/server/worker/llmWorker.ts");
  const mutationPattern = /prisma\.([a-zA-Z0-9_]+)\.(create|update|updateMany|upsert|delete|deleteMany|createMany)\(/g;
  const allowedModels = new Set(["uiCard", "llmRun"]);

  for (const match of source.matchAll(mutationPattern)) {
    const model = match[1];
    assert.ok(allowedModels.has(model), `unexpected prisma mutation target in worker: ${model}`);
  }
});

test("generic status includes under_review across schema/constants/validation/mcp", () => {
  const prismaSchema = read("apps/web/prisma/schema.prisma");
  const sharedConstants = read("packages/shared/src/constants.ts");
  const webValidation = read("apps/web/src/lib/validation.ts");
  const mcpSearch = read("apps/mcp-server/src/tools/searchApplications.ts");

  assert.match(prismaSchema, /enum GenericStatus[\s\S]*under_review/);
  assert.match(sharedConstants, /GENERIC_APPLICATION_STATUSES[\s\S]*"under_review"/);
  assert.match(webValidation, /genericStatus[\s\S]*"under_review"/);
  assert.match(mcpSearch, /generic_status[\s\S]*"under_review"/);
});

test("application status displays use title-case formatter", () => {
  const appTable = read("apps/web/src/components/ApplicationTable.tsx");
  const appCreate = read("apps/web/src/components/forms/ApplicationCreateForm.tsx");
  const appEdit = read("apps/web/src/components/forms/ApplicationEditDeleteForm.tsx");
  const appDetail = read("apps/web/src/app/applications/[id]/page.tsx");
  const today = read("apps/web/src/app/today/page.tsx");
  const globals = read("apps/web/src/app/globals.css");

  assert.match(appTable, /toTitleCaseLabel\(application\.genericStatus\)/);
  assert.match(appCreate, /toTitleCaseLabel\(status\)/);
  assert.match(appEdit, /toTitleCaseLabel\(status\)/);
  assert.match(appDetail, /toTitleCaseLabel\(application\.genericStatus\)/);
  assert.match(today, /toTitleCaseLabel\(application\.genericStatus\)/);
  assert.match(globals, /\.status-under_review/);
});
