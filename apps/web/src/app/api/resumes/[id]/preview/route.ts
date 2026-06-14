export const dynamic = "force-dynamic";

import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isPathWithinResumeDir } from "@/lib/fileStore";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function contentTypeFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") {
    return "application/pdf";
  }
  if (ext === ".txt") {
    return "text/plain; charset=utf-8";
  }
  if (ext === ".doc") {
    return "application/msword";
  }
  if (ext === ".docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return "application/octet-stream";
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const resume = await prisma.resume.findUnique({
    where: { id },
    select: { id: true, name: true, filePath: true },
  });

  if (!resume) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!isPathWithinResumeDir(resume.filePath)) {
    return NextResponse.json({ error: "invalid_resume_path" }, { status: 400 });
  }

  try {
    const fileBuffer = await fs.readFile(resume.filePath);
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentTypeFromPath(resume.filePath),
        "Content-Disposition": "inline",
        "X-Resume-Name": resume.name,
      },
    });
  } catch {
    return NextResponse.json({ error: "file_not_found" }, { status: 404 });
  }
}
