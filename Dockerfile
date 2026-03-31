FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/mcp-server/package.json apps/mcp-server/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY . .

RUN pnpm --filter @job-tracker/web prisma generate
RUN pnpm --filter @job-tracker/web build

FROM node:22-bookworm-slim AS runtime-base

ENV NODE_ENV=production
ENV JOBTRACKER_DATA_DIR=/data

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

FROM runtime-base AS web-runtime

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/web/.next/standalone /app
COPY --from=build /app/apps/web/node_modules /app/apps/web/node_modules
COPY --from=build /app/apps/web/.next/static /app/apps/web/.next/static
COPY --from=build /app/apps/web/prisma /app/apps/web/prisma
COPY docker/entrypoint-web.sh /app/docker/entrypoint-web.sh

ENTRYPOINT ["./docker/entrypoint-web.sh"]

FROM runtime-base AS mcp-runtime

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/mcp-server/node_modules /app/apps/mcp-server/node_modules
COPY --from=build /app/apps/mcp-server/src /app/apps/mcp-server/src
COPY --from=build /app/apps/mcp-server/package.json /app/apps/mcp-server/package.json
COPY --from=build /app/docker/entrypoint-mcp.sh /app/docker/entrypoint-mcp.sh

ENTRYPOINT ["./docker/entrypoint-mcp.sh"]
