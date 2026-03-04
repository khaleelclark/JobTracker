export const GENERIC_APPLICATION_STATUSES = [
  "applied",
  "under_review",
  "interviewing",
  "offered",
  "rejected",
  "withdrawn",
  "archived",
] as const;

export const INTERVIEW_STATUSES = ["scheduled", "completed", "cancelled"] as const;

export const REFLECTION_OUTCOMES = ["pending", "advanced", "rejected"] as const;

export const EMAIL_DIRECTIONS = ["inbound", "outbound"] as const;

export const FOLLOWUP_CHANNELS = ["email", "linkedin", "portal", "other"] as const;

export const FOLLOWUP_RESULT_STATUS = [
  "pending",
  "resolved",
  "expired_no_response",
] as const;

export const FOLLOWUP_RESPONSE_TYPES = [
  "human_reply",
  "rejection_reply",
  "screen_scheduled",
  "interview_scheduled",
] as const;

export const ENGAGEMENT_EVENT_TYPES = [
  "recruiter_reply",
  "phone_screen",
  "interview_round",
  "offer",
  "rejection",
] as const;

export const MCP_DEFAULT_TRUNCATE = 5000;
