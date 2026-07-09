#!/usr/bin/env bash
set -eu

data_dir="${JOBTRACKER_DATA_DIR:-/data}"
resume_dir="${data_dir}/resumes"
backup_dir="${data_dir}/backups"
control_file="${data_dir}/control.txt"

mkdir -p "${data_dir}" "${resume_dir}" "${backup_dir}"

if [ ! -f "${control_file}" ]; then
  cat >"${control_file}" <<'EOF'
GOALS

CONSTRAINTS

FOLLOW UP STRATEGY

EXPERIMENTS

OBSERVATIONS

QUESTIONS FOR GPT

SYSTEM NOTES
EOF
fi

# If the user picked a custom DB path via the Settings UI, honour it.
active_db_file="${data_dir}/active-db.txt"
if [ -f "${active_db_file}" ]; then
  export DATABASE_URL="$(cat "${active_db_file}")"
fi

PRISMA=/app/apps/web/node_modules/.bin/prisma
SCHEMA=/app/apps/web/prisma/schema.prisma

# Run migrations. Recover from two broken states caused by db push creating a DB without
# migration history:
#   P3005 — schema exists but no _prisma_migrations table at all
#   P3009 — _prisma_migrations exists but has a failed entry (from a prior partial baseline)
# In both cases we wipe the migration history and re-baseline all migrations as applied.
baseline_all() {
  echo "Baselining all migrations against existing schema..."
  for dir in /app/apps/web/prisma/migrations/*/; do
    name=$(basename "${dir}")
    "${PRISMA}" migrate resolve --applied "${name}" --schema "${SCHEMA}" 2>/dev/null || true
  done
}

migrate_output=$("${PRISMA}" migrate deploy --schema "${SCHEMA}" 2>&1) && migrate_ok=0 || migrate_ok=$?
echo "${migrate_output}"
if [ $migrate_ok -ne 0 ]; then
  if echo "${migrate_output}" | grep -qE "P3005|P3009"; then
    # Extract and roll back any failed migration so --applied can overwrite it
    failed=$(echo "${migrate_output}" | grep -o 'The `[^`]*` migration' | grep -o '`[^`]*`' | tr -d '`' | head -1)
    if [ -n "${failed}" ]; then
      echo "Rolling back failed migration: ${failed}"
      "${PRISMA}" migrate resolve --rolled-back "${failed}" --schema "${SCHEMA}" 2>/dev/null || true
    fi
    baseline_all
    "${PRISMA}" migrate deploy --schema "${SCHEMA}"
  else
    exit $migrate_ok
  fi
fi

export HOSTNAME=0.0.0.0
export PORT="${PORT:-3000}"

exec node /app/apps/web/server.js
