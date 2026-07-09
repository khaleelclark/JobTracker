import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { resetPrismaClient } from "@/lib/db";

const DATA_DIR = process.env.JOBTRACKER_DATA_DIR
  ? path.resolve(process.env.JOBTRACKER_DATA_DIR)
  : fs.existsSync("/data")
    ? "/data"
    : path.dirname(process.env.DATABASE_URL?.replace(/^file:/, "") ?? process.env.HOME ?? process.cwd());

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

  fs.mkdirSync(DATA_DIR, { recursive: true });

  // If a file with this name already exists, add a timestamp suffix
  const ext = path.extname(originalName);
  const base = path.basename(originalName, ext);
  let destPath = path.join(DATA_DIR, originalName);
  if (fs.existsSync(destPath)) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    destPath = path.join(DATA_DIR, `${base}-${timestamp}${ext}`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(destPath, buffer);

  const newUrl = `file:${destPath}`;

  // Always migrate after import — the uploaded file may be behind on schema versions.
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  const result = spawnSync(
    `npx prisma migrate deploy --schema "${schemaPath}"`,
    { env: { ...process.env, DATABASE_URL: newUrl }, stdio: "pipe", cwd: process.cwd(), shell: true },
  );
  if (result.status !== 0) {
    fs.unlinkSync(destPath);
    const msg = result.stderr?.toString() || result.stdout?.toString() || "Unknown error";
    return NextResponse.json({ error: `Schema migration failed: ${msg}` }, { status: 500 });
  }

  const configPath = path.join(DATA_DIR, "active-db.txt");
  fs.writeFileSync(configPath, newUrl, "utf-8");
  process.env.DATABASE_URL = newUrl;
  resetPrismaClient();

  if (process.env.NODE_ENV === "production") {
    setTimeout(() => process.exit(0), 500);
    return NextResponse.json({ path: destPath, url: newUrl, restarting: true });
  }

  return NextResponse.json({ path: destPath, url: newUrl, restarting: false });
}
