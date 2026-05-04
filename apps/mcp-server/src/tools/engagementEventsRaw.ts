import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db";

export interface EngagementEventRow {
  id: string;
  applicationId: string;
  eventType: string;
  occurredAt: Date | string;
}

export async function listEngagementEventRows(input: {
  applicationId?: string;
  since?: Date;
  take: number;
}): Promise<EngagementEventRow[]> {
  const applicationFilter = input.applicationId
    ? Prisma.sql`AND "application_id" = ${input.applicationId}`
    : Prisma.empty;
  const sinceFilter = input.since
    ? Prisma.sql`AND "occurred_at" >= ${input.since}`
    : Prisma.empty;

  return prisma.$queryRaw<EngagementEventRow[]>`
    SELECT
      "id",
      "application_id" AS "applicationId",
      "event_type" AS "eventType",
      "occurred_at" AS "occurredAt"
    FROM "engagement_events"
    WHERE 1 = 1
      ${applicationFilter}
      ${sinceFilter}
    ORDER BY "occurred_at" DESC
    LIMIT ${input.take}
  `;
}
