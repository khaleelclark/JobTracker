import { z } from "zod";
import { prisma } from "../lib/db";
import { truncatePayload } from "../lib/truncate";

const inputSchema = z.object({ application_id: z.string().uuid() });

export async function listFollowupAttempts(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  const followups = await prisma.followupAttempt.findMany({
    where: { applicationId: parsed.data.application_id },
    include: { result: true },
    orderBy: { sentAt: "desc" },
    take: 100,
  });

  return truncatePayload({ followup_attempts: followups });
}
