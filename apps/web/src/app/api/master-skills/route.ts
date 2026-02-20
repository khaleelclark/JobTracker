import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createMasterSkillSchema, listMasterSkillsQuerySchema } from "@/lib/validation";
import { triggerWorkerFromWrite } from "@/server/hooks/onWriteTriggers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = listMasterSkillsQuerySchema.safeParse({
    query: searchParams.get("query")?.trim() || undefined,
    category: searchParams.get("category")?.trim() || undefined,
    limit: Number(searchParams.get("limit") ?? 200),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { query, category, limit } = parsed.data;

  const skills = await prisma.masterSkill.findMany({
    where: {
      ...(category ? { category } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query } },
              { notes: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    take: limit,
    include: {
      resumeLinks: {
        include: {
          resume: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ skills });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const parsed = createMasterSkillSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const skill = await prisma.masterSkill.create({
      data: {
        name: parsed.data.name,
        category: parsed.data.category,
        notes: parsed.data.notes,
        resumeLinks: {
          create: parsed.data.linkedResumeIds.map((resumeId) => ({
            resume: { connect: { id: resumeId } },
          })),
        },
      },
      include: {
        resumeLinks: true,
      },
    });

    await triggerWorkerFromWrite();
    return NextResponse.json({ skill }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "skill_name_must_be_unique" }, { status: 409 });
  }
}
