export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { updateEmailLogSchema } from "@/lib/validation";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  const emailLog = await prisma.emailLog.findUnique({
    where: { id },
    include: { application: true },
  });

  if (!emailLog) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ emailLog });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = updateEmailLogSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.emailLog.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  try {
    const { applicationId, applicationIds, companyName, ...emailData } = parsed.data;
    let emailLog;

    if (applicationIds) {
      const targetApplicationIds = Array.from(new Set(applicationIds));
      const existingApplications = await prisma.application.findMany({
        where: { id: { in: targetApplicationIds } },
        select: { id: true },
      });
      const existingIds = new Set(existingApplications.map((application) => application.id));
      const invalidIds = targetApplicationIds.filter((targetId) => !existingIds.has(targetId));
      if (invalidIds.length > 0) {
        return NextResponse.json(
          {
            error: `Invalid application references: ${invalidIds.join(", ")}`,
          },
          { status: 400 },
        );
      }

      const [primaryApplicationId, ...additionalApplicationIds] = targetApplicationIds;
      if (!primaryApplicationId) {
        return NextResponse.json({ error: "At least one application is required." }, { status: 400 });
      }

      const [updatedPrimary] = await prisma.$transaction([
        prisma.emailLog.update({
          where: { id },
          data: {
            applicationId: primaryApplicationId,
            companyName: null,
            ...emailData,
          },
          include: { application: true },
        }),
        ...additionalApplicationIds.map((extraApplicationId) =>
          prisma.emailLog.create({
            data: {
              applicationId: extraApplicationId,
              companyName: null,
              ...emailData,
            },
          }),
        ),
      ]);
      emailLog = updatedPrimary;
    } else {
      emailLog = await prisma.emailLog.update({
        where: { id },
        data: {
          applicationId: applicationId ?? null,
          companyName: companyName?.trim() || null,
          ...emailData,
        },
        include: { application: true },
      });
    }

    return NextResponse.json({ emailLog });
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

    return NextResponse.json({ error: "Unable to update communication log." }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const existing = await prisma.emailLog.findUnique({ where: { id }, select: { id: true } });

  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.emailLog.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
