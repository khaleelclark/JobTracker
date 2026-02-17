import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      interviews: { include: { reflection: true }, orderBy: { scheduledAt: "asc" } },
      emailLogs: { orderBy: { createdAt: "desc" }, take: 50 },
      followups: { include: { result: true }, orderBy: { sentAt: "desc" }, take: 50 },
      events: { orderBy: { occurredAt: "desc" }, take: 50 },
      resumes: { include: { resume: true } },
    },
  });

  if (!application) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ application });
}
