import { z } from "zod";
import { prisma } from "../lib/db";
import { truncatePayload } from "../lib/truncate";

const inputSchema = z.object({ application_id: z.string().uuid().optional() });

export async function listInterviews(input: unknown) {
  const parsed = inputSchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  const interviews = await prisma.interview.findMany({
    where: parsed.data.application_id
      ? { applicationId: parsed.data.application_id }
      : undefined,
    include: { reflection: true, application: true },
    orderBy: { scheduledAt: "desc" },
    take: 100,
  });

  return truncatePayload({ interviews });
}
