export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createInterviewSchema } from "@/lib/validation";
import { triggerWorkerFromWrite } from "@/server/hooks/onWriteTriggers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId")?.trim();

  const interviews = await prisma.interview.findMany({
    where: applicationId ? { applicationId } : undefined,
    include: { reflection: true, application: true },
    orderBy: { scheduledAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ interviews });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = createInterviewSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const interview = await prisma.$transaction(async (tx) => {
    const createdInterview = await tx.interview.create({
      data: parsed.data,
    });

    await tx.application.update({
      where: { id: parsed.data.applicationId },
      data: { genericStatus: "interviewing" },
    });

    if (parsed.data.status === "completed") {
      await tx.engagementEvent.create({
        data: {
          applicationId: parsed.data.applicationId,
          eventType: "interview_round",
          occurredAt: new Date(),
        },
      });
    }

    return createdInterview;
  });

  await triggerWorkerFromWrite();
  return NextResponse.json({ interview }, { status: 201 });
}
