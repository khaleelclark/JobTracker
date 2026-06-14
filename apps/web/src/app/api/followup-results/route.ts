export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createFollowupResultSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const followupAttemptId = searchParams.get("followupAttemptId")?.trim();

  const followupResults = await prisma.followupResult.findMany({
    where: followupAttemptId ? { followupAttemptId } : undefined,
    include: {
      followupAttempt: true,
    },
    take: 100,
  });

  return NextResponse.json({ followupResults });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = createFollowupResultSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const followupAttempt = await prisma.followupAttempt.findUnique({
    where: { id: parsed.data.followupAttemptId },
    select: { applicationId: true },
  });

  if (!followupAttempt) {
    return NextResponse.json({ error: "followup_attempt_not_found" }, { status: 404 });
  }

  const followupResult = await prisma.$transaction(async (tx) => {
    const result = await tx.followupResult.upsert({
      where: { followupAttemptId: parsed.data.followupAttemptId },
      create: parsed.data,
      update: {
        resultStatus: parsed.data.resultStatus,
        responseType: parsed.data.responseType,
        resolvedAt: parsed.data.resolvedAt,
      },
    });

    if (parsed.data.responseType === "rejection_reply") {
      await tx.application.update({
        where: { id: followupAttempt.applicationId },
        data: { genericStatus: "rejected" },
      });
    }

    return result;
  });

  return NextResponse.json({ followupResult }, { status: 201 });
}
