import { z } from "zod";
import { prisma } from "../lib/db";
import { truncatePayload } from "../lib/truncate";

const inputSchema = z.object({
  application_id: z.string().uuid(),
  limit: z.number().int().min(1).max(100).default(25),
});

export async function listEmailLogs(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  const emailLogs = await prisma.emailLog.findMany({
    where: { applicationId: parsed.data.application_id },
    orderBy: { createdAt: "desc" },
    take: parsed.data.limit,
  });

  return truncatePayload({ email_logs: emailLogs });
}
