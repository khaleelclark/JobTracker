export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createReflectionSchema } from "@/lib/validation";
import { triggerWorkerFromWrite } from "@/server/hooks/onWriteTriggers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const interviewId = searchParams.get("interviewId")?.trim();

  const reflections = await prisma.interviewReflection.findMany({
    where: interviewId ? { interviewId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ reflections });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = createReflectionSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const reflection = await prisma.interviewReflection.upsert({
    where: { interviewId: parsed.data.interviewId },
    create: parsed.data,
    update: {
      summary: parsed.data.summary,
      outcome: parsed.data.outcome,
    },
  });

  await triggerWorkerFromWrite();
  return NextResponse.json({ reflection }, { status: 201 });
}
