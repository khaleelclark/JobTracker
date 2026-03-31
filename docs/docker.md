## Services

- `web`
  - Next.js app
  - boots from Next standalone output
  - initializes `/data`
  - runs Prisma migrations on startup
  - serves HTTP on `http://localhost:3000`
- `mcp`
  - read-only MCP/SSE service
  - shares the same SQLite database and data directory
  - ships only MCP runtime files instead of the whole monorepo
  - serves HTTP on `http://localhost:7331`

## Public Access

The MCP server does not depend on `ngrok`.

You can expose it with any HTTPS-capable option you want, including:

- a normal reverse proxy and domain
- Cloudflare Tunnel
- Tailscale
- localhost-only usage
- `ngrok`, if you want a quick tunnel

If you need a public connector URL, expose port `7331` and set `MCP_BASE_URL` to that public HTTPS base URL.

## Quickstart

1. Copy env settings if needed:
   - `cp .env.example .env`
2. Review host-bound endpoints in `.env`:
   - if your LLM runtime runs on the host, replace `127.0.0.1` with `host.docker.internal`
3. Start:
   - `docker compose up --build -d`
4. Verify:
   - `curl http://127.0.0.1:3000/api/health`
   - `curl http://127.0.0.1:7331/health`
5. Stop:
   - `docker compose down`

## Persistence

The named volume `job-tracker-data` stores:

- SQLite database
- backups
- uploaded resumes
- OAuth token state
- control file text

## Notes

- Compose forces `DATABASE_URL=file:/data/job-tracker.sqlite` so the containers do not depend on a host-specific path from `.env`.
- The MCP container waits for the web container to become healthy before starting.
- The web container starts from Next standalone output with `node /app/apps/web/server.js`.
- `config/ngrok.yml` is only an optional helper example for users who choose ngrok.
