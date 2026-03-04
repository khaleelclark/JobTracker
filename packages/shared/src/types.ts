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

export type GenericApplicationStatus = (typeof GENERIC_APPLICATION_STATUSES)[number];
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];
export type ReflectionOutcome = (typeof REFLECTION_OUTCOMES)[number];
export type EmailDirection = (typeof EMAIL_DIRECTIONS)[number];
export type FollowupChannel = (typeof FOLLOWUP_CHANNELS)[number];
export type FollowupResultStatus = (typeof FOLLOWUP_RESULT_STATUS)[number];
export type FollowupResponseType = (typeof FOLLOWUP_RESPONSE_TYPES)[number];
export type EngagementEventType = (typeof ENGAGEMENT_EVENT_TYPES)[number];

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
