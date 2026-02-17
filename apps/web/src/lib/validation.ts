import { z } from "zod";

export const createApplicationSchema = z.object({
  companyName: z.string().min(1).max(200),
  roleTitle: z.string().min(1).max(200),
  genericStatus: z.enum([
    "interested",
    "applied",
    "interviewing",
    "offered",
    "rejected",
    "withdrawn",
    "archived",
  ]),
  preciseStatus: z.string().max(200).optional().nullable(),
  roleFamily: z.string().max(120).optional().nullable(),
  roleLevel: z.string().max(120).optional().nullable(),
  appliedAt: z.coerce.date(),
  notes: z.string().max(4000).optional().nullable(),
});

export const createInterviewSchema = z.object({
  applicationId: z.string().uuid(),
  roundIndex: z.number().int().min(1).max(20),
  roundLabel: z.string().min(1).max(100),
  scheduledAt: z.coerce.date(),
  status: z.enum(["scheduled", "completed", "cancelled"]),
});

export const createEmailLogSchema = z.object({
  applicationId: z.string().uuid(),
  direction: z.enum(["inbound", "outbound"]),
  isHuman: z.boolean(),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(12000),
});

export const createFollowupSchema = z.object({
  applicationId: z.string().uuid(),
  attemptIndex: z.number().int().min(1).max(20),
  channel: z.enum(["email", "linkedin", "portal", "other"]),
  sentAt: z.coerce.date(),
});

export const createFollowupResultSchema = z.object({
  followupAttemptId: z.string().uuid(),
  resultStatus: z.enum(["pending", "resolved", "expired_no_response"]),
  responseType: z
    .enum(["human_reply", "rejection_reply", "screen_scheduled", "interview_scheduled"])
    .optional()
    .nullable(),
  resolvedAt: z.coerce.date().optional().nullable(),
});

export const createEngagementEventSchema = z.object({
  applicationId: z.string().uuid(),
  eventType: z.enum(["recruiter_reply", "phone_screen", "interview_round", "offer", "rejection"]),
  occurredAt: z.coerce.date(),
});

export const createReflectionSchema = z.object({
  interviewId: z.string().uuid(),
  summary: z.string().min(1).max(5000),
  outcome: z.enum(["pending", "advanced", "rejected"]),
});

export const createResumeSchema = z.object({
  name: z.string().min(1).max(200),
  filePath: z.string().max(1000).optional(),
  fileBase64: z.string().optional(),
  fileName: z.string().max(200).optional(),
  extractedText: z.string().max(50000).optional().nullable(),
  linkedApplicationIds: z.array(z.string().uuid()).default([]),
});

export const updateCardStateSchema = z.object({
  action: z.enum(["dismiss", "archive", "snooze"]),
  snoozeDays: z.number().int().min(1).max(30).optional(),
});
