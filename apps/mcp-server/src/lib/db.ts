import { PrismaClient } from "@prisma/client";
import { resolveActiveDatabaseUrl, resolveDatabaseUrl } from "./paths";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaDatabaseUrl?: string;
};

function getClient(): PrismaClient {
  const databaseUrl = resolveActiveDatabaseUrl()
    ?? globalForPrisma.prismaDatabaseUrl
    ?? resolveDatabaseUrl();

  if (!globalForPrisma.prisma || globalForPrisma.prismaDatabaseUrl !== databaseUrl) {
    const previousClient = globalForPrisma.prisma;
    globalForPrisma.prisma = new PrismaClient({
      datasources: { db: { url: databaseUrl } },
    });
    globalForPrisma.prismaDatabaseUrl = databaseUrl;
    if (previousClient) void previousClient.$disconnect().catch(() => {});
  }

  return globalForPrisma.prisma;
}

// Resolve the active database for every tool invocation. The Settings UI writes
// active-db.txt into the shared data volume, allowing MCP to follow database
// switches without mutating application data or restarting the container.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_, prop: string | symbol) {
    const client = getClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});
