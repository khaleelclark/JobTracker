import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createEmailLogSchema } from "@/lib/validation";
import { triggerWorkerFromWrite } from "@/server/hooks/onWriteTriggers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId")?.trim();
  const limit = Number(searchParams.get("limit") ?? 50);

  const emailLogs = await prisma.emailLog.findMany({
    where: applicationId ? { applicationId } : undefined,
    orderBy: { createdAt: "desc" },
    take: Number.isNaN(limit) ? 50 : Math.min(Math.max(limit, 1), 200),
  });

  return NextResponse.json({ emailLogs });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = createEmailLogSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const emailLog = await prisma.emailLog.create({
    data: parsed.data,
  });

  await triggerWorkerFromWrite();
  return NextResponse.json({ emailLog }, { status: 201 });
}
