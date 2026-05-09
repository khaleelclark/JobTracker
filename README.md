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

## Web UI Pages

- **Today**: Dashboard/overview of recent activity and status.
- **Applications**: List and search all job applications with filtering by status and query.
- **Emails**: Communication logs page with full CRUD for email/LinkedIn messages.
- **Interviews**: Interview tracking with multi-round support.
- **Reflections**: Interview outcome reflections (advanced/rejected/pending).
- **Follow-ups**: Track follow-up attempts and their results.
- **Engagement Events**: Record job-related events (recruiter reply, phone screen, offer, rejection, etc.).
- **Resumes**: Manage resumes, extract text, and link to applications and skills.
- **Skills**: Master skill inventory with categories and experience years.
- **Goals**: Job search goals and profile configuration.
- **Settings**: Application and system configuration.

## Web UI Capabilities

### Application Detail Page

- Direct section actions for:
  - Communication logs: view/edit/delete with multi-channel support (email, LinkedIn).
  - Follow-ups: view/edit/delete with multiple channel types (email, LinkedIn, portal, other).
  - Engagement events: view/edit/delete with automatic status updates on rejection events.
  - Interviews: view/edit/delete with multi-round interview tracking.
  - Resume links: add/remove links and download linked resume files.
- Quick Log forms auto-dismiss success/error messages after 3 seconds.
- Bulk email creation: create emails across multiple applications in one action.

### Global Features

- Search/filter applications by company name, role title, and generic status.
- Communication Logs page: full CRUD for all email/LinkedIn messages (application-level and company-level).
- Master Skills management: create, update, delete skills with categories and experience tracking.
- Resume management: upload/link resumes, extract text from PDF/DOC/DOCX/TXT files.
- Skill extraction from resumes: auto-import candidate skills from resume text.
- Goals profile configuration: store job search strategy and objectives in control file.
- Health check endpoint for service monitoring.

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

## Web API Surface

### Applications

- `GET /api/applications` - List applications with optional filtering (query, genericStatus, limit).
- `POST /api/applications` - Create new application with linked resumes.
- `GET /api/applications/[id]` - Get application with all related data (interviews, emails, followups, events, resumes).
- `PATCH /api/applications/[id]` - Update application details.
- `DELETE /api/applications/[id]` - Delete application.
- `PATCH /api/applications/[id]/resumes` - Update resume links for an application.

### Interviews & Reflections

- `GET /api/interviews` - List all interviews with optional application filter.
- `POST /api/interviews` - Create interview and update application to "interviewing" status.
- `GET /api/interviews/[id]` - Get interview with reflection data.
- `PATCH /api/interviews/[id]` - Update interview.
- `DELETE /api/interviews/[id]` - Delete interview.
- `GET /api/reflections` - List interview reflections with optional filter.
- `POST /api/reflections` - Create or upsert interview reflection.

### Communication Logs & Email

- `GET /api/emails` - List email logs with optional application filter and limit control.
- `POST /api/emails` - Create email log(s) (supports single application, multiple applications, or company-level).
- `GET /api/emails/[id]` - Get specific email log with application info.
- `PATCH /api/emails/[id]` - Update email log (supports moving between applications).

### Follow-ups & Engagement

- `GET /api/followups` - List follow-up attempts with optional application filter.
- `POST /api/followups` - Create follow-up attempt.
- `GET /api/followups/[id]` - Get follow-up with application and result data.
- `PATCH /api/followups/[id]` - Update follow-up attempt.
- `DELETE /api/followups/[id]` - Delete follow-up attempt.
- `GET /api/followup-results` - List follow-up results with optional filter.
- `POST /api/followup-results` - Create/upsert follow-up result (auto-rejects on rejection_reply).
- `GET /api/engagement-events` - List engagement events with optional application filter.
- `POST /api/engagement-events` - Create engagement event (auto-rejects on rejection event types).
- `GET /api/engagement-events/[id]` - Get engagement event with application info.
- `PATCH /api/engagement-events/[id]` - Update engagement event (auto-rejects on rejection).
- `DELETE /api/engagement-events/[id]` - Delete engagement event.

### Resumes & Skills

