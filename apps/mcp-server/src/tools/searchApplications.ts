import { z } from "zod";
import { prisma } from "../lib/db";
import { truncatePayload } from "../lib/truncate";

const searchInputSchema = z
  .object({
    query: z.string().max(200).optional(),
    generic_status: z
      .enum(["applied", "under_review", "interviewing", "offered", "rejected", "withdrawn", "archived"])
      .optional(),
    limit: z.number().int().min(1).max(100).default(25),
  })
  .default({});

export async function searchApplications(input: unknown) {
  const parsed = searchInputSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  const data = parsed.data;

  const rows = await prisma.application.findMany({
    where: {
      ...(data.generic_status ? { genericStatus: data.generic_status } : {}),
      ...(data.query
        ? {
            OR: [
              { companyName: { contains: data.query } },
              { roleTitle: { contains: data.query } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: data.limit,
  });

  return truncatePayload({ applications: rows });
}
