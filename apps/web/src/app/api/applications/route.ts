import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createApplicationSchema, listApplicationsQuerySchema } from "@/lib/validation";
import { triggerWorkerFromWrite } from "@/server/hooks/onWriteTriggers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = listApplicationsQuerySchema.safeParse({
    query: searchParams.get("query")?.trim() || undefined,
    genericStatus: searchParams.get("genericStatus")?.trim() || undefined,
    limit: Number(searchParams.get("limit") ?? 50),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { query, genericStatus, limit } = parsed.data;

  const applications = await prisma.application.findMany({
    where: {
      ...(genericStatus ? { genericStatus } : {}),
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
    take: limit,
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
      postingDetails: parsed.data.postingDetails,
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
