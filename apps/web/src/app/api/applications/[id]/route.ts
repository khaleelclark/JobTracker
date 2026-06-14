export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateApplicationSchema } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      interviews: { include: { reflection: true }, orderBy: { scheduledAt: "asc" } },
      emailLogs: { orderBy: { createdAt: "desc" }, take: 50 },
      followups: { include: { result: true }, orderBy: { sentAt: "desc" }, take: 50 },
      events: { orderBy: { occurredAt: "desc" }, take: 50 },
      resumes: { include: { resume: true } },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ application });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = await request.json();
  const parsed = updateApplicationSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.application.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const application = await prisma.application.update({
      where: { id },
      data: {
        companyName: parsed.data.companyName,
        roleTitle: parsed.data.roleTitle,
        careersPageUrl: parsed.data.careersPageUrl,
        postingDetails: parsed.data.postingDetails,
        compensation: parsed.data.compensation,
        genericStatus: parsed.data.genericStatus,
        preciseStatus: parsed.data.preciseStatus,
        roleFamily: parsed.data.roleFamily,
        roleLevel: parsed.data.roleLevel,
        appliedAt: parsed.data.appliedAt,
        notes: parsed.data.notes,
        resumes: {
          deleteMany: {},
          create: parsed.data.linkedResumeIds.map((resumeId) => ({
            resume: { connect: { id: resumeId } },
          })),
        },
      },
    });

    return NextResponse.json({ application });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ error: "update_failed", detail }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const existing = await prisma.application.findUnique({ where: { id }, select: { id: true } });

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.application.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
