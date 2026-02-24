import { z } from "zod";
import { prisma } from "../lib/db";
import { truncatePayload } from "../lib/truncate";

const inputSchema = z
  .object({
    query: z.string().max(120).optional(),
    category: z.string().max(120).optional(),
    limit: z.number().int().min(1).max(300).default(200),
  })
  .default({});

export async function listMasterSkills(input: unknown) {
  const parsed = inputSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  const data = parsed.data;

  const skills = await prisma.masterSkill.findMany({
    where: {
      ...(data.category ? { category: data.category } : {}),
      ...(data.query
        ? {
            OR: [
              { name: { contains: data.query } },
              { notes: { contains: data.query } },
            ],
          }
        : {}),
    },
    orderBy: [{ name: "asc" }, { createdAt: "asc" }],
    take: data.limit,
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

  return truncatePayload({ skills });
}
