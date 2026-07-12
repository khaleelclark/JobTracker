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

test("mcp tools are read-only (no prisma mutations)", () => {
  const toolsDir = path.join(repoRoot, "apps/mcp-server/src/tools");
  const files = fs.readdirSync(toolsDir).filter((file) => file.endsWith(".ts"));

  const mutationPattern = /prisma\.[a-zA-Z0-9_]+\.(create|update|upsert|delete|createMany|updateMany|deleteMany)\(/;

  for (const file of files) {
    const source = fs.readFileSync(path.join(toolsDir, file), "utf8");
    assert.doesNotMatch(source, mutationPattern, `unexpected mutation in ${file}`);
  }
});

test("insight-card and worker endpoints are removed", () => {
  assert.equal(fs.existsSync(path.join(repoRoot, "apps/web/src/app/api/ui-cards/route.ts")), false);
  assert.equal(fs.existsSync(path.join(repoRoot, "apps/web/src/app/api/ui-cards/[id]/route.ts")), false);
  assert.equal(fs.existsSync(path.join(repoRoot, "apps/web/src/app/api/worker/refresh/route.ts")), false);
  assert.equal(fs.existsSync(path.join(repoRoot, "apps/web/src/server/worker/llmWorker.ts")), false);
});

test("generic status includes under_review across schema/constants/validation/mcp", () => {
  const prismaSchema = read("apps/web/prisma/schema.prisma");
  const sharedConstants = read("packages/shared/src/constants.ts");
  const webValidation = read("apps/web/src/lib/validation.ts");
  const mcpSearch = read("apps/mcp-server/src/tools/searchApplications.ts");

  assert.match(prismaSchema, /enum GenericStatus[\s\S]*under_review/);
  assert.match(sharedConstants, /GENERIC_APPLICATION_STATUSES[\s\S]*"under_review"/);
  assert.match(webValidation, /import\s*{\s*GENERIC_APPLICATION_STATUSES\s*}\s*from\s*"@job-tracker\/shared"/);
  assert.match(webValidation, /genericStatus:\s*z\.enum\(GENERIC_APPLICATION_STATUSES\)/);
  assert.match(mcpSearch, /generic_status[\s\S]*"under_review"/);
});

test("application status displays use title-case formatter", () => {
  const appTable = read("apps/web/src/components/ApplicationTable.tsx");
  const appCreate = read("apps/web/src/components/forms/ApplicationCreateForm.tsx");
  const appEdit = read("apps/web/src/components/forms/ApplicationEditDeleteForm.tsx");
  const statusPill = read("apps/web/src/components/ApplicationStatusPill.tsx");
  const appHeader = read("apps/web/src/components/ApplicationHeader.tsx");
  const appDetail = read("apps/web/src/app/applications/[id]/page.tsx");
  const today = read("apps/web/src/app/today/page.tsx");

  assert.match(appTable, /toTitleCaseLabel\(application\.genericStatus\)/);
  assert.match(appCreate, /toTitleCaseLabel\([a-zA-Z_$][\w$]*\)/);
  assert.match(appEdit, /toTitleCaseLabel\([a-zA-Z_$][\w$]*\)/);
  // Detail page delegates status display through ApplicationHeader.
  assert.match(appDetail, /ApplicationHeader/);
  assert.match(appHeader, /ApplicationStatusPill/);
  assert.match(statusPill, /toTitleCaseLabel\(status\)/);
  assert.match(today, /toTitleCaseLabel\([a-zA-Z_$][\w$]*\.genericStatus\)/);
  assert.match(statusPill, /STATUS_SX[\s\S]*under_review:/);
});

test("mcp full-context tool is available with warning metadata", () => {
  const toolsIndex = read("apps/mcp-server/src/tools/index.ts");
  assert.match(toolsIndex, /name:\s*"get_full_context_dump"/);
  assert.match(toolsIndex, /Use only when explicitly asked for full\/system-wide context/i);
});
