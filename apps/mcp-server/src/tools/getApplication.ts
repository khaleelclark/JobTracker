import { z } from "zod";
import { prisma } from "../lib/db";
import { truncatePayload } from "../lib/truncate";

const inputSchema = z.object({
  id: z.string().uuid(),
});

export async function getApplication(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  const { id } = parsed.data;

  const application = await prisma.application.findUnique({
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
      events: { orderBy: { occurredAt: "desc" } },
      resumes: { include: { resume: true } },
    },
  });

  if (!application) {
    return { error: "not_found" };
  }

  return truncatePayload({ application });
}
