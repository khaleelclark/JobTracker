import { z } from "zod";
import {
  CARD_PRIORITIES,
  CARD_TYPES,
  EMAIL_DIRECTIONS,
  ENGAGEMENT_EVENT_TYPES,
  FOLLOWUP_CHANNELS,
  FOLLOWUP_RESPONSE_TYPES,
  FOLLOWUP_RESULT_STATUS,
  GENERIC_APPLICATION_STATUSES,
  INTERVIEW_STATUSES,
  MAX_CARD_BODY_LENGTH,
  MAX_CARD_TITLE_LENGTH,
  MAX_CARDS_PER_RUN,
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

export const workerCardSchema = z.object({
  card_type: z.enum(CARD_TYPES),
  priority: z.enum(CARD_PRIORITIES),
  title: z.string().min(1).max(MAX_CARD_TITLE_LENGTH),
  body: z.string().min(1).max(MAX_CARD_BODY_LENGTH),
  evidence: z.record(z.unknown()),
  dedupe_key: z.string().min(1).max(200),
  expires_in_hours: z.number().int().min(1).max(24 * 30),
  suggested_gpt_prompt: z.string().max(2000).optional(),
  related_application_id: z.string().uuid().optional(),
  related_interview_id: z.string().uuid().optional(),
});

export const workerResponseSchema = z.object({
  cards: z.array(workerCardSchema).max(MAX_CARDS_PER_RUN),
});

export const searchApplicationsFiltersSchema = z.object({
  query: z.string().max(200).optional(),
  genericStatus: genericApplicationStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).default(25),
});
