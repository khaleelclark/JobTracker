import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateMasterSkillSchema } from "@/lib/validation";
import { triggerWorkerFromWrite } from "@/server/hooks/onWriteTriggers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  const skill = await prisma.masterSkill.findUnique({
    where: { id },
    include: {
      resumeLinks: {
        include: {
          resume: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  if (!skill) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ skill });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = await request.json();
  const parsed = updateMasterSkillSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.masterSkill.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const skill = await prisma.masterSkill.update({
      where: { id },
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        notes: parsed.data.notes,
        resumeLinks: {
          deleteMany: {},
          create: parsed.data.linkedResumeIds.map((resumeId) => ({
            resume: { connect: { id: resumeId } },
          })),
        },
      },
      include: {
        resumeLinks: true,
      },
    });

    await triggerWorkerFromWrite();
    return NextResponse.json({ skill });
  } catch {
    return NextResponse.json({ error: "skill_name_must_be_unique" }, { status: 409 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const existing = await prisma.masterSkill.findUnique({ where: { id }, select: { id: true } });

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.masterSkill.delete({ where: { id } });
  await triggerWorkerFromWrite();
  return NextResponse.json({ ok: true });
}
