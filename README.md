# Job Tracker

Local-first monorepo for passive job-search record keeping.

## Philosophy
- Store and display factual records only.
- Keep strategy and decision-making outside the app.
- Local LLM worker can write `ui_cards` only.
- MCP service is read-only.

## Monorepo Layout
- `apps/web`: Next.js UI, API routes, Prisma schema, local LLM worker.
- `apps/mcp-server`: OAuth-protected read-only MCP/SSE service.
- `packages/shared`: shared constants, schemas, and types.
- `scripts`: operational scripts (`db:migrate`, backups, data-dir init).
- `tests`: invariant and CRUD tests.

## Core Data Areas
- Applications, interviews, interview reflections.
- Follow-up attempts and follow-up results.
- Email logs (with optional notes), engagement events.
- Resumes + application links, master skills + resume links.
- LLM run queue/runs and generated UI cards.

## Web UI Capabilities
- Application detail page supports direct section actions:
  - Emails: view/edit/delete.
  - Follow-ups: view/edit/delete.
  - Engagement events: view/edit/delete.
  - Interviews: view/edit/delete.
  - Resume links: add/remove links and download linked resume files.
- Quick Log forms auto-dismiss success/error messages after 3 seconds.
- Email Logs page has full CRUD.

## Runtime Ports
- Web app: `127.0.0.1:3000`
- MCP server: `127.0.0.1:7331`

## Environment
Copy `.env.example` to `.env` and adjust values as needed.

Key variables:
- Paths:
  - `JOBTRACKER_DATA_DIR` (optional override for data root)
  - `DATABASE_URL` (optional override; defaults to local SQLite file)
- LLM runtime:
  - `LLM_RUNTIME=lmstudio|ollama|llamacpp|openai`
  - `LMSTUDIO_BASE_URL`, `OLLAMA_BASE_URL`, `LLAMACPP_BASE_URL`, `OPENAI_BASE_URL`
  - `OPENAI_API_KEY`, `OPENAI_MODEL`, `LLM_MODEL`
  - `LLM_WORKER_INTERVAL_HOURS`, `LLM_WORKER_MIN_GAP_MINUTES`
- MCP/OAuth:
  - `MCP_PORT`, `MCP_BASE_URL`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`

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

## Useful Commands
- `pnpm dev:web`: run web service only.
- `pnpm dev:mcp`: run MCP service only.
- `pnpm worker:run`: force one worker run.
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
  - `/api/ui-cards`, `/api/ui-cards/[id]`
- Other:
  - `/api/goals-profile`
  - `/api/control-file`
  - `/api/worker/refresh`

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

All MCP outputs are read-only and truncated for safety.
