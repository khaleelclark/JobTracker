import {
  CARD_PRIORITIES,
  CARD_STATES,
  CARD_TYPES,
  EMAIL_DIRECTIONS,
  ENGAGEMENT_EVENT_TYPES,
  FOLLOWUP_CHANNELS,
  FOLLOWUP_RESPONSE_TYPES,
  FOLLOWUP_RESULT_STATUS,
  GENERIC_APPLICATION_STATUSES,
  INTERVIEW_STATUSES,
  REFLECTION_OUTCOMES,
} from "./constants";

export type GenericApplicationStatus = (typeof GENERIC_APPLICATION_STATUSES)[number];
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];
export type ReflectionOutcome = (typeof REFLECTION_OUTCOMES)[number];
export type EmailDirection = (typeof EMAIL_DIRECTIONS)[number];
export type FollowupChannel = (typeof FOLLOWUP_CHANNELS)[number];
export type FollowupResultStatus = (typeof FOLLOWUP_RESULT_STATUS)[number];
export type FollowupResponseType = (typeof FOLLOWUP_RESPONSE_TYPES)[number];
export type EngagementEventType = (typeof ENGAGEMENT_EVENT_TYPES)[number];
export type CardPriority = (typeof CARD_PRIORITIES)[number];
export type CardState = (typeof CARD_STATES)[number];
export type CardType = (typeof CARD_TYPES)[number];

export interface WorkerCardInput {
  card_type: CardType;
  priority: CardPriority;
  title: string;
  body: string;
  evidence: Record<string, unknown>;
  dedupe_key: string;
  expires_in_hours: number;
  suggested_gpt_prompt?: string;
  related_application_id?: string;
  related_interview_id?: string;
}

export interface WorkerResponse {
  cards: WorkerCardInput[];
}

export interface ControlFileSections {
  goals?: string;
  constraints?: string;
  followUpStrategy?: string;
  experiments?: string;
  observations?: string;
  questionsForGpt?: string;
  systemNotes?: string;
  raw: string;
}
