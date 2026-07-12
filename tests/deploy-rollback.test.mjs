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
  const source = path.join(root, "source");
  const volume = path.join(root, "volume");
  const log = path.join(root, "commands.log");
  const state = path.join(root, "health.state");
  const harness = path.join(root, "harness.sh");

  await fs.mkdir(path.join(volume, "backups"), { recursive: true });
  await fs.mkdir(deploy, { recursive: true });
  await fs.mkdir(source, { recursive: true });
  await fs.writeFile(path.join(volume, "job-tracker.sqlite"), "original-database");
  await fs.writeFile(path.join(volume, "volume-sentinel"), "preserved");
  await fs.writeFile(path.join(deploy, "docker-compose.yml"), "name: previous-compose\n");
  await fs.writeFile(path.join(source, "docker-compose.yml"), "name: candidate-compose\n");
  await fs.writeFile(path.join(deploy, ".env"), "TEST_ONLY=1\n");
  await fs.writeFile(path.join(deploy, "khaleel-master-resume.json"), "{}\n");
  await fs.writeFile(path.join(deploy, "patrick-master-resume.json"), "{}\n");
  await fs.writeFile(state, "healthy");

  await fs.writeFile(harness, `#!/usr/bin/env bash
set -Eeuo pipefail
export DEPLOY_CHECKOUT="${deploy}"
export SOURCE_CHECKOUT="${source}"
export EXPECTED_SHA="${expectedSha}"
export HEALTH_ATTEMPTS=1
export HEALTH_DELAY_SECONDS=0
SCENARIO="${scenario}"

flock() { return 0; }
sleep() { return 0; }
git() {
  case "$1 $2" in
    "status --porcelain") return 0 ;;
    "fetch origin") return 0 ;;
    "rev-parse origin/main") printf '%s\\n' "${expectedSha}" ;;
    "rev-parse HEAD")
      if [ "$PWD" = "${source}" ]; then
        printf '%s\\n' "${expectedSha}"
      elif [ -f "${root}/pulled" ]; then
        if [ "$SCENARIO" = "sha_mismatch" ]; then echo wrong-sha; else printf '%s\\n' "${expectedSha}"; fi
      else
        echo previous-sha
      fi ;;
    "pull --ff-only")
      if [ "$SCENARIO" = "pull_failure" ]; then return 1; fi
      touch "${root}/pulled" ;;
    *) echo "unexpected git command: $*" >&2; return 2 ;;
  esac
}
curl() { [ "$(cat "${state}")" = "healthy" ]; }
docker() {
  printf '%s\\n' "$*" >> "${log}"
  if [ "$1" = "image" ] && [ "$2" = "inspect" ]; then
    if [[ "$3" = *web* ]]; then echo sha256:previous-web; else echo sha256:previous-mcp; fi
    return 0
  fi
  if [ "$1" = "inspect" ]; then
    if [[ "$*" = *compose.project* ]]; then echo jobtracker; else echo jobtracker_job-tracker-data; fi
    return 0
  fi
  if [ "$1" = "build" ] || { [ "$1" = "image" ] && [ "$2" = "tag" ]; }; then return 0; fi
  if [ "$1" = "run" ]; then
    if [[ "$*" = *"node -e"* ]]; then
      echo /data/job-tracker.sqlite
    elif [[ "$*" = *"mkdir -p"* ]]; then
      backup=$(printf '%s' "$*" | grep -o '/data/backups/[^ ]*' | tail -1)
      host_backup="${volume}\${backup#/data}"
      mkdir -p "$host_backup"
      cp "${volume}/job-tracker.sqlite" "$host_backup/database.sqlite"
      sha256sum "$host_backup/database.sqlite" | cut -d ' ' -f 1 > "$host_backup/database.sha256"
    else
      backup=$(printf '%s' "$*" | grep -o '/data/backups/[^ ]*' | tail -1)
      host_backup="${volume}\${backup#/data}"
      cp "$host_backup/database.sqlite" "${volume}/job-tracker.sqlite"
      expected=$(cat "$host_backup/database.sha256")
      actual=$(sha256sum "${volume}/job-tracker.sqlite" | cut -d ' ' -f 1)
      [ "$actual" = "$expected" ]
    fi
    return 0
  fi
  if [ "$1" = "compose" ]; then
    if [[ "$*" = *" up "* ]] && [[ "$*" = *"${source}/docker-compose.yml"* ]]; then
      printf '%s' candidate-migrated > "${volume}/job-tracker.sqlite"
      if [ "$SCENARIO" = "candidate_health_failure" ]; then printf '%s' unhealthy > "${state}"; else printf '%s' healthy > "${state}"; fi
    elif [[ "$*" = *" up "* ]] && [[ "$*" = *"${deploy}/docker-compose.yml"* ]]; then
      if [ "$SCENARIO" = "stable_recreate_failure" ]; then return 1; fi
      printf '%s' healthy > "${state}"
    elif [[ "$*" = *" up "* ]] && [[ "$*" = *"job-tracker-rollback"* ]]; then
      printf '%s' healthy > "${state}"
    fi
    return 0
  fi
  echo "unexpected docker command: $*" >&2
  return 2
}

source "${path.join(repoRoot, "scripts/deploy.sh")}"
`, { mode: 0o700 });

  const result = spawnSync("bash", [harness], { encoding: "utf8" });
  const commands = await fs.readFile(log, "utf8");
  return { root, deploy, source, volume, result, commands };
}

for (const scenario of ["candidate_health_failure", "pull_failure", "sha_mismatch", "stable_recreate_failure"]) {
  test(`failed deployment restores prior release: ${scenario}`, async () => {
    const run = await runScenario(scenario);
    try {
      assert.equal(run.result.status, 1, `stdout:\n${run.result.stdout}\nstderr:\n${run.result.stderr}`);
      assert.equal(await fs.readFile(path.join(run.volume, "job-tracker.sqlite"), "utf8"), "original-database");
      assert.equal(await fs.readFile(path.join(run.volume, "volume-sentinel"), "utf8"), "preserved");
      assert.match(run.commands, new RegExp(`${run.source}/docker-compose\\.yml.*up -d --no-build`));
      assert.match(run.commands, /job-tracker-rollback\.[^/]*\/docker-compose\.yml.*up -d --no-build/);
      assert.match(run.commands, /image tag sha256:previous-web job-tracker-web:latest/);
      assert.match(run.commands, /image tag sha256:previous-mcp job-tracker-mcp:latest/);
    } finally {
      await fs.rm(run.root, { recursive: true, force: true });
    }
  });
}

test("successful deployment finishes on the stable checkout Compose definition", async () => {
  const run = await runScenario("success");
  try {
    assert.equal(run.result.status, 0, `stdout:\n${run.result.stdout}\nstderr:\n${run.result.stderr}`);
    assert.equal(await fs.readFile(path.join(run.volume, "job-tracker.sqlite"), "utf8"), "candidate-migrated");
    assert.equal(await fs.readFile(path.join(run.volume, "volume-sentinel"), "utf8"), "preserved");
    assert.match(run.commands, new RegExp(`${run.source}/docker-compose\\.yml.*up -d --no-build`));
    assert.match(run.commands, new RegExp(`${run.deploy}/docker-compose\\.yml.*up -d --no-build`));
    assert.doesNotMatch(run.commands, /image tag sha256:previous-web job-tracker-web:latest/);
  } finally {
    await fs.rm(run.root, { recursive: true, force: true });
  }
});
