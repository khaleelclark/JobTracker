export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isPathWithinResumeDir, saveResumeFile } from "@/lib/fileStore";
import { createResumeSchema } from "@/lib/validation";
import { triggerWorkerFromWrite } from "@/server/hooks/onWriteTriggers";

export async function GET() {
  const resumes = await prisma.resume.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      applications: {
        include: { application: true },
      },
      masterSkills: {
        include: { masterSkill: true },
      },
    },
  });

  return NextResponse.json({ resumes });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = createResumeSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let filePath = parsed.data.filePath;

  if (filePath && !isPathWithinResumeDir(filePath)) {
    return NextResponse.json(
      { error: "filePath must be inside the managed resume directory" },
      { status: 400 },
    );
  }

  if (!filePath && parsed.data.fileBase64 && parsed.data.fileName) {
    const bytes = Buffer.from(parsed.data.fileBase64, "base64");
    filePath = await saveResumeFile(parsed.data.fileName, bytes);
  }

  if (!filePath) {
    return NextResponse.json(
      { error: "either filePath or fileBase64+fileName is required" },
      { status: 400 },
    );
  }

  const resume = await prisma.resume.create({
    data: {
      name: parsed.data.name,
      filePath,
      extractedText: parsed.data.extractedText,
      applications: {
        create: parsed.data.linkedApplicationIds.map((applicationId) => ({
          application: { connect: { id: applicationId } },
        })),
      },
      masterSkills: {
        create: parsed.data.linkedSkillIds.map((skillId) => ({
          masterSkill: { connect: { id: skillId } },
        })),
      },
    },
    include: {
      applications: true,
      masterSkills: true,
    },
  });

  await triggerWorkerFromWrite();
  return NextResponse.json({ resume }, { status: 201 });
}
