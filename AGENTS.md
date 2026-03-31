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

End of AGENTS.md
