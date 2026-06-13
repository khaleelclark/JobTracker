import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "./paths";
import { loadProjectEnv } from "./loadEnv";

loadProjectEnv();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = resolveDatabaseUrl();
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL ?? resolveDatabaseUrl() } },
    });
  }
  return globalForPrisma.prisma;
}

// Proxy so all importers continue using `prisma.xxx` unchanged, but the
// underlying client can be swapped at runtime when switching databases.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_, prop: string | symbol) {
    const client = getClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});

export function resetPrismaClient(): void {
  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect().catch(() => {});
    globalForPrisma.prisma = undefined;
  }
}
