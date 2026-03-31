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

/app/apps/web/node_modules/.bin/prisma migrate deploy --schema /app/apps/web/prisma/schema.prisma

export HOSTNAME=0.0.0.0
export PORT="${PORT:-3000}"

exec node /app/apps/web/server.js
