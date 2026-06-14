export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createFollowupSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId")?.trim();

  const followups = await prisma.followupAttempt.findMany({
    where: applicationId ? { applicationId } : undefined,
    include: { result: true },
    orderBy: { sentAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ followups });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = createFollowupSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const followup = await prisma.followupAttempt.create({
    data: parsed.data,
  });

  return NextResponse.json({ followup }, { status: 201 });
}
