import { z } from "zod";

const experienceYearsSchema = z
  .number()
  .min(0)
  .max(60)
  .refine((value) => Number.isFinite(value), "must be a finite number")
  .refine((value) => Number((value * 2).toFixed(0)) === value * 2, "must be in 0.5 year increments");

export const createApplicationSchema = z.object({
  companyName: z.string().min(1).max(200),
  roleTitle: z.string().min(1).max(200),
  postingDetails: z.string().max(50000).optional().nullable(),
  genericStatus: z.enum([
    "interested",
    "applied",
    "under_review",
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

export const updateApplicationSchema = createApplicationSchema;

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
  linkedSkillIds: z.array(z.string().uuid()).default([]),
});

export const createMasterSkillSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().max(120).optional().nullable(),
  experienceYears: experienceYearsSchema.optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  linkedResumeIds: z.array(z.string().uuid()).default([]),
});

export const updateMasterSkillSchema = createMasterSkillSchema;
export const deleteAllMasterSkillsSchema = z.object({
  confirmDeleteAll: z.literal(true),
});

export const listMasterSkillsQuerySchema = z.object({
  query: z.string().max(120).optional(),
  category: z.string().max(120).optional(),
  limit: z.number().int().min(1).max(300).default(200),
});

export const generateMasterSkillsFromResumeSchema = z
  .object({
    resumeId: z.string().uuid().optional(),
    resumeText: z.string().max(100000).optional(),
    linkResumeId: z.string().uuid().optional(),
    uploadedFileName: z.string().max(255).optional(),
    uploadedFileBase64: z.string().max(20_000_000).optional(),
  })
  .refine((data) => Boolean(data.resumeId || data.resumeText?.trim() || data.uploadedFileBase64), {
    message: "resumeId, resumeText, or uploaded file is required",
    path: ["resumeText"],
  })
  .refine(
    (data) =>
      Boolean((data.uploadedFileName && data.uploadedFileBase64) || (!data.uploadedFileName && !data.uploadedFileBase64)),
    {
      message: "uploadedFileName and uploadedFileBase64 must be provided together",
      path: ["uploadedFileName"],
    },
  );

export const updateCardStateSchema = z.object({
  action: z.enum(["dismiss", "archive", "snooze"]),
  snoozeDays: z.number().int().min(1).max(30).optional(),
});

export const listApplicationsQuerySchema = z.object({
  query: z.string().max(200).optional(),
  genericStatus: z
    .enum(["interested", "applied", "under_review", "interviewing", "offered", "rejected", "withdrawn", "archived"])
    .optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const listUiCardsQuerySchema = z.object({
  state: z.enum(["active", "dismissed", "archived"]).optional(),
  limit: z.number().int().min(1).max(100).default(100),
});
