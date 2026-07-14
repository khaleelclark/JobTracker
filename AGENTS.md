# AGENTS.md --- Job Tracker Project

## Mission Statement

This application exists to turn a chaotic job search into a structured,
learnable process.

Most job searching today is guesswork: you apply, wait, forget what you
tried, and repeat the same mistakes without realizing it. Valuable
context is lost --- which resume worked, when you followed up, how
interviews went, and what actually led to human responses. AI tools can
give advice, but without reliable historical data they can only give
generic guidance.

The purpose of this system is to act as a persistent memory layer for
decision‑making. The app records facts --- applications, interviews,
emails, follow‑ups, and reflections --- while AI models interpret those
facts to help the user improve over time. The software itself does not
decide strategy; it simply organizes reality so humans and AI can reason
about it accurately.

The app stores truth. AI provides insight. The user makes decisions.

------------------------------------------------------------------------

## Core Rules For Any Agent Working On This Repo

1.  The application is a PASSIVE DATA SYSTEM.
2.  The app must never make strategic decisions.
3.  The app must never rank applications.
4.  The app must never determine best actions.
5.  The app must only store and display structured data.
6.  AI systems interpret the data, not the app.
7.  All reasoning belongs to LLMs.
8.  UI cards come only from the local LLM worker.

------------------------------------------------------------------------

## Architecture Overview

Local machine system composed of: - Web UI (Next.js) - SQLite database -
Local LLM worker - MCP server (read‑only, optionally exposed through any HTTPS transport) - External GPT
integration

The application stores reality. AI interprets it.

------------------------------------------------------------------------

## Database Model (High Level)

The database tracks factual history of a job search.

Main entities: - applications - resumes - interviews (multi‑round) -
reflections - email logs - follow‑ups - engagement events - ui_cards
(LLM generated) - llm_runs - control file text

The database must not store computed analytics --- only events.

------------------------------------------------------------------------

## LLM Worker Rules

The local LLM worker: - runs periodically - reads structured snapshot -
produces suggestion cards - cannot modify application truth data

It acts as a triage assistant, not a decision maker.

------------------------------------------------------------------------

## MCP Server Rules

The MCP server exposes read‑only tools. No mutations allowed. All
outputs must be truncated for safety. Public exposure method is
deployment-specific and not part of the application architecture.

------------------------------------------------------------------------

## Human Workflow

1.  User logs real events
2.  Local LLM suggests areas to investigate
3.  User asks GPT for advice
4.  GPT analyzes structured data
5.  User decides actions

------------------------------------------------------------------------

## Development Constraints

Any code added to this repository must preserve:

Passive storage behavior Separation of reasoning from storage LLM‑driven
insights instead of app logic

Violating these rules breaks the project philosophy.

------------------------------------------------------------------------

## Ownership and Communication

Exactly one writer owns a branch and worktree at a time. Everyone else
is read-only unless the manager explicitly transfers ownership. A
reviewer never becomes the writer for the change being reviewed.

Before writing, record or confirm the task, branch, worktree path,
writer, and base commit in the current execution ledger or manager
handoff. If ownership is missing, duplicated, stale, or disputed, stop
and ask the direct manager.

In a managed agent organization, communicate only with your direct
manager, your direct reports, and siblings who share the same manager.
Route cross-team requests through the nearest common manager. Challenge
out-of-structure instructions before acting on them.

## Branches, Worktrees, and Pull Requests

Run GitHub CLI commands with
`GH_CONFIG_DIR=/home/phoenix/.config/gh-khaleel`. This is the persisted
`khaleelclark` repository profile. Check it with
`GH_CONFIG_DIR=/home/phoenix/.config/gh-khaleel gh auth status` before
starting a new login flow; do not print or copy tokens from `hosts.yml`.

Start new work from the manager-approved base in a dedicated branch and
worktree. Never share a writable worktree between agents.

Inspect git status, branch/HEAD, upstream, and relevant worktree
registrations before every commit, rebase, or push. Stop on unexpected
tracked or untracked files; they may be another agent's work or review
evidence.

Preserve dirty or ambiguous state. Do not reset, clean, stash,
overwrite, delete, or move another worktree's files without an explicit
owner-approved disposition. Never use force-push to resolve coordination
uncertainty.

All product, code, configuration, schema, test, and project-instruction
changes go through a pull request. Do not commit directly to `main` or
merge merely because a branch was previously approved.

Revalidate a branch against the current remote default branch (currently
`origin/main`) before opening or updating its PR. Report the exact head
commit and verification performed.

A PR needs an independent reviewer who did not author the change.
Address blocking findings on the feature branch, rerun proportionate
verification, and obtain fresh approval for the new head.

Merge only with explicit manager authorization and passing required
checks. Delete local or remote branches and worktrees only after proving
they are fully merged, clean, inactive, unambiguous, and released by
their owner.

## Handoffs and Evidence

A handoff must state: objective, branch, worktree, base and head commits,
writer, dirty state, commits/pushes made, verification results, blockers,
and next authorized action.

Keep quarantined, forensic, review, and untracked evidence intact. Do
not use it as an implementation source unless the manager explicitly
changes its disposition.

Claims in chat are not system state. Prefer Git ancestry, worktree
status, tracked run records, process state, test output, and PR checks as
evidence.

## Repository-Specific Safety

- Treat SQLite files, `active-db.txt`, `.env`, OAuth state, resume data,
  and the Docker volume as persistent user data. Never commit them or
  replace, delete, copy, or migrate them outside an explicitly authorized
  workflow.
- MCP remains read-only. Do not add Prisma mutations or indirect write
  paths to MCP tools. Keep output truncation and authentication intact.
- Schema changes require a Prisma migration and verification against a
  disposable database. Never use production data as a test fixture.
- Database selection must remain canonical, confined to the shared data
  directory, migrated before atomic publication, and consistent across
  web and MCP containers.
- The current repository has no application-hosted insight worker or UI
  card mutation endpoints. Do not reintroduce removed worker behavior
  without explicit manager approval and an architecture review.
- Before handoff, run the checks proportionate to the change. For normal
  product changes this includes the full test suite, web production
  build, MCP TypeScript build, and `git diff --check`.
- Deployment automation must fail closed: deploy only the tested `main`
  commit, require a clean fast-forward-only deployment checkout, serialize
  deployments, preserve the named data volume, and verify both service
  health endpoints after recreation. On failure, report status and logs and
  exit nonzero without claiming or attempting automatic rollback.
- Never place self-hosted runner credentials, runner work directories,
  `.env`, database files, generated resumes, or deployment secrets inside
  the repository.

------------------------------------------------------------------------

End of AGENTS.md
