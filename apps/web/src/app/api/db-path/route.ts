import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { resetPrismaClient } from "@/lib/db";

const DATA_DIR = process.env.JOBTRACKER_DATA_DIR
  ? path.resolve(process.env.JOBTRACKER_DATA_DIR)
  : "/data";

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

  const configPath = path.join(DATA_DIR, "active-db.txt");
  fs.writeFileSync(configPath, newUrl, "utf-8");

  process.env.DATABASE_URL = newUrl;
  resetPrismaClient();

  if (process.env.NODE_ENV === "production") {
    setTimeout(() => process.exit(0), 500);
  }

  return NextResponse.json({ url: newUrl, restarting: process.env.NODE_ENV === "production" });
}
