import { z } from "zod";
import { truncatePayload } from "../lib/truncate";
import { listEngagementEventRows } from "./engagementEventsRaw";

const inputSchema = z.object({ application_id: z.string().uuid() });

export async function listEngagementEvents(input: unknown) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "invalid_input", details: parsed.error.flatten() };
  }

  const events = await listEngagementEventRows({
    applicationId: parsed.data.application_id,
    take: 100,
  });

  return truncatePayload({ engagement_events: events });
}
