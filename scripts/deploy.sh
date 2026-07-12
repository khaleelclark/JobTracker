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

candidate_compose() {
  docker compose --project-name "${compose_project}" \
    --project-directory "${SOURCE_CHECKOUT}" \
    -f "${SOURCE_CHECKOUT}/docker-compose.yml" "$@"
}

previous_compose() {
  docker compose --project-name "${compose_project}" \
    --project-directory "${rollback_root}" \
    -f "${rollback_root}/docker-compose.yml" "$@"
}

stable_compose() {
  docker compose --project-name "${compose_project}" \
    --project-directory "${DEPLOY_CHECKOUT}" \
    -f "${DEPLOY_CHECKOUT}/docker-compose.yml" "$@"
}

volume_run() {
  docker run --rm -v "${data_volume}:/data" node:22-bookworm-slim "$@"
}

restore_database() {
  # The single-quoted program is expanded inside the volume container.
  # shellcheck disable=SC2016
  volume_run sh -eu -c '
    db="$1"; backup="$2"
    cp "${backup}/database.sqlite" "${db}"
    rm -f "${db}-wal" "${db}-shm"
    [ ! -f "${backup}/database.sqlite-wal" ] || cp "${backup}/database.sqlite-wal" "${db}-wal"
    [ ! -f "${backup}/database.sqlite-shm" ] || cp "${backup}/database.sqlite-shm" "${db}-shm"
    expected=$(cat "${backup}/database.sha256")
    actual=$(sha256sum "${db}" | cut -d " " -f 1)
    [ "${actual}" = "${expected}" ]
  ' -- "${active_db_path}" "${backup_dir}"
}

rollback() {
  trap - ERR
  local failed=0
  echo "Candidate deployment failed; restoring previous release"

  if ! candidate_compose stop web mcp; then
    echo "ROLLBACK ERROR: unable to stop candidate services" >&2
    return 1
  fi

  if [ "${backup_ready:-0}" = "1" ]; then
    if ! restore_database; then
      echo "ROLLBACK ERROR: database restoration or checksum verification failed" >&2
      return 1
    fi
  fi

  if ! docker image tag "${previous_web_image}" job-tracker-web:latest; then
    echo "ROLLBACK ERROR: unable to restore previous web image tag" >&2
    failed=1
  fi
  if ! docker image tag "${previous_mcp_image}" job-tracker-mcp:latest; then
    echo "ROLLBACK ERROR: unable to restore previous MCP image tag" >&2
    failed=1
  fi
  if [ "${failed}" = "1" ]; then return 1; fi

  if ! previous_compose up -d --no-build --force-recreate web mcp; then
    echo "ROLLBACK ERROR: unable to recreate previous services" >&2
    return 1
  fi
  if ! wait_for_health; then
    echo "ROLLBACK ERROR: restored services are unhealthy" >&2
    previous_compose ps || true
    previous_compose logs --tail=100 web mcp || true
    return 1
  fi

  echo "Previous release restored with verified database checksum"
  previous_compose ps
}

cleanup() {
  if [ "${created_env_link:-0}" = "1" ]; then rm -f "${SOURCE_CHECKOUT}/.env"; fi
  if [ "${remove_rollback_root:-0}" = "1" ]; then rm -rf "${rollback_root}"; fi
}

if [ "${DEPLOY_LIB_ONLY:-0}" = "1" ]; then return 0; fi

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
compose_project="$(docker inspect job-tracker-web --format '{{index .Config.Labels "com.docker.compose.project"}}')"
data_volume="$(docker inspect job-tracker-web --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}')"
test -n "${compose_project}" || { echo "Unable to identify the Compose project"; exit 1; }
test -n "${data_volume}" || { echo "Unable to identify the JobTracker data volume"; exit 1; }

