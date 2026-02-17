import { z } from "zod";
import { prisma } from "../lib/db";
import { truncatePayload } from "../lib/truncate";

const inputSchema = z.object({ application_id: z.string().uuid() });

export async function listEngagementEvents(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  const events = await prisma.engagementEvent.findMany({
    where: { applicationId: parsed.data.application_id },
    orderBy: { occurredAt: "desc" },
    take: 100,
  });

  return truncatePayload({ engagement_events: events });
}
