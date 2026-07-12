#!/usr/bin/env bash
set -eu

data_dir="${JOBTRACKER_DATA_DIR:-/data}"
mkdir -p "${data_dir}" "${data_dir}/resumes" "${data_dir}/backups"

# Use the database selected in the Settings UI. The MCP client also watches this
# file at runtime, so later UI switches do not require rebuilding the container.
active_db_file="${data_dir}/active-db.txt"
if [ -f "${active_db_file}" ]; then
  export DATABASE_URL="$(cat "${active_db_file}")"
else
  export DATABASE_URL="file:${data_dir}/job-tracker.sqlite"
fi

resume_dir="${GENERATED_RESUME_DIR:-/resumes}"
mkdir -p "${resume_dir}"

cd /app/apps/mcp-server

exec node --import tsx src/index.ts
