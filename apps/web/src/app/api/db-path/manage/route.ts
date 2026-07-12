import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { resetPrismaClient } from "@/lib/db";
import { defaultDatabasePath, migrateDatabase, publishDatabaseSelection, resolveDatabasePath, withDatabaseSelectionLock } from "@/lib/databaseSelection";

export async function POST(req: Request) {
  const body = (await req.json()) as { action?: string; path?: string };
  const { action, path: rawTargetPath } = body;

  if (!rawTargetPath) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  let targetPath: string;
  try {
    targetPath = resolveDatabasePath(rawTargetPath);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid path" }, { status: 400 });
  }

  if (action === "copy") {
    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const ext = path.extname(targetPath);
    const base = path.basename(targetPath, ext);
    const dir = path.dirname(targetPath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const copyPath = path.join(dir, `${base}-${timestamp}${ext}`);
    fs.copyFileSync(targetPath, copyPath);
    return NextResponse.json({ copyPath });
  }

  if (action === "delete") {
    return withDatabaseSelectionLock(() => {
      if (!fs.existsSync(targetPath)) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      let activePath: string | null = null;
      try {
        activePath = process.env.DATABASE_URL?.startsWith("file:")
          ? resolveDatabasePath(process.env.DATABASE_URL.slice("file:".length))
          : null;
      } catch {
        activePath = null;
      }
      const isActive = activePath === targetPath;
      const defaultPath = defaultDatabasePath();

      if (isActive) {
        if (targetPath === defaultPath) {
          return NextResponse.json({ error: "The active default database cannot be deleted" }, { status: 400 });
        }
        const migrationError = migrateDatabase(defaultPath);
        if (migrationError) {
          return NextResponse.json({ error: `Schema migration failed: ${migrationError}` }, { status: 500 });
        }
        process.env.DATABASE_URL = publishDatabaseSelection(defaultPath);
        resetPrismaClient();
      }

      fs.unlinkSync(targetPath);

      if (isActive && process.env.NODE_ENV === "production") setTimeout(() => process.exit(0), 500);
      return NextResponse.json({ deleted: true, restarting: isActive && process.env.NODE_ENV === "production" });
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
