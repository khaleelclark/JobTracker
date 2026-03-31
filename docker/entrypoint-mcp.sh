#!/usr/bin/env bash
set -eu

data_dir="${JOBTRACKER_DATA_DIR:-/data}"
mkdir -p "${data_dir}" "${data_dir}/resumes" "${data_dir}/backups"

cd /app/apps/mcp-server

exec node --import tsx src/index.ts
