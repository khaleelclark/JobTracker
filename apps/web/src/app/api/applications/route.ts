import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createApplicationSchema } from "@/lib/validation";
import { triggerWorkerFromWrite } from "@/server/hooks/onWriteTriggers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();
  const status = searchParams.get("genericStatus")?.trim();
  const limit = Number(searchParams.get("limit") ?? 50);

  const applications = await prisma.application.findMany({
    where: {
      ...(status ? { genericStatus: status as never } : {}),
      ...(query
        ? {
            OR: [
              { companyName: { contains: query } },
              { roleTitle: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: Number.isNaN(limit) ? 50 : Math.min(Math.max(limit, 1), 100),
  });

  return NextResponse.json({ applications });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = createApplicationSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const application = await prisma.application.create({
    data: {
      companyName: parsed.data.companyName,
      roleTitle: parsed.data.roleTitle,
      genericStatus: parsed.data.genericStatus,
      preciseStatus: parsed.data.preciseStatus,
      roleFamily: parsed.data.roleFamily,
      roleLevel: parsed.data.roleLevel,
      appliedAt: parsed.data.appliedAt,
      notes: parsed.data.notes,
    },
  });

  await triggerWorkerFromWrite();
  return NextResponse.json({ application }, { status: 201 });
}
