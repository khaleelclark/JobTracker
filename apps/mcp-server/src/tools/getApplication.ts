import { z } from "zod";
import { prisma } from "../lib/db";
import { truncatePayload } from "../lib/truncate";
import { listEngagementEventRows } from "./engagementEventsRaw";

const inputSchema = z.object({
  id: z.string().uuid(),
});

export async function getApplication(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  const { id } = parsed.data;

  const [application, events] = await Promise.all([
    prisma.application.findUnique({
      where: { id },
      include: {
        interviews: {
          include: { reflection: true },
          orderBy: { scheduledAt: "asc" },
        },
        followups: {
          include: { result: true },
          orderBy: { sentAt: "desc" },
        },
        resumes: { include: { resume: true } },
      },
    }),
    listEngagementEventRows({ applicationId: id, take: 100 }),
  ]);

  if (!application) {
    return { error: "not_found" };
  }

  return truncatePayload({ application: { ...application, events } });
}
