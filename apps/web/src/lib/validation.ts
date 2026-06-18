import { z } from "zod";
import { GENERIC_APPLICATION_STATUSES } from "@job-tracker/shared";

const experienceYearsSchema = z
  .number()
  .min(0)
  .max(60)
  .refine(value => Number.isFinite(value), "must be a finite number")
  .refine(
    value => Number((value * 2).toFixed(0)) === value * 2,
    "must be in 0.5 year increments",
  );

export const createApplicationSchema = z.object({
  companyName: z.string().min(1).max(200),
  roleTitle: z.string().min(1).max(200),
  careersPageUrl: z.string().url().max(1000).optional().nullable(),
  postingDetails: z.string().max(50000).optional().nullable(),
  compensation: z.string().max(300).optional().nullable(),
  genericStatus: z.enum(GENERIC_APPLICATION_STATUSES),
  roleFamily: z.string().max(120).optional().nullable(),
  roleLevel: z.string().max(120).optional().nullable(),
  appliedAt: z.coerce.date(),
  notes: z.string().max(4000).optional().nullable(),
  coverLetter: z.string().max(20000).optional().nullable(),
  linkedResumeIds: z.array(z.string().uuid()).default([]),
});

export const updateApplicationSchema = createApplicationSchema;

export const createInterviewSchema = z.object({
  applicationId: z.string().uuid(),
  roundIndex: z.number().int().min(1).max(20),
  roundLabel: z.string().min(1).max(100),
  scheduledAt: z.coerce.date(),
  status: z.enum(["scheduled", "completed", "cancelled"]),
  notes: z.string().max(4000).optional().nullable(),
});

const emailLogPayloadSchema = z.object({
  channel: z.enum(["email", "linkedin"]),
  direction: z.enum(["inbound", "outbound"]),
  isHuman: z.boolean(),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(12000),
  notes: z.string().max(4000).optional().nullable(),
});

export const createEmailLogSchema = emailLogPayloadSchema
  .extend({
    applicationId: z.string().uuid().optional(),
    applicationIds: z.array(z.string().uuid()).min(1).max(100).optional(),
    companyName: z.string().min(1).max(200).optional(),
  })
  .superRefine((data, context) => {
    const targetCount =
      Number(Boolean(data.applicationId)) +
      Number(
        Array.isArray(data.applicationIds) && data.applicationIds.length > 0,
      ) +
      Number(Boolean(data.companyName?.trim()));

    if (targetCount !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide exactly one target: applicationId, applicationIds, or companyName.",
        path: ["applicationId"],
      });
    }
  });

export const updateEmailLogSchema = emailLogPayloadSchema
  .extend({
    applicationId: z.string().uuid().optional(),
    applicationIds: z.array(z.string().uuid()).min(1).max(100).optional(),
    companyName: z.string().min(1).max(200).optional(),
  })
  .superRefine((data, context) => {
    const targetCount =
      Number(Boolean(data.applicationId)) +
      Number(
        Array.isArray(data.applicationIds) && data.applicationIds.length > 0,
      ) +
      Number(Boolean(data.companyName?.trim()));
    if (targetCount !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide exactly one target: applicationId, applicationIds, or companyName.",
        path: ["applicationId"],
      });
    }
  });

export const createFollowupSchema = z.object({
  applicationId: z.string().uuid(),
  attemptIndex: z.number().int().min(1).max(20),
  channel: z.enum(["email", "linkedin", "portal", "other"]),
  sentAt: z.coerce.date(),
});
export const updateFollowupSchema = createFollowupSchema;

export const createFollowupResultSchema = z.object({
  followupAttemptId: z.string().uuid(),
  resultStatus: z.enum(["pending", "resolved", "expired_no_response"]),
  responseType: z
    .enum([
      "human_reply",
      "rejection_reply",
      "screen_scheduled",
      "interview_scheduled",
    ])
    .optional()
    .nullable(),
  resolvedAt: z.coerce.date().optional().nullable(),
});

export const createEngagementEventSchema = z.object({
  applicationId: z.string().uuid(),
  eventType: z.enum([
    "recruiter_reply",
    "phone_screen",
    "interview_round",
    "offer",
    "rejection_automated",
    "rejection_human",
    "rejection",
  ]),
  occurredAt: z.coerce.date(),
});
export const updateEngagementEventSchema = createEngagementEventSchema;

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

export const updateResumeSchema = z.object({
  name: z.string().min(1).max(200),
  filePath: z.string().min(1).max(1000),
  extractedText: z.string().max(50000).optional().nullable(),
  linkedApplicationIds: z.array(z.string().uuid()).default([]),
});

const masterResumeJsonSchema = z
  .object({
    name: z.string().min(1).max(200),
    sections: z.array(z.unknown()).min(1),
  })
  .passthrough();

export const createMasterResumeSchema = z.object({
  owner: z
    .string()
    .min(1)
    .max(80)
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "owner may only contain letters, numbers, underscores, and hyphens",
    ),
  resume: masterResumeJsonSchema,
});

export const updateApplicationResumeLinksSchema = z.object({
  linkedResumeIds: z.array(z.string().uuid()).default([]),
});

export const goalsProfileSchema = z.object({
  missionStatement: z.string().max(8000),
  weeklyApplicationsTarget: z.number().int().min(1).max(200).nullable(),
  compensationPreference: z.string().max(300),
  preferredLocations: z.string().max(500),
  employmentTypes: z.array(z.string().max(50)).max(10),
  workplaceModes: z.array(z.string().max(50)).max(10),
  priorityNotes: z.string().max(8000),
});

export const listApplicationsQuerySchema = z.object({
  query: z.string().max(200).optional(),
  genericStatus: z.enum(GENERIC_APPLICATION_STATUSES).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const updateInterviewSchema = createInterviewSchema;
