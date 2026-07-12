import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("failed deployment restores the database and previous images", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "job-tracker-deploy-rollback-"));
  const logPath = path.join(tempDir, "commands.log");
  const harnessPath = path.join(tempDir, "harness.sh");
  await fs.writeFile(harnessPath, `#!/usr/bin/env bash
set -euo pipefail
export DEPLOY_LIB_ONLY=1
source "${path.join(repoRoot, "scripts/deploy.sh")}" 
DEPLOY_CHECKOUT="${tempDir}"
data_volume="job-tracker-data"
backup_path="/data/backups/pre-deploy.sqlite"
active_db_path="/data/job-tracker.sqlite"
previous_web_image="sha256:previous-web"
previous_mcp_image="sha256:previous-mcp"
HEALTH_ATTEMPTS=1
HEALTH_DELAY_SECONDS=0
health_check() { return 1; }
docker() { printf '%s\\n' "$*" >> "${logPath}"; return 0; }
if wait_for_health; then exit 10; fi
health_check() { return 0; }
rollback
`, { mode: 0o700 });

  try {
    const result = spawnSync("bash", [harnessPath], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const log = await fs.readFile(logPath, "utf8");
    assert.match(log, /compose stop web mcp/);
    assert.match(log, /cp "\$1" "\$2"/);
    assert.match(log, /sha256:previous-web job-tracker-web:latest/);
    assert.match(log, /sha256:previous-mcp job-tracker-mcp:latest/);
    assert.match(log, /compose up -d --no-build --force-recreate web mcp/);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