rollback_root="$(mktemp -d /tmp/job-tracker-rollback.XXXXXX)"
remove_rollback_root=1
trap cleanup EXIT
cp "${DEPLOY_CHECKOUT}/docker-compose.yml" "${rollback_root}/docker-compose.yml"
cp "${DEPLOY_CHECKOUT}/.env" "${rollback_root}/.env"
cp "${DEPLOY_CHECKOUT}/khaleel-master-resume.json" "${rollback_root}/khaleel-master-resume.json"
cp "${DEPLOY_CHECKOUT}/patrick-master-resume.json" "${rollback_root}/patrick-master-resume.json"

cd "${SOURCE_CHECKOUT}"
test "$(git rev-parse HEAD)" = "${EXPECTED_SHA}" || {
  echo "Runner checkout does not match the tested commit ${EXPECTED_SHA}"
  exit 1
}
created_env_link=0
if [ ! -e "${SOURCE_CHECKOUT}/.env" ]; then
  ln -s "${DEPLOY_CHECKOUT}/.env" "${SOURCE_CHECKOUT}/.env"
  created_env_link=1
fi

short_sha="${EXPECTED_SHA:0:12}"
candidate_web_image="job-tracker-web:candidate-${short_sha}"
candidate_mcp_image="job-tracker-mcp:candidate-${short_sha}"
docker build --target web-runtime -t "${candidate_web_image}" .
docker build --target mcp-runtime -t "${candidate_mcp_image}" .

backup_ready=0
remove_rollback_root=0
deployment_started=1
trap 'if [ "${deployment_started:-0}" = "1" ]; then rollback; fi' ERR
previous_compose stop web mcp

# The single-quoted JavaScript runs in the volume container.
# shellcheck disable=SC2016
active_db_path="$(volume_run node -e '
  const fs = require("node:fs");
  const path = require("node:path");
  const root = fs.realpathSync("/data");
  let selected = "/data/job-tracker.sqlite";
  try {
    const value = fs.readFileSync("/data/active-db.txt", "utf8").trim();
    if (value.startsWith("file:")) selected = value.slice(5);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!path.isAbsolute(selected) || !fs.existsSync(selected) || fs.lstatSync(selected).isSymbolicLink()) process.exit(2);
  const canonical = fs.realpathSync(selected);
  const relative = path.relative(root, canonical);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) process.exit(3);
  process.stdout.write(canonical);
')"
case "${active_db_path}" in /data/*.sqlite|/data/*.db) ;; *) echo "Unsupported active database: ${active_db_path}"; exit 1 ;; esac

backup_dir="/data/backups/pre-deploy-${short_sha}-$(date +%s)"
# The single-quoted program is expanded inside the volume container.
# shellcheck disable=SC2016
volume_run sh -eu -c '
  db="$1"; backup="$2"
  mkdir -p "${backup}"
  cp "${db}" "${backup}/database.sqlite"
  [ ! -f "${db}-wal" ] || cp "${db}-wal" "${backup}/database.sqlite-wal"
  [ ! -f "${db}-shm" ] || cp "${db}-shm" "${backup}/database.sqlite-shm"
  sha256sum "${backup}/database.sqlite" | cut -d " " -f 1 > "${backup}/database.sha256"
' -- "${active_db_path}" "${backup_dir}"
backup_ready=1

docker image tag "${candidate_web_image}" job-tracker-web:latest
docker image tag "${candidate_mcp_image}" job-tracker-mcp:latest
candidate_compose up -d --no-build --force-recreate web mcp

if ! wait_for_health; then
  rollback
  deployment_started=0
  exit 1
fi

cd "${DEPLOY_CHECKOUT}"
git pull --ff-only origin main
test "$(git rev-parse HEAD)" = "${EXPECTED_SHA}"
stable_compose up -d --no-build --force-recreate web mcp
if ! wait_for_health; then
  rollback
  deployment_started=0
  exit 1
fi

deployment_started=0
trap - ERR
remove_rollback_root=1
stable_compose ps
echo "Deployed ${EXPECTED_SHA}; previous release was ${previous_sha}; backup retained at ${backup_dir}"
