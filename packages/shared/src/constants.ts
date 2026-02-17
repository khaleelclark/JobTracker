export const GENERIC_APPLICATION_STATUSES = [
  "interested",
  "applied",
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

export const CARD_PRIORITIES = ["low", "medium", "high"] as const;

export const CARD_STATES = ["active", "dismissed", "archived"] as const;

export const CARD_TYPES = [
  "followup_suggestion",
  "reflection_prompt",
  "thank_you_prompt",
  "weekly_review_prompt",
  "strategy_tip",
  "data_quality_tip",
  "email_draft",
] as const;

export const LOCAL_TRIAGE_CARD_TYPES = [
  "followup_suggestion",
  "reflection_prompt",
  "thank_you_prompt",
  "weekly_review_prompt",
  "strategy_tip",
  "data_quality_tip",
  "email_draft",
] as const;

export const MAX_CARD_TITLE_LENGTH = 120;
export const MAX_CARD_BODY_LENGTH = 1200;
export const MAX_CARDS_PER_RUN = 10;
export const MAX_APPLICATIONS_IN_SNAPSHOT = 60;
export const MAX_INTERVIEWS_IN_SNAPSHOT = 50;
export const SNAPSHOT_EMAIL_SNIPPET_LENGTH = 200;
export const MCP_DEFAULT_TRUNCATE = 5000;
export const LOCAL_TRIAGE_MAX_BODY_LENGTH = 220;
