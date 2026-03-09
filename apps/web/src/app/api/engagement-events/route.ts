import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createEngagementEventSchema } from "@/lib/validation";
import { triggerWorkerFromWrite } from "@/server/hooks/onWriteTriggers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId")?.trim();

  const events = await prisma.engagementEvent.findMany({
    where: applicationId ? { applicationId } : undefined,
    orderBy: { occurredAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ events });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = createEngagementEventSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.engagementEvent.create({
      data: parsed.data,
    });

    if (created.eventType === "rejection") {
      await tx.application.update({
        where: { id: created.applicationId },
        data: { genericStatus: "rejected" },
      });
    }

    return created;
  });

  await triggerWorkerFromWrite();
  return NextResponse.json({ event }, { status: 201 });
}
