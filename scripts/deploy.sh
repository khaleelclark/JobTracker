#!/usr/bin/env bash
set -euo pipefail

DEPLOY_CHECKOUT="${DEPLOY_CHECKOUT:-/home/phoenix/khaleel/job-tracker}"
EXPECTED_SHA="${EXPECTED_SHA:-}"
WEB_HEALTH_URL="${WEB_HEALTH_URL:-http://127.0.0.1:3000/api/health}"
MCP_HEALTH_URL="${MCP_HEALTH_URL:-http://127.0.0.1:7332/health}"
HEALTH_ATTEMPTS="${HEALTH_ATTEMPTS:-30}"
HEALTH_DELAY_SECONDS="${HEALTH_DELAY_SECONDS:-2}"

test -n "${EXPECTED_SHA}" || { echo "EXPECTED_SHA is required"; exit 1; }

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

git pull --ff-only origin main
test "$(git rev-parse HEAD)" = "${EXPECTED_SHA}" || {
  echo "Deployment checkout HEAD does not match the tested commit ${EXPECTED_SHA}"
  exit 1
}

docker compose up -d --build web mcp

for attempt in $(seq 1 "${HEALTH_ATTEMPTS}"); do
  echo "Health-check attempt ${attempt}/${HEALTH_ATTEMPTS}"
  if curl --fail --silent --show-error "${WEB_HEALTH_URL}" >/dev/null \
    && curl --fail --silent --show-error "${MCP_HEALTH_URL}" >/dev/null; then
    docker compose ps
    echo "Deployed ${EXPECTED_SHA}"
    exit 0
  fi
  sleep "${HEALTH_DELAY_SECONDS}"
done

docker compose ps
docker compose logs --tail=100 web mcp
echo "Deployment health checks failed"
exit 1
