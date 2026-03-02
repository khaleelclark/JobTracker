import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = createEmailLogSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const emailLog = await prisma.emailLog.create({
      data: parsed.data,
    });

    await triggerWorkerFromWrite();
    return NextResponse.json({ emailLog }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2022") {
        return NextResponse.json(
          { error: "Database schema is out of date. Run pnpm db:migrate, then restart the web server." },
          { status: 500 },
        );
      }

      if (error.code === "P2003") {
        return NextResponse.json({ error: "Invalid application reference." }, { status: 400 });
      }
    }

    return NextResponse.json({ error: "Unable to save communication log." }, { status: 500 });
  }
}
