import { z } from "zod";
import { prisma } from "../lib/db";
import { truncatePayload } from "../lib/truncate";

const inputSchema = z
  .object({
    id: z.string().uuid().optional(),
    application_id: z.string().uuid().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.id && !value.application_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "id or application_id is required",
        path: ["id"],
      });
    }
  });

export async function getApplication(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  const applicationId = parsed.data.id ?? parsed.data.application_id;
  if (!applicationId) {
    return { error: "invalid_input", details: { formErrors: ["id or application_id is required"] } };
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
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
