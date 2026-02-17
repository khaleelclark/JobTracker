import { z } from "zod";
import { prisma } from "../lib/db";
import { truncatePayload } from "../lib/truncate";

const inputSchema = z.object({ interview_id: z.string().uuid() });

export async function getReflection(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  const reflection = await prisma.interviewReflection.findUnique({
    where: { interviewId: parsed.data.interview_id },
  });

  if (!reflection) {
    return { error: "not_found" };
  }

  return truncatePayload({ reflection });
}
