import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { resetPrismaClient } from "@/lib/db";
import { DATA_DIR, migrateDatabase, publishDatabaseSelection, withDatabaseSelectionLock } from "@/lib/databaseSelection";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const originalName = path.basename(file.name).replace(/[^a-zA-Z0-9._-]/g, "_");
  if (!originalName.endsWith(".sqlite") && !originalName.endsWith(".db")) {
    return NextResponse.json({ error: "File must be a .sqlite or .db file" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return withDatabaseSelectionLock(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const ext = path.extname(originalName);
    const base = path.basename(originalName, ext);
    let destPath = path.join(DATA_DIR, originalName);
    if (fs.existsSync(destPath)) {
      const suffix = `${new Date().toISOString().replace(/[:.]/g, "-")}-${crypto.randomUUID()}`;
      destPath = path.join(DATA_DIR, `${base}-${suffix}${ext}`);
    }
    fs.writeFileSync(destPath, buffer, { flag: "wx" });

    const migrationError = migrateDatabase(destPath);
    if (migrationError) {
      fs.unlinkSync(destPath);
      return NextResponse.json({ error: `Schema migration failed: ${migrationError}` }, { status: 500 });
    }

    const newUrl = publishDatabaseSelection(destPath);
    process.env.DATABASE_URL = newUrl;
    resetPrismaClient();

    if (process.env.NODE_ENV === "production") setTimeout(() => process.exit(0), 500);
    return NextResponse.json({ path: destPath, url: newUrl, restarting: process.env.NODE_ENV === "production" });
  });
}
