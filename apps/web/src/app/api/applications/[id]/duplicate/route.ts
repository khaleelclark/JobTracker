export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_: Request, context: RouteContext) {
  const { id } = await context.params;

  const source = await prisma.application.findUnique({
    where: { id },
    include: { resumes: { select: { resumeId: true } } },
  });

  if (!source) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const application = await prisma.application.create({
    data: {
      companyName: source.companyName,
      roleTitle: source.roleTitle,
      careersPageUrl: source.careersPageUrl,
      postingDetails: source.postingDetails,
      compensation: source.compensation,
      genericStatus: source.genericStatus,
      roleFamily: source.roleFamily,
      roleLevel: source.roleLevel,
      appliedAt: source.appliedAt,
      notes: source.notes,
      resumes: {
        create: source.resumes.map((resume) => ({
          resume: { connect: { id: resume.resumeId } },
        })),
      },
    },
  });

  return NextResponse.json({ application }, { status: 201 });
}
