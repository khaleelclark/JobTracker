#!/usr/bin/env bash
set -eu

data_dir="${JOBTRACKER_DATA_DIR:-/data}"
mkdir -p "${data_dir}" "${data_dir}/resumes" "${data_dir}/backups"

# Use the database selected in the Settings UI. The MCP client also watches this
# file at runtime, so later UI switches do not require rebuilding the container.
active_db_file="${data_dir}/active-db.txt"
selected_db_url="$(node -e '
  const fs = require("node:fs");
  const path = require("node:path");
  const dataDir = path.resolve(process.argv[1]);
  try {
    const value = fs.readFileSync(process.argv[2], "utf8").trim();
    if (!value.startsWith("file:")) process.exit(1);
    const databasePath = value.slice(5);
    if (!path.isAbsolute(databasePath)) process.exit(1);
    const resolved = path.resolve(databasePath);
    const relative = path.relative(dataDir, resolved);
    if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) process.exit(1);
    process.stdout.write(`file:${resolved}`);
  } catch { process.exit(1); }
' "${data_dir}" "${active_db_file}" 2>/dev/null || true)"
if [ -n "${selected_db_url}" ]; then
  export DATABASE_URL="${selected_db_url}"
else
  export DATABASE_URL="file:${data_dir}/job-tracker.sqlite"
fi

resume_dir="${GENERATED_RESUME_DIR:-/resumes}"
mkdir -p "${resume_dir}"

cd /app/apps/mcp-server

exec node --import tsx src/index.ts
