import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateEngagementEventSchema } from "@/lib/validation";
import { triggerWorkerFromWrite } from "@/server/hooks/onWriteTriggers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const event = await prisma.engagementEvent.findUnique({
    where: { id },
    include: { application: true },
  });

  if (!event) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ event });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = await request.json();
  const parsed = updateEngagementEventSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.engagementEvent.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const event = await prisma.$transaction(async (tx) => {
    const updated = await tx.engagementEvent.update({
      where: { id },
      data: parsed.data,
      include: { application: true },
    });

    if (updated.eventType === "rejection") {
      await tx.application.update({
        where: { id: updated.applicationId },
        data: { genericStatus: "rejected" },
      });
    }

    return updated;
  });

  await triggerWorkerFromWrite();
  return NextResponse.json({ event });
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const existing = await prisma.engagementEvent.findUnique({ where: { id }, select: { id: true } });

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.engagementEvent.delete({ where: { id } });
  await triggerWorkerFromWrite();
  return NextResponse.json({ ok: true });
}
