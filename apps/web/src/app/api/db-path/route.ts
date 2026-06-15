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

export async function GET() {
  return NextResponse.json({ url: process.env.DATABASE_URL ?? "" });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { path?: string };
  const dbPath = body.path?.trim();

  if (!dbPath) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }

  const newUrl = `file:${dbPath}`;

  // Only push schema if this is a new (non-existent) database file
  if (!fs.existsSync(dbPath)) {
    const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
    const cmd = `npx prisma db push --skip-generate --accept-data-loss --schema "${schemaPath}"`;
    const result = spawnSync(cmd, { env: { ...process.env, DATABASE_URL: newUrl }, stdio: "pipe", cwd: process.cwd(), shell: true });
    if (result.status !== 0) {
      const msg = result.stderr?.toString() || result.stdout?.toString() || "Unknown error";
      return NextResponse.json({ error: `Schema migration failed: ${msg}` }, { status: 500 });
    }
  }

  const configPath = path.join(DATA_DIR, "active-db.txt");
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(configPath, newUrl, "utf-8");

  process.env.DATABASE_URL = newUrl;
  resetPrismaClient();

  if (process.env.NODE_ENV === "production") {
    setTimeout(() => process.exit(0), 500);
  }

  return NextResponse.json({ url: newUrl, restarting: process.env.NODE_ENV === "production" });
}