- `GET /api/resumes` - List all resumes with applications and master skills.
- `POST /api/resumes` - Create resume (supports file upload or existing file path).
- `GET /api/resumes/[id]` - Get resume with application and skill links.
- `PATCH /api/resumes/[id]` - Update resume details and links.
- `DELETE /api/resumes/[id]` - Delete resume.
- `GET /api/resumes/[id]/download` - Download resume file with correct content-type.
- `GET /api/master-skills` - List master skills with optional query/category filtering.
- `POST /api/master-skills` - Create master skill with resume links.
- `GET /api/master-skills/[id]` - Get master skill with resume links.
- `PATCH /api/master-skills/[id]` - Update master skill and resume links.
- `DELETE /api/master-skills` - Bulk delete all master skills.
- `DELETE /api/master-skills/[id]` - Delete single master skill.
- `POST /api/master-skills/generate-from-resume` - Extract and import skills from resume (supports file upload, text paste, or existing resume).

### Configuration

- `GET /api/goals-profile` - Get goals profile and control file path.
- `PUT /api/goals-profile` - Update goals profile in control file.
- `GET /api/control-file` - Get current control file text.
- `GET /api/health` - Health check endpoint.

### Data Extraction & Utilities

- Resume text extraction: Supports PDF (via pdftotext), DOCX (XML parsing), DOC (strings), and plain text formats.
- Skill extraction: Rule-based and candidate parsing from resume text with automatic experience year inference.
- Auto-status updates: Application status automatically updates to "interviewing", "rejected", etc. based on events.
- Bulk operations: Email logs and skill operations support creating/updating multiple records in transactions.

### Write Triggers

- All write operations trigger a worker signal for LLM-based UI card generation.
- Worker reads structured data snapshots and produces suggestion cards without modifying truth data.

## MCP Server

The MCP server provides read-only access to job tracking data via OAuth-protected endpoints. It supports both SSE streaming and traditional HTTP request/response patterns.

### OAuth & Security

- `GET /.well-known/oauth-protected-resource` - OAuth resource metadata.
- `GET /.well-known/oauth-authorization-server` - OAuth authorization server metadata.
- `GET /oauth/authorize` - OAuth authorization endpoint.
- `POST /oauth/token` - OAuth token endpoint.

### Streaming & Messages

- `GET /sse` - Server-Sent Events stream for real-time updates.
- `POST /messages` - Send messages to streaming connection.

### Tools & Data Access

- `GET /mcp/tools` - List available MCP tools with descriptions and schemas.
- `POST /mcp/tools/:toolName` - Execute MCP tool with JSON input.

### Available MCP Tools (Read-Only)

#### Application & Search Tools

- `search_applications` - Search by query/status with limit (enum: applied, under_review, interviewing, offered, rejected, withdrawn, archived).
- `get_application` - Fetch full application with interviews, emails, followups, and events.

#### Interview & Reflection Tools

- `list_interviews` - List interviews optionally filtered by application.
- `get_reflection` - Get interview reflection (pending/advanced/rejected outcome).

#### Communication & Follow-up Tools

- `list_email_logs` - List emails optionally filtered by application or company.
- `list_followup_attempts` - List follow-up attempts with results for an application.
- `list_engagement_events` - List engagement events (recruiter_reply, phone_screen, interview_round, offer, rejection).

#### Resume & Skill Tools

- `get_resume` - Get resume with linked applications and master skills.
- `get_master_resume` - Get master resume JSON from master-resume.json (use as source for AI-tailored resumes).
- `generate_resume` - Generate PDF resume from AI-tailored resume JSON.
- `list_master_skills` - List master skills with optional query/category filter.

#### System Tools

- `get_control_file` - Get current control file text.
- `get_full_context_dump` - Full system-wide data context (use only when explicitly requested).

### MCP Tool Characteristics

- All outputs are **read-only** (no mutations).
- All outputs are **truncated for safety** (bounded result sizes).
- Tools return structured data for AI analysis and decision support.
- No strategic decision-making in tools; AI provides insights, user decides actions.

## Database Schema & Data Model

### Core Entities

**Application**

