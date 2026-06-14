# Job Tracker

Local-first monorepo for passive job-search record keeping. Runs entirely on your machine via Docker. No cloud dependencies.

## Philosophy

- Store and display factual records only — no AI-generated rankings or suggestions embedded in the app.
- Strategy and decision-making happen outside the app via human reasoning and AI analysis through MCP.
- MCP server is read-only: it observes data, never mutates it.

## Monorepo Layout

- `apps/web` — Next.js UI, API routes, Prisma schema.
- `apps/mcp-server` — OAuth-protected MCP/SSE service with 12 read-only tools + resume generation.
- `packages/shared` — shared constants, schemas, and types.
- `scripts` — operational scripts (db:migrate, backups, data-dir init).
- `tests` — invariant and CRUD tests.
- `docker/` — container entrypoint scripts.

## Quickstart (Docker — recommended)

1. Copy the env file:
   ```bash
   cp .env.example .env
   ```
2. Fill in `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` in `.env` (any strings you choose — they protect the MCP server).
3. Build and start:
   ```bash
   docker compose up --build -d
   ```
4. Open the web UI: `http://localhost:3000`
5. Connect Claude to MCP at `http://localhost:7331`

Stop everything:
```bash
docker compose down
```

On first boot the web container automatically runs `prisma migrate deploy` and initializes all data directories before serving traffic.

## Quickstart (Local Dev)

1. Install deps: `pnpm install`
2. Copy env: `cp .env.example .env`
3. Run migrations: `pnpm db:migrate`
4. Start services: `pnpm dev`

## Runtime Ports

| Service | Address |
|---------|---------|
| Web UI  | `http://localhost:3000` |
| MCP server | `http://localhost:7331` |

## Environment Variables

Copy `.env.example` to `.env`. Most defaults work out of the box.

| Variable | Default | Description |
|----------|---------|-------------|
| `JOBTRACKER_DATA_DIR` | auto | Override data root directory |
| `DATABASE_URL` | auto | Override SQLite path |
| `APP_BASE_URL` | `http://localhost:3000` | Used to build resume download links |
| `RESUME_OUTPUT_DIR` | `~/Documents/Job App Resumes` | Where generated PDF resumes are saved on your machine |
| `MCP_PORT` | `7331` | MCP server port |
| `MCP_BASE_URL` | — | Optional public HTTPS URL if exposing MCP externally |
| `OAUTH_CLIENT_ID` | — | Required: protects MCP server |
| `OAUTH_CLIENT_SECRET` | — | Required: protects MCP server |

## Web UI Pages

- **Today** — Dashboard with upcoming interviews, recent activity timeline, and application status counts. All items are clickable and link to their application.
- **Applications** — Full list with search and status filtering. Archived applications are hidden by default with a toggle to reveal them. Clicking a status count on the Today page deep-links here with the filter pre-applied.
- **Application Detail** — Full CRUD for all data related to one application: interviews (with notes/meeting links), email logs, follow-up attempts, engagement events, and linked resumes.
- **Emails** — Global communication log across all applications and companies.
- **Interviews** — Global interview list across all applications, with notes column for meeting links and interviewer names.
- **Goals** — Job search goals and profile configuration (backed by the control file).
- **Resumes** — Upload and manage resumes, extract text, link to applications and skills.
- **Settings** — Application and database configuration.

## Resume Generation Workflow

Claude can generate tailored PDF resumes via the `generate_resume` MCP tool:

1. Ask Claude to tailor your resume for a specific job posting.
2. Claude calls `get_master_resume` to load your source resume JSON, tailors it, then calls `generate_resume`.
3. The PDF is saved automatically to `~/Documents/Job App Resumes` on your machine.
4. Claude reports the filename — open that folder to find it.
5. A time-limited download link (`http://localhost:3000/api/resumes/generated/<id>`) is also returned for browser download, valid for 24 hours.

To use a named master resume (e.g. for another person), upload it via `POST /api/master-resumes` and call `get_master_resume` with the `owner` parameter.

## MCP Server

The MCP server provides Claude with read-only access to all job tracking data plus PDF resume generation. It uses OAuth for security and supports both SSE streaming and HTTP request/response.

### Connecting Claude

In Claude's MCP settings, add a remote server pointing at `http://localhost:7331`. Use the same `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` from your `.env` when prompted.

### Available Tools

| Tool | Description |
|------|-------------|
| `search_applications` | Search by text query and/or status with a result limit |
| `get_application` | Full application with interviews, emails, follow-ups, and events |
| `list_interviews` | All interviews, optionally filtered by application |
| `get_reflection` | Interview reflection (pending/advanced/rejected) for a specific interview |
| `list_email_logs` | Communication logs filtered by application, company, or global |
| `list_followup_attempts` | Follow-up attempts and their results for an application |
| `list_engagement_events` | Engagement events for an application |
| `get_resume` | Single resume with linked applications |
| `get_master_resume` | Master resume JSON for AI-tailored resume generation |
| `generate_resume` | Generate a PDF from a tailored resume JSON (saves to your machine) |
| `get_control_file` | Current goals/strategy control file text |
| `get_full_context_dump` | Full system-wide data snapshot — use only when explicitly requested |

All tools are read-only except `generate_resume`, which writes a PDF to disk only.

## Web API Surface

### Applications

- `GET /api/applications` — List with optional query, genericStatus, limit filters.
- `POST /api/applications` — Create with linked resumes.
- `GET /api/applications/[id]` — Full application with all relations.
- `PATCH /api/applications/[id]` — Update application.
- `DELETE /api/applications/[id]` — Delete application.
- `PATCH /api/applications/[id]/resumes` — Update resume links.

