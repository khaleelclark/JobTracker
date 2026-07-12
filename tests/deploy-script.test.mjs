import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expectedSha = "1234567890abcdef1234567890abcdef12345678";

async function runScenario(scenario) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), `job-tracker-deploy-${scenario}-`));
  const deploy = path.join(root, "deploy");
  const log = path.join(root, "commands.log");
  const harness = path.join(root, "harness.sh");
  await fs.mkdir(deploy, { recursive: true });

  await fs.writeFile(harness, `#!/usr/bin/env bash
set -euo pipefail
export DEPLOY_CHECKOUT="${deploy}"
export EXPECTED_SHA="${expectedSha}"
export HEALTH_ATTEMPTS=1
export HEALTH_DELAY_SECONDS=0
SCENARIO="${scenario}"

flock() { printf '%s\\n' "flock $*" >> "${log}"; return 0; }
sleep() { return 0; }
git() {
  printf '%s\\n' "git $*" >> "${log}"
  case "$1 $2" in
    "status --porcelain") [ "$SCENARIO" != "dirty" ] || echo " M user-file" ;;
    "status --short") echo " M user-file" ;;
    "fetch origin") return 0 ;;
    "rev-parse origin/main")
      if [ "$SCENARIO" = "remote_mismatch" ]; then echo wrong-remote-sha; else printf '%s\\n' "${expectedSha}"; fi ;;
    "pull --ff-only") touch "${root}/pulled" ;;
    "rev-parse HEAD")
      if [ -f "${root}/pulled" ]; then printf '%s\\n' "${expectedSha}"; else echo previous-sha; fi ;;
    *) echo "unexpected git command: $*" >&2; return 2 ;;
  esac
}
docker() {
  printf '%s\\n' "docker $*" >> "${log}"
  return 0
}
curl() {
  printf '%s\\n' "curl $*" >> "${log}"
  [ "$SCENARIO" != "health_failure" ]
}

source "${path.join(repoRoot, "scripts/deploy.sh")}"
`, { mode: 0o700 });

  const result = spawnSync("bash", [harness], { encoding: "utf8" });
  const commands = await fs.readFile(log, "utf8");
  return { root, result, commands };
}

test("dirty checkout refuses deployment before pull or build", async () => {
  const run = await runScenario("dirty");
  try {
    assert.equal(run.result.status, 1);
    assert.match(run.result.stdout, /checkout is dirty/);
    assert.doesNotMatch(run.commands, /git pull/);
    assert.doesNotMatch(run.commands, /docker compose up/);
  } finally {
    await fs.rm(run.root, { recursive: true, force: true });
  }
});

test("remote SHA mismatch refuses deployment", async () => {
  const run = await runScenario("remote_mismatch");
  try {
    assert.equal(run.result.status, 1);
    assert.match(run.result.stdout, /origin\/main does not match/);
    assert.doesNotMatch(run.commands, /git pull/);
    assert.doesNotMatch(run.commands, /docker compose up/);
  } finally {
    await fs.rm(run.root, { recursive: true, force: true });
  }
});

test("successful deployment fast-forwards, rebuilds, and checks both services", async () => {
  const run = await runScenario("success");
  try {
    assert.equal(run.result.status, 0, run.result.stderr || run.result.stdout);
    assert.match(run.commands, /git pull --ff-only origin main/);
    assert.match(run.commands, /git rev-parse HEAD/);
    assert.match(run.commands, /docker compose up -d --build web mcp/);
    assert.match(run.commands, /curl .*3000\/api\/health/);
    assert.match(run.commands, /curl .*7332\/health/);
    assert.match(run.commands, /docker compose ps/);
  } finally {
    await fs.rm(run.root, { recursive: true, force: true });
  }
});

test("failed health reports Compose status and logs", async () => {
  const run = await runScenario("health_failure");
  try {
    assert.equal(run.result.status, 1);
    assert.match(run.result.stdout, /health checks failed/);
    assert.match(run.commands, /docker compose ps/);
    assert.match(run.commands, /docker compose logs --tail=100 web mcp/);
  } finally {
    await fs.rm(run.root, { recursive: true, force: true });
  }
});

test("deployment script contains no destructive volume commands", async () => {
  const script = await fs.readFile(path.join(repoRoot, "scripts/deploy.sh"), "utf8");
  assert.doesNotMatch(script, /docker\s+compose\s+down\s+[^\n]*-v/);
  assert.doesNotMatch(script, /docker\s+volume\s+(rm|prune)/);
  assert.doesNotMatch(script, /docker\s+system\s+prune/);
});
