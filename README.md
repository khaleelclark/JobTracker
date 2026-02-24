# Job Tracker

Local-first monorepo for passive job-search record keeping.

## Philosophy
- App stores and displays structured facts.
- Local LLM worker can only write `ui_cards`.
- MCP service is read-only.
- GPT + user perform all reasoning and decisions.

## Services
- `apps/web`: Next.js UI, passive API routes, Prisma schema, local LLM worker
- `apps/mcp-server`: read-only MCP-style tool server (OAuth + SSE)
- `packages/shared`: shared constants, types, and Zod validation

## Key Data Areas
- Applications, interviews, follow-ups, emails, events, reflections
- Resumes and linked applications
- Master skills inventory (canonical skills list) and resume-skill links

## Ports
- Web app: `127.0.0.1:3000`
- MCP server: `127.0.0.1:7331`

## Quickstart
1. Install dependencies:
   - `pnpm install`
2. Create local env:
   - PowerShell: `Copy-Item .env.example .env`
3. Choose insights runtime:
   - Local LM Studio (default):
     - `LLM_RUNTIME=lmstudio`
     - Load model: `openai/gpt-oss-20b`
     - Enable OpenAI-compatible server at `http://127.0.0.1:1234`
   - OpenAI API:
     - `LLM_RUNTIME=openai`
     - Set `OPENAI_API_KEY=...`
     - Optional: `OPENAI_MODEL=gpt-4o-mini` and `OPENAI_BASE_URL=https://api.openai.com/v1`
4. Initialize app-data folders and control file:
   - `pnpm init:data-dir`
5. Run DB migrations:
   - `pnpm db:migrate`
6. Start both services:
   - `pnpm dev`

## Useful Commands
- `pnpm dev:web`: run web service only
- `pnpm dev:mcp`: run MCP service only
- `pnpm ollama:serve:cpu`: start Ollama with `ROCR_VISIBLE_DEVICES=-1` (PowerShell, optional fallback runtime)
- `pnpm ollama:serve:cpu:sh`: start Ollama with `ROCR_VISIBLE_DEVICES=-1` (Bash, optional fallback runtime)
- `pnpm worker:run`: force one local LLM worker run
- `pnpm backup:run`: create SQLite backup and prune backups older than 30 days
- `pnpm db:studio`: open Prisma Studio

## MCP Tool Endpoints
- `POST /mcp/tools/search_applications`
- `POST /mcp/tools/get_application`
- `POST /mcp/tools/list_interviews`
- `POST /mcp/tools/get_reflection`
- `POST /mcp/tools/list_email_logs`
- `POST /mcp/tools/list_followup_attempts`
- `POST /mcp/tools/list_engagement_events`
- `POST /mcp/tools/get_resume`
- `POST /mcp/tools/list_master_skills`
- `POST /mcp/tools/get_control_file`

All MCP endpoints are bearer-protected and read-only.
