export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateInterviewSchema } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const interview = await prisma.interview.findUnique({
    where: { id },
    include: { reflection: true, application: true },
  });

  if (!interview) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ interview });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = await request.json();
  const parsed = updateInterviewSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.interview.findUnique({ where: { id }, select: { id: true, status: true, applicationId: true } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const completingNow = parsed.data.status === "completed" && existing.status !== "completed";

  try {
    const interview = await prisma.$transaction(async (tx) => {
      const updated = await tx.interview.update({
        where: { id },
        data: parsed.data,
        include: { reflection: true, application: true },
      });

      await tx.application.update({
        where: { id: parsed.data.applicationId },
        data: { genericStatus: "interviewing" },
      });

      if (completingNow) {
        await tx.engagementEvent.create({
          data: {
            applicationId: existing.applicationId,
            eventType: "interview_round",
            occurredAt: new Date(),
          },
        });
      }

      return updated;
    });

    return NextResponse.json({ interview });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown_error";
    return NextResponse.json({ error: "update_failed", detail }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const existing = await prisma.interview.findUnique({ where: { id }, select: { id: true } });

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.interview.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
