import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { resetPrismaClient } from "@/lib/db";
import { DATA_DIR, migrateDatabase, publishDatabaseSelection, withDatabaseSelectionLock } from "@/lib/databaseSelection";

function inDataDir(p: string): boolean {
  const relative = path.relative(DATA_DIR, path.resolve(p));
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export async function POST(req: Request) {
  const body = (await req.json()) as { action?: string; path?: string };
  const { action, path: targetPath } = body;

  if (!targetPath || !inDataDir(targetPath)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
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
    if (!fs.existsSync(targetPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const activeUrl = `file:${targetPath}`;
    const isActive = process.env.DATABASE_URL === activeUrl;

    return withDatabaseSelectionLock(() => {
      if (isActive) {
        const defaultPath = path.join(DATA_DIR, "job-tracker.sqlite");
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
