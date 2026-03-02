import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { updateEmailLogSchema } from "@/lib/validation";
import { triggerWorkerFromWrite } from "@/server/hooks/onWriteTriggers";

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
    const emailLog = await prisma.emailLog.update({
      where: { id },
      data: parsed.data,
      include: { application: true },
    });

    await triggerWorkerFromWrite();
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
  await triggerWorkerFromWrite();
  return NextResponse.json({ ok: true });
}
