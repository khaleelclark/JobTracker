import { z } from "zod";
import {
  EMAIL_DIRECTIONS,
  ENGAGEMENT_EVENT_TYPES,
  FOLLOWUP_CHANNELS,
  FOLLOWUP_RESPONSE_TYPES,
  FOLLOWUP_RESULT_STATUS,
  GENERIC_APPLICATION_STATUSES,
  INTERVIEW_STATUSES,
  REFLECTION_OUTCOMES,
} from "./constants";

export const genericApplicationStatusSchema = z.enum(GENERIC_APPLICATION_STATUSES);
export const interviewStatusSchema = z.enum(INTERVIEW_STATUSES);
export const reflectionOutcomeSchema = z.enum(REFLECTION_OUTCOMES);
export const emailDirectionSchema = z.enum(EMAIL_DIRECTIONS);
export const followupChannelSchema = z.enum(FOLLOWUP_CHANNELS);
export const followupResultStatusSchema = z.enum(FOLLOWUP_RESULT_STATUS);
export const followupResponseTypeSchema = z.enum(FOLLOWUP_RESPONSE_TYPES);
export const engagementEventTypeSchema = z.enum(ENGAGEMENT_EVENT_TYPES);

export const searchApplicationsFiltersSchema = z.object({
  query: z.string().max(200).optional(),
  genericStatus: genericApplicationStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).default(25),
});
