#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_CHECKOUT="${DEPLOY_CHECKOUT:-/home/phoenix/khaleel/job-tracker}"
EXPECTED_SHA="${EXPECTED_SHA:-}"
SOURCE_CHECKOUT="${SOURCE_CHECKOUT:-${GITHUB_WORKSPACE:-}}"
WEB_HEALTH_URL="${WEB_HEALTH_URL:-http://127.0.0.1:3000/api/health}"
MCP_HEALTH_URL="${MCP_HEALTH_URL:-http://127.0.0.1:7332/health}"
HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-30}"
HEALTH_DELAY_SECONDS="${HEALTH_DELAY_SECONDS:-2}"

health_check() {
  curl --fail --silent --show-error "${WEB_HEALTH_URL}" >/dev/null \
    && curl --fail --silent --show-error "${MCP_HEALTH_URL}" >/dev/null
}

wait_for_health() {
  local attempt
  for attempt in $(seq 1 "${HEALTH_ATTEMPTS}"); do
    echo "Health-check attempt ${attempt}/${HEALTH_ATTEMPTS}"
    if health_check; then return 0; fi
    sleep "${HEALTH_DELAY_SECONDS}"
  done
  return 1
}

rollback() {
  trap - ERR
  set +e
  echo "Candidate deployment failed; restoring database and previous images"
  cd "${DEPLOY_CHECKOUT}" || return 1
  docker compose stop web mcp
  docker run --rm -v "${data_volume}:/data" node:22-bookworm-slim \
    sh -eu -c 'cp "$1" "$2"; rm -f "$2-wal" "$2-shm"' -- "${backup_path}" "${active_db_path}"
  docker image tag "${previous_web_image}" job-tracker-web:latest
  docker image tag "${previous_mcp_image}" job-tracker-mcp:latest
  docker compose up -d --no-build --force-recreate web mcp

  if wait_for_health; then
    echo "Previous release and database restored"
    docker compose ps
    return 0
  fi

  echo "Rollback health checks failed"
  docker compose ps
  docker compose logs --tail=100 web mcp
  return 1
}

if [ "${DEPLOY_LIB_ONLY:-0}" = "1" ]; then return 0 2>/dev/null || exit 0; fi

test -n "${EXPECTED_SHA}" || { echo "EXPECTED_SHA is required"; exit 1; }
test -n "${SOURCE_CHECKOUT}" || { echo "SOURCE_CHECKOUT is required"; exit 1; }

exec 9>/tmp/job-tracker-deploy.lock
flock -n 9 || { echo "Another JobTracker deployment is running"; exit 1; }

cd "${DEPLOY_CHECKOUT}"
test -z "$(git status --porcelain)" || {
  echo "Deployment checkout is dirty; refusing to overwrite local state"
  git status --short
  exit 1
}

git fetch origin main
test "$(git rev-parse origin/main)" = "${EXPECTED_SHA}" || {
  echo "origin/main does not match the tested commit ${EXPECTED_SHA}"
  exit 1
}

previous_sha="$(git rev-parse HEAD)"
previous_web_image="$(docker image inspect job-tracker-web:latest --format '{{.Id}}')"
previous_mcp_image="$(docker image inspect job-tracker-mcp:latest --format '{{.Id}}')"
data_volume="$(docker inspect job-tracker-web --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}')"
active_db_url="$(docker exec job-tracker-web printenv DATABASE_URL)"
active_db_path="${active_db_url#file:}"
case "${active_db_path}" in
  /data/*.sqlite|/data/*.db) ;;
  *) echo "Active database is not a supported file in /data: ${active_db_path}"; exit 1 ;;
esac
test -n "${data_volume}" || { echo "Unable to identify the JobTracker data volume"; exit 1; }

short_sha="${EXPECTED_SHA:0:12}"
candidate_web_image="job-tracker-web:candidate-${short_sha}"
candidate_mcp_image="job-tracker-mcp:candidate-${short_sha}"

cd "${SOURCE_CHECKOUT}"
test "$(git rev-parse HEAD)" = "${EXPECTED_SHA}" || {
  echo "Runner checkout does not match the tested commit ${EXPECTED_SHA}"
  exit 1
}
docker build --target web-runtime -t "${candidate_web_image}" .
docker build --target mcp-runtime -t "${candidate_mcp_image}" .

backup_path="/data/backups/pre-deploy-${short_sha}-$(date +%s).sqlite"
docker exec -e BACKUP_PATH="${backup_path}" job-tracker-web node -e '
  const { PrismaClient } = require("/app/apps/web/node_modules/@prisma/client");
  const prisma = new PrismaClient();
  const quote = String.fromCharCode(39);
  const backup = process.env.BACKUP_PATH.replaceAll(quote, quote + quote);
  (async () => {
    await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(FULL)");
    await prisma.$executeRawUnsafe(`VACUUM INTO '\''${backup}'\''`);
  })().finally(() => prisma.$disconnect());
'

deployment_started=1
trap 'if [ "${deployment_started:-0}" = "1" ]; then rollback; fi' ERR
docker image tag "${candidate_web_image}" job-tracker-web:latest
docker image tag "${candidate_mcp_image}" job-tracker-mcp:latest

cd "${DEPLOY_CHECKOUT}"
docker compose up -d --no-build --force-recreate web mcp

if ! wait_for_health; then
  rollback
  exit 1
fi

git pull --ff-only origin main
test "$(git rev-parse HEAD)" = "${EXPECTED_SHA}"
deployment_started=0
trap - ERR
docker compose ps
echo "Deployed ${EXPECTED_SHA}; previous release was ${previous_sha}; backup retained at ${backup_path}"
