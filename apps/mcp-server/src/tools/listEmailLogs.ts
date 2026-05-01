import { z } from "zod";
import { prisma } from "../lib/db";
import { truncatePayload } from "../lib/truncate";

const inputSchema = z.object({
  application_id: z.string().uuid().optional(),
  company_name: z.string().trim().min(1).max(200).optional(),
  limit: z.number().int().min(1).max(100).default(25),
});

export async function listEmailLogs(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  if (parsed.data.application_id && parsed.data.company_name) {
    return {
      error: "invalid_input",
      details: {
        formErrors: [],
        fieldErrors: {
          application_id: [
            "Provide only one filter: application_id or company_name.",
          ],
        },
      },
    };
  }

  const emailLogs = await prisma.emailLog.findMany({
    where: parsed.data.application_id
      ? { applicationId: parsed.data.application_id }
      : parsed.data.company_name
        ? { companyName: parsed.data.company_name }
        : undefined,
    include: {
      application: {
        select: { id: true, companyName: true, roleTitle: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: parsed.data.limit,
  });

  return truncatePayload({
    email_logs: emailLogs.map(emailLog => ({
      id: emailLog.id,
      scope: emailLog.applicationId ? "application" : "company",
      application_id: emailLog.applicationId,
      company_name:
        emailLog.companyName ?? emailLog.application?.companyName ?? null,
      role_title: emailLog.application?.roleTitle ?? null,
      channel: emailLog.channel,
      direction: emailLog.direction,
      is_human: emailLog.isHuman,
      subject: emailLog.subject,
      body: emailLog.body,
      notes: emailLog.notes,
      created_at: emailLog.createdAt.toISOString(),
    })),
  });
}
