import { z } from "zod";
import { prisma } from "../lib/db";
import { truncatePayload } from "../lib/truncate";

const inputSchema = z.object({ resume_id: z.string().uuid() });

export async function getResume(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  const resume = await prisma.resume.findUnique({
    where: { id: parsed.data.resume_id },
    include: {
      applications: {
        include: { application: true },
      },
    },
  });

  if (!resume) {
    return { error: "not_found" };
  }

  return truncatePayload({ resume });
}
