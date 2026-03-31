export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { updateApplicationResumeLinksSchema } from "@/lib/validation";
import { triggerWorkerFromWrite } from "@/server/hooks/onWriteTriggers";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = await request.json();
  const parsed = updateApplicationResumeLinksSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.application.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const application = await prisma.application.update({
    where: { id },
    data: {
      resumes: {
        deleteMany: {},
        create: parsed.data.linkedResumeIds.map((resumeId) => ({
          resume: { connect: { id: resumeId } },
        })),
      },
    },
    include: { resumes: { include: { resume: true } } },
  });

  await triggerWorkerFromWrite();
  return NextResponse.json({ application });
}
