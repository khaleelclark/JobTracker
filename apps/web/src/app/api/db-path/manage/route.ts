import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { resetPrismaClient } from "@/lib/db";

const DATA_DIR = process.env.JOBTRACKER_DATA_DIR
  ? path.resolve(process.env.JOBTRACKER_DATA_DIR)
  : fs.existsSync("/data")
    ? "/data"
    : path.dirname(process.env.DATABASE_URL?.replace(/^file:/, "") ?? process.env.HOME ?? process.cwd());

function inDataDir(p: string): boolean {
  return path.resolve(p).startsWith(DATA_DIR);
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

    if (isActive) {
      const prodUrl = `file:${path.join(DATA_DIR, "job-tracker.sqlite")}`;
      const configPath = path.join(DATA_DIR, "active-db.txt");
      fs.writeFileSync(configPath, prodUrl, "utf-8");
      process.env.DATABASE_URL = prodUrl;
      resetPrismaClient();
    }

    fs.unlinkSync(targetPath);

    if (isActive && process.env.NODE_ENV === "production") {
      setTimeout(() => process.exit(0), 500);
      return NextResponse.json({ deleted: true, restarting: true });
    }

    return NextResponse.json({ deleted: true, restarting: false });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
