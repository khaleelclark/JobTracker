export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isPathWithinResumeDir } from "@/lib/fileStore";
import { updateResumeSchema } from "@/lib/validation";
import { triggerWorkerFromWrite } from "@/server/hooks/onWriteTriggers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = await request.json();
  const parsed = updateResumeSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.resume.findUnique({
    where: { id },
    select: { id: true, filePath: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const filePathChanged = parsed.data.filePath !== existing.filePath;
  if (filePathChanged && !isPathWithinResumeDir(parsed.data.filePath)) {
    return NextResponse.json(
      { error: "filePath must be inside the managed resume directory" },
      { status: 400 },
    );
  }

  const resume = await prisma.resume.update({
    where: { id },
    data: {
      name: parsed.data.name,
      filePath: parsed.data.filePath,
      extractedText: parsed.data.extractedText,
      applications: {
        deleteMany: {},
        create: parsed.data.linkedApplicationIds.map((applicationId) => ({
          application: { connect: { id: applicationId } },
        })),
      },
    },
    include: {
      applications: true,
    },
  });

  await triggerWorkerFromWrite();
  return NextResponse.json({ resume });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const existing = await prisma.resume.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.resume.delete({ where: { id } });
  await triggerWorkerFromWrite();
  return NextResponse.json({ ok: true });
}