- Fields: companyName, roleTitle, genericStatus (applied/under_review/interviewing/offered/rejected/withdrawn/archived), preciseStatus, roleFamily, roleLevel, appliedAt, careersPageUrl, postingDetails, compensation, notes.
- Relations: interviews, emailLogs, followups, events, resumes.

**Interview**

- Fields: roundIndex, roundLabel, scheduledAt, status (scheduled/completed/cancelled).
- Relations: application, reflection.

**InterviewReflection**

- Fields: summary, outcome (pending/advanced/rejected).
- Relations: interview (1:1).

**EmailLog**

- Fields: direction (inbound/outbound), isHuman, subject, body, channel (email/linkedin), notes.
- Relations: application (optional), companyName (optional - for non-application emails).

**FollowupAttempt**

- Fields: attemptIndex, channel (email/linkedin/portal/other), sentAt.
- Relations: application, result (optional).

**FollowupResult**

- Fields: resultStatus (pending/resolved/expired_no_response), responseType (human_reply/rejection_reply/screen_scheduled/interview_scheduled), resolvedAt.
- Relations: followupAttempt (1:1).

**EngagementEvent**

- Fields: eventType (recruiter_reply/phone_screen/interview_round/offer/rejection_automated/rejection_human/rejection), occurredAt.
- Relations: application.

**Resume**

- Fields: name, filePath, extractedText (from PDF/DOC/DOCX parsing).
- Relations: applications, masterSkills.

**MasterSkill**

- Fields: name (unique), category, experienceYears, notes, createdAt.
- Relations: resumeLinks.

**ApplicationResume** (Junction)

- Relation: links Application ↔ Resume.

**ResumeMasterSkill** (Junction)

- Relation: links Resume ↔ MasterSkill.

### Automatic Features

- **Auto Status Updates**: Application status automatically updates to "interviewing" (on interview creation) and "rejected" (on rejection event/followup).
- **Multi-Round Interviews**: Support tracking multiple interview rounds per application.
- **Company-Level Communication**: Email logs can be recorded at company level for general recruiter interactions.
- **Bulk Transactions**: Email and skill operations use database transactions for consistency.
- **Resume Text Extraction**: Automatic parsing of PDF (pdftotext), DOCX (XML), DOC (strings), and plain text files.
- **Skill Auto-Import**: Rule-based skill extraction from resume text with automatic experience year inference.

## LLM Worker System

The application includes a local LLM worker that:

- Runs periodically (triggered by data write events).
- Reads structured data snapshots without modifying truth data.
- Generates suggestion cards for user review.
- Acts as a triage assistant, not a decision maker.
- Enables external AI (GPT) analysis via MCP endpoints.

## Testing

Run automated tests to validate data integrity and API functionality:

```bash
pnpm test                # Run all tests
pnpm test:invariants     # Data invariant checks
pnpm test:crud          # Create/read/update/delete operations
pnpm test:api           # Web API route tests
pnpm test:mcp           # MCP server integration tests
```

## File Management

### Resume Storage

- Resumes are stored in `$JOBTRACKER_DATA_DIR/resumes/` (default: `./data/resumes`).
- Supported formats: PDF, DOCX, DOC, TXT, and other text formats.
- Text extraction is automatic on import; original files are preserved.

### Control File

- Stores goals profile and job search strategy.
- Located at `$JOBTRACKER_DATA_DIR/control.txt` (default: `./config/control.txt`).
- Managed via `/api/goals-profile` endpoint.

### Backups

- SQLite database backups are created in `$JOBTRACKER_DATA_DIR/backups/`.
- Run `pnpm backup:run` to manually create and prune old backups.

## Project Philosophy

This project follows the **Job Tracker Manifesto** (see AGENTS.md):

1. **The app stores truth**; AI provides insight; the user makes decisions.
2. The application is a **passive data system** — never ranks applications or determines best actions.
3. All reasoning belongs to **LLMs**, not the application logic.
4. The database records **facts only** (applications, interviews, emails, follow-ups), not computed analytics.
5. MCP server is **read-only** for safety and consistent with passive data philosophy.
6. Strategy and decision-making happen **outside the app** via human reasoning and AI analysis.
