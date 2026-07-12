import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.JOBTRACKER_DATA_DIR
  ? path.resolve(process.env.JOBTRACKER_DATA_DIR)
  : fs.existsSync("/data")
    ? "/data"
    : path.dirname(process.env.DATABASE_URL?.replace(/^file:/, "") ?? "") || (process.env.HOME ?? process.cwd());

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawDir = searchParams.get("dir") ?? DATA_DIR;

  const resolved = path.resolve(rawDir);
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const canonicalDataDir = fs.realpathSync(DATA_DIR);
  let canonicalResolved: string;
  try {
    canonicalResolved = fs.realpathSync(resolved);
  } catch {
    return NextResponse.json({ error: "Cannot read directory" }, { status: 500 });
  }
  const relative = path.relative(canonicalDataDir, canonicalResolved);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  try {
    const entries = fs.readdirSync(canonicalResolved, { withFileTypes: true });
    const files = entries
      .filter((e) => !e.isSymbolicLink() && (e.isDirectory() || (e.isFile() && (e.name.endsWith(".sqlite") || e.name.endsWith(".db")))))
      .map((e) => {
        const fullPath = path.join(canonicalResolved, e.name);
        return {
          name: e.name,
          path: fullPath,
          isDir: e.isDirectory(),
          size: e.isFile() ? fs.statSync(fullPath).size : null,
        };
      })
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({
      dir: canonicalResolved,
      parent: canonicalResolved !== canonicalDataDir ? path.dirname(canonicalResolved) : null,
      files,
    });
  } catch {
    return NextResponse.json({ error: "Cannot read directory" }, { status: 500 });
  }
}
