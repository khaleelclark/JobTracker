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
    const { applicationId, applicationIds, companyName, ...emailData } = parsed.data;
    let targetApplicationIds: string[];

    if (applicationId) {
      targetApplicationIds = [applicationId];
    } else if (applicationIds) {
      targetApplicationIds = Array.from(new Set(applicationIds));
    } else {
      const selectedCompanyName = companyName?.trim() ?? "";
      if (!selectedCompanyName) {
        return NextResponse.json({ error: "Company name is required." }, { status: 400 });
      }

      const emailLog = await prisma.emailLog.create({
        data: {
          applicationId: null,
          companyName: selectedCompanyName,
          ...emailData,
        },
      });

      await triggerWorkerFromWrite();
      return NextResponse.json({ emailLog }, { status: 201 });
    }

    if (targetApplicationIds.length > 1) {
      const existingApplications = await prisma.application.findMany({
        where: { id: { in: targetApplicationIds } },
        select: { id: true },
      });
      const existingIds = new Set(existingApplications.map((application) => application.id));
      const invalidIds = targetApplicationIds.filter((id) => !existingIds.has(id));
      if (invalidIds.length > 0) {
        return NextResponse.json(
          {
            error: `Invalid application references: ${invalidIds.join(", ")}`,
          },
          { status: 400 },
        );
      }
    }

    const emailLogs = await prisma.$transaction(
      targetApplicationIds.map((targetApplicationId) =>
        prisma.emailLog.create({
          data: {
            applicationId: targetApplicationId,
            ...emailData,
          },
        }),
      ),
    );

    await triggerWorkerFromWrite();
    if (emailLogs.length === 1) {
      return NextResponse.json({ emailLog: emailLogs[0] }, { status: 201 });
    }

    return NextResponse.json({ emailLogs, createdCount: emailLogs.length }, { status: 201 });
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
