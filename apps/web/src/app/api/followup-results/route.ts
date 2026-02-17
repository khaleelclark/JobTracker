import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createFollowupResultSchema } from "@/lib/validation";
import { triggerWorkerFromWrite } from "@/server/hooks/onWriteTriggers";

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

  const followupResult = await prisma.followupResult.upsert({
    where: { followupAttemptId: parsed.data.followupAttemptId },
    create: parsed.data,
    update: {
      resultStatus: parsed.data.resultStatus,
      responseType: parsed.data.responseType,
      resolvedAt: parsed.data.resolvedAt,
    },
  });

  await triggerWorkerFromWrite();
  return NextResponse.json({ followupResult }, { status: 201 });
}
