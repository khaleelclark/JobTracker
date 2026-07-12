import { NextResponse } from "next/server";
import { resetPrismaClient } from "@/lib/db";
import { migrateDatabase, publishDatabaseSelection, resolveDatabasePath, withDatabaseSelectionLock } from "@/lib/databaseSelection";

export async function GET() {
  return NextResponse.json({ url: process.env.DATABASE_URL ?? "" });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { path?: string };
  const dbPath = body.path?.trim();

  if (!dbPath) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  let resolvedPath: string;
  try {
    resolvedPath = resolveDatabasePath(dbPath);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid database path" }, { status: 400 });
  }

  return withDatabaseSelectionLock(() => {
    const migrationError = migrateDatabase(resolvedPath);
    if (migrationError) {
      return NextResponse.json({ error: `Schema migration failed: ${migrationError}` }, { status: 500 });
    }

    const newUrl = publishDatabaseSelection(resolvedPath);

    process.env.DATABASE_URL = newUrl;
    resetPrismaClient();

    if (process.env.NODE_ENV === "production") setTimeout(() => process.exit(0), 500);

    return NextResponse.json({ url: newUrl, restarting: process.env.NODE_ENV === "production" });
  });
}
