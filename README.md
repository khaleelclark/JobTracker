# Job Tracker

Local-first monorepo for passive job-search record keeping.

## Philosophy

- Store and display factual records only.
- Keep strategy and decision-making outside the app.
- MCP service is read-only.

## Monorepo Layout

- `apps/web`: Next.js UI, API routes, Prisma schema.
- `apps/mcp-server`: OAuth-protected read-only MCP/SSE service.
- `packages/shared`: shared constants, schemas, and types.
- `scripts`: operational scripts (`db:migrate`, backups, data-dir init).
- `tests`: invariant and CRUD tests.

## Core Data Areas

- Applications, interviews, interview reflections.
- Follow-up attempts and follow-up results.
- Email logs (with optional notes), engagement events.
- Resumes + application links, master skills + resume links.

## Web UI Capabilities

- Application detail page supports direct section actions:
  - Communication logs: view/edit/delete.
  - Follow-ups: view/edit/delete.
  - Engagement events: view/edit/delete.
  - Interviews: view/edit/delete.
  - Resume links: add/remove links and download linked resume files.
- Quick Log forms auto-dismiss success/error messages after 3 seconds.
- Communication Logs page has full CRUD.

## Runtime Ports

- Web app: `127.0.0.1:3000`
- MCP server: `127.0.0.1:7331`

## Environment

Copy `.env.example` to `.env` and adjust values as needed.

Key variables:

- Paths:
  - `JOBTRACKER_DATA_DIR` (optional override for data root)
  - `DATABASE_URL` (optional override; defaults to local SQLite file)
- MCP/OAuth:
  - `MCP_PORT`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`
  - `MCP_BASE_URL` (optional public HTTPS base URL when exposing MCP outside localhost)

## Quickstart

1. Install deps:
   - `pnpm install`
2. Create env file:
   - Bash: `cp .env.example .env`
   - PowerShell: `Copy-Item .env.example .env`
3. Initialize app-data folders:
   - `pnpm init:data-dir`
4. Run migrations:
   - `pnpm db:migrate`
5. Start services:
   - `pnpm dev`

## Docker Deployment

Use Docker Compose when you want a single command deployment with persistent SQLite storage.

Layout note:

- This app still uses two containers because the web UI and the MCP server are separate services.
- Public exposure is transport-agnostic: use any HTTPS endpoint you want in front of the MCP service.
- `ngrok` is only an optional convenience, not a deployment requirement.

1. Review `.env`:
   - For OpenAI, keep your normal API settings.
   - For a model running on the Docker host, replace `127.0.0.1` with `host.docker.internal`.
2. Build and start:
   - `docker compose up --build -d`
3. Open services:
   - Web UI: `http://127.0.0.1:3000`
   - MCP server: `http://127.0.0.1:7331`
4. Stop:
   - `docker compose down`

Notes:

- The shared Docker volume `job-tracker-data` stores the SQLite database, backups, resumes, OAuth token state, and control file.
- The web container runs `init:data-dir` and `prisma migrate deploy` on startup before serving traffic.
- Compose forces `DATABASE_URL=file:/data/job-tracker.sqlite` so container startup does not depend on a host-specific path from `.env`.
- If you expose MCP publicly, point your tunnel, proxy, or domain at port `7331`.
- More detail: `docs/docker.md`

## Useful Commands

- `pnpm dev:web`: run web service only.
- `pnpm dev:mcp`: run MCP service only.
- `pnpm backup:run`: create SQLite backup + prune old backups.
- `pnpm db:studio`: Prisma Studio.
- `pnpm test`: run invariant + CRUD tests.

## Web API Surface (high level)

- Entity routes:
  - `/api/applications`, `/api/applications/[id]`, `/api/applications/[id]/resumes`
  - `/api/interviews`, `/api/interviews/[id]`
  - `/api/emails`, `/api/emails/[id]`
  - `/api/followups`, `/api/followups/[id]`
  - `/api/followup-results`
  - `/api/engagement-events`, `/api/engagement-events/[id]`
  - `/api/reflections`
  - `/api/resumes`, `/api/resumes/[id]`, `/api/resumes/[id]/download`
  - `/api/master-skills`, `/api/master-skills/[id]`, `/api/master-skills/generate-from-resume`
- Other:
  - `/api/goals-profile`
  - `/api/control-file`

## MCP Endpoints

- Auth/OAuth metadata:
  - `GET /.well-known/oauth-protected-resource`
  - `GET /.well-known/oauth-authorization-server`
  - `GET /oauth/authorize`
  - `POST /oauth/token`
- Streaming:
  - `GET /sse`
  - `POST /messages`
- Tooling:
  - `GET /mcp/tools`
  - `POST /mcp/tools/:toolName`

Supported tool names:

- `search_applications`
- `get_application`
- `list_interviews`
- `get_reflection`
- `list_email_logs`
- `list_followup_attempts`
- `list_engagement_events`
- `get_resume`
- `list_master_skills`
- `get_control_file`
- `get_full_context_dump` (use only when full/system-wide context is explicitly requested)

All MCP outputs are read-only and truncated for safety.
