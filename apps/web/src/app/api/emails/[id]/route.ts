import { NextResponse } from "next/server";
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
  const payload = await request.json();
  const parsed = updateEmailLogSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.emailLog.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const emailLog = await prisma.emailLog.update({
    where: { id },
    data: parsed.data,
    include: { application: true },
  });

  await triggerWorkerFromWrite();
  return NextResponse.json({ emailLog });
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
