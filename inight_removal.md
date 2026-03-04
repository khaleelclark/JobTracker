# Insight Removal + MCP Full Dump Plan

## Scope
This plan covers:
1. Complete removal of insight cards from code + database artifacts.
2. Complete removal of OpenAI API key / Ollama connectivity references.
3. New MCP tool for full database context dump, with strict warning guidance for when to use it.

The goal is zero residual insight-card behavior while preserving all other product functionality.

---

## Step 1: Remove Insight Cards Completely

### 1.1 Codebase Inventory
- Find all references to `uiCard`, `ui_cards`, `CardState`, worker card generation, `/today` insight actions, and `llm_runs`/`llm_run_queue` usage.
- Identify direct dependencies in:
  - Prisma schema + migrations
  - Web routes/components/pages
  - Worker snapshot/output validation/queue
  - Shared types/validation
  - Tests
  - MCP tools (if any surface insight-card data)

### 1.2 Database Changes
- Create Prisma migration(s) to remove insight-related tables and constraints:
  - `ui_cards`
  - `llm_runs`
  - `llm_run_queue`
- Remove app-level model definitions/enums only used by insight cards.
- Ensure foreign-key cleanup for any relations from `applications`/`interviews` to `ui_cards`.

### 1.3 API + UI Removal
- Delete insight-card APIs:
  - `/api/ui-cards`
  - `/api/ui-cards/[id]`
  - `/api/worker/refresh` (if only for card generation)
- Remove Today-page card rendering and actions tied to insights.
- Remove components that exist only for insight-card display/interactions.

### 1.4 Worker Pipeline Removal
- Remove card-generation worker paths:
  - adapter selection/generation calls for insights
  - queue/run lifecycle for insight generation
  - output validation tied to card schema
- Keep any unrelated non-insight behavior intact.

### 1.5 Snapshot Cleanup
- Remove `existing_cards` and any insight-only fields from worker snapshot.
- Keep factual database snapshot capability only if needed by other active features.

### 1.6 Tests + Verification
- Update/remove tests asserting insight-card behavior.
- Verify no build/runtime references remain to deleted models/routes/components.

### 1.7 Acceptance Criteria
- No `ui_cards`-related code, schema, routes, components, or tests remain.
- No card generation jobs/runs execute.
- App boots and core CRUD features still work.

---

## Step 2: Remove OpenAI Key + Ollama References Completely

### 2.1 Runtime and Env Cleanup
- Remove all codepaths that read:
  - `OPENAI_API_KEY`
  - `OPENAI_BASE_URL`
  - `OPENAI_MODEL`
  - `OLLAMA_BASE_URL`
  - related runtime toggles for LLM execution
- Remove script commands/files for starting Ollama.

### 2.2 Adapter + Connector Cleanup
- Delete adapter/connectivity files that invoke OpenAI/Ollama endpoints.
- Remove imports and dead abstractions left by adapter deletion.

### 2.3 Docs + Config + Tests
- Remove OpenAI/Ollama env docs in README and `.env` templates.
- Remove test setup using OpenAI/Ollama env vars.

### 2.4 Acceptance Criteria
- Repo search returns no references to OpenAI API key usage or Ollama connectivity.
- No network calls to LLM providers occur anywhere in active app flow.

---

## Step 3: New MCP Tool for Full DB Dump (System-Wide Context)

### 3.1 Tool Contract
- Add new MCP tool (read-only) to return full relevant DB context in one payload.
- Include pagination/chunking safeguards and output truncation policy to avoid oversized responses.

### 3.2 Warning + Usage Guardrails
- Tool description must explicitly warn:
  - Use only when user requests full/system-wide context.
  - Prefer narrower tools for normal questions.
- Include structured warning text in tool metadata and response envelope.

### 3.3 Data Scope Definition
- Include all relevant factual entities (applications, interviews, reflections, emails, followups, events, resumes, skills, links, etc.).
- Exclude removed insight-card tables.
- Add optional filters (`since`, `limit per table`) to keep responses manageable.

### 3.4 MCP Integration
- Register tool in MCP index/router.
- Implement handler with strict read-only queries.
- Ensure consistent truncation and deterministic ordering.

### 3.5 Tests + Validation
- Add MCP tool tests verifying:
  - schema/shape
  - warning presence
  - truncation behavior
  - read-only behavior

### 3.6 Acceptance Criteria
- Tool is available and documented in MCP tool list.
- Returns full factual context when explicitly requested.
- Warns against routine overuse.

---

## Execution Order
1. Step 1 (insight-card removal) first, including DB migration.
2. Step 2 (OpenAI/Ollama purge) immediately after Step 1 to avoid dead connectors.
3. Step 3 (new MCP full-dump tool) after cleanup baseline is stable.
4. Final full test/build pass and targeted smoke checks.

---

## Validation Checklist
- `pnpm --filter @job-tracker/web exec tsc --noEmit`
- Run API CRUD tests and MCP tool tests.
- Confirm migrations apply cleanly on fresh DB.
- Repo-wide grep checks for banned references:
  - `uiCard|ui_cards|llm_runs|llm_run_queue`
  - `OPENAI_API_KEY|OPENAI_BASE_URL|OPENAI_MODEL`
  - `ollama|OLLAMA_BASE_URL`

---

## Risk Notes
- Removing DB models requires coordinated migration + code updates in same change set.
- Existing seeded/local DBs need migration path to avoid startup failure.
- MCP full-dump payload size must be bounded to protect stability.
