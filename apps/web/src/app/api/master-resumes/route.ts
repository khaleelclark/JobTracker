export const dynamic = "force-dynamic";

import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { resolveMasterResumeDir } from "@/lib/paths";
import { createMasterResumeSchema } from "@/lib/validation";

function masterResumePath(owner: string): string {
  return path.join(resolveMasterResumeDir(), `${owner}.json`);
}

export async function GET() {
  const dir = resolveMasterResumeDir();
  await fs.mkdir(dir, { recursive: true });

  const entries = await fs.readdir(dir, { withFileTypes: true });
  const masterResumes = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry) => {
        const filePath = path.join(dir, entry.name);
        const stat = await fs.stat(filePath);
        return {
          owner: entry.name.replace(/\.json$/i, ""),
          path: filePath,
          updatedAt: stat.mtime.toISOString(),
        };
      }),
  );

  masterResumes.sort((a, b) => a.owner.localeCompare(b.owner));
  return NextResponse.json({ masterResumes });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = createMasterResumeSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dir = resolveMasterResumeDir();
  await fs.mkdir(dir, { recursive: true });

  const filePath = masterResumePath(parsed.data.owner);
  await fs.writeFile(filePath, `${JSON.stringify(parsed.data.resume, null, 2)}\n`, "utf8");

  return NextResponse.json(
    {
      masterResume: {
        owner: parsed.data.owner,
        path: filePath,
      },
    },
    { status: 201 },
  );
}