### Interviews & Reflections

- `GET /api/interviews` — List all interviews (optional application filter).
- `POST /api/interviews` — Create interview; auto-sets application to "interviewing".
- `GET /api/interviews/[id]` — Get interview with reflection.
- `PATCH /api/interviews/[id]` — Update interview.
- `DELETE /api/interviews/[id]` — Delete interview.
- `GET /api/reflections` — List reflections.
- `POST /api/reflections` — Create or upsert reflection.

### Communication Logs

- `GET /api/emails` — List logs (optional application filter, limit).
- `POST /api/emails` — Create log(s): single application, multiple applications, or company-level.
- `GET /api/emails/[id]` — Get log with application info.
- `PATCH /api/emails/[id]` — Update log.

### Follow-ups & Engagement

- `GET /api/followups` — List follow-up attempts.
- `POST /api/followups` — Create follow-up attempt.
- `GET /api/followups/[id]` — Get follow-up with result.
- `PATCH /api/followups/[id]` — Update follow-up.
- `DELETE /api/followups/[id]` — Delete follow-up.
- `GET /api/followup-results` — List results.
- `POST /api/followup-results` — Create/upsert result; auto-rejects application on rejection_reply.
- `GET /api/engagement-events` — List events.
- `POST /api/engagement-events` — Create event; auto-rejects application on rejection event types.
- `GET /api/engagement-events/[id]` — Get event.
- `PATCH /api/engagement-events/[id]` — Update event.
- `DELETE /api/engagement-events/[id]` — Delete event.

### Resumes & Skills

- `GET /api/resumes` — List with applications and skills.
- `POST /api/resumes` — Upload resume file or register existing path.
- `GET /api/resumes/[id]` — Get resume with links.
- `PATCH /api/resumes/[id]` — Update resume.
- `DELETE /api/resumes/[id]` — Delete resume.
- `GET /api/resumes/[id]/download` — Download file.
- `GET /api/resumes/generated/[id]` — Download a generated PDF by token (24h TTL).
- `GET /api/master-resumes` — List managed master resume JSON files.
- `POST /api/master-resumes` — Store a master resume JSON by owner name.
- `GET /api/master-skills` — List skills (optional query/category filter).
- `POST /api/master-skills` — Create skill with resume links.
- `GET /api/master-skills/[id]` — Get skill.
- `PATCH /api/master-skills/[id]` — Update skill and links.
- `DELETE /api/master-skills` — Bulk delete all skills.
- `DELETE /api/master-skills/[id]` — Delete single skill.
- `POST /api/master-skills/generate-from-resume` — Extract and import skills from a resume.

### Configuration & Utilities

- `GET /api/goals-profile` — Get goals profile and control file path.
- `PUT /api/goals-profile` — Update goals profile.
- `GET /api/control-file` — Get control file text.
- `GET /api/health` — Health check.

## Core Data Model

**Application** — companyName, roleTitle, genericStatus, preciseStatus, roleFamily, roleLevel, appliedAt, careersPageUrl, postingDetails, compensation, notes. Relations: interviews, emailLogs, followups, events, resumes.

**Interview** — roundIndex, roundLabel, scheduledAt, status, notes. Relations: application, reflection.

**InterviewReflection** — summary, outcome (pending/advanced/rejected). 1:1 with Interview.

**EmailLog** — direction, isHuman, subject, body, channel (email/linkedin), notes. Optional application or company-level.

**FollowupAttempt** — attemptIndex, channel (email/linkedin/portal/other), sentAt. Relations: application, result.

**FollowupResult** — resultStatus, responseType, resolvedAt. 1:1 with FollowupAttempt.

**EngagementEvent** — eventType, occurredAt. Relation: application.

**Resume** — name, filePath, extractedText. Relations: applications, masterSkills.

**MasterSkill** — name, category, experienceYears, notes. Relations: resumes.

**GeneratedResumeDownload** — fileName, filePath, expiresAt. Tracks generated PDF tokens for download endpoint.

### Automatic Behaviors

- Creating an interview sets the application to `interviewing`.
- Creating a rejection event or rejection follow-up result sets the application to `rejected`.
- Job posting text is auto-cleaned on save (markdown stripped, whitespace normalized).
- Archived applications are hidden from the table by default.

## File Storage

| What | Where |
|------|-------|
| SQLite database | `/data/job-tracker.sqlite` (Docker volume) |
| Resume files | `/data/resumes/` |
| Database backups | `/data/backups/` |
| Control file | `/data/control.txt` |
| Generated PDF resumes | `~/Documents/Job App Resumes` (host machine) |

Docker volume `job-tracker-data` is shared between both containers for database and resume file access. Generated PDF resumes are bind-mounted directly to your home directory so they're immediately accessible without digging into Docker internals.

## Useful Commands

```bash
pnpm dev:web          # Run web service only
pnpm dev:mcp          # Run MCP service only
pnpm backup:run       # Create SQLite backup and prune old ones
pnpm db:studio        # Prisma Studio
pnpm test             # Run all tests
```

## Project Philosophy

From the **Job Tracker Manifesto** (`AGENTS.md`):

1. The app stores truth. AI provides insight. The user makes decisions.
2. The application is a passive data system — it never ranks applications or determines best actions.
3. All reasoning belongs to LLMs, not application logic.
4. The database records facts only — no computed analytics.
5. MCP server is read-only for safety and consistency with the passive data philosophy.
6. Strategy and decision-making happen outside the app via human reasoning and AI analysis.
