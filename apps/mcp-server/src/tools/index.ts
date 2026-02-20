import { getApplication } from "./getApplication";
import { getControlFile } from "./getControlFile";
import { getReflection } from "./getReflection";
import { getResume } from "./getResume";
import { listEmailLogs } from "./listEmailLogs";
import { listEngagementEvents } from "./listEngagementEvents";
import { listFollowupAttempts } from "./listFollowupAttempts";
import { listInterviews } from "./listInterviews";
import { listMasterSkills } from "./listMasterSkills";
import { searchApplications } from "./searchApplications";

export const toolHandlers: Record<string, (input: unknown) => Promise<unknown>> = {
  search_applications: searchApplications,
  get_application: getApplication,
  list_interviews: listInterviews,
  get_reflection: getReflection,
  list_email_logs: listEmailLogs,
  list_followup_attempts: listFollowupAttempts,
  list_engagement_events: listEngagementEvents,
  get_resume: getResume,
  list_master_skills: listMasterSkills,
  get_control_file: getControlFile,
};

export const requiredToolNames = Object.keys(toolHandlers);

export interface MpcToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const mcpToolDefinitions: MpcToolDefinition[] = [
  {
    name: "search_applications",
    description: "Search applications by query/status and return a bounded list.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        generic_status: {
          type: "string",
          enum: ["interested", "applied", "interviewing", "offered", "rejected", "withdrawn", "archived"],
        },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_application",
    description: "Fetch full details for one application including related interviews/followups/events.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
        application_id: { type: "string", format: "uuid" },
      },
      anyOf: [{ required: ["id"] }, { required: ["application_id"] }],
      additionalProperties: false,
    },
  },
  {
    name: "list_interviews",
    description: "List interviews, optionally filtered to an application.",
    inputSchema: {
      type: "object",
      properties: {
        application_id: { type: "string", format: "uuid" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_reflection",
    description: "Get interview reflection for a specific interview id.",
    inputSchema: {
      type: "object",
      properties: {
        interview_id: { type: "string", format: "uuid" },
      },
      required: ["interview_id"],
      additionalProperties: false,
    },
  },
  {
    name: "list_email_logs",
    description: "List email logs for an application.",
    inputSchema: {
      type: "object",
      properties: {
        application_id: { type: "string", format: "uuid" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      required: ["application_id"],
      additionalProperties: false,
    },
  },
  {
    name: "list_followup_attempts",
    description: "List follow-up attempts (and results) for an application.",
    inputSchema: {
      type: "object",
      properties: {
        application_id: { type: "string", format: "uuid" },
      },
      required: ["application_id"],
      additionalProperties: false,
    },
  },
  {
    name: "list_engagement_events",
    description: "List engagement events for an application.",
    inputSchema: {
      type: "object",
      properties: {
        application_id: { type: "string", format: "uuid" },
      },
      required: ["application_id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_resume",
    description: "Get one resume by id, including linked applications and master skills.",
    inputSchema: {
      type: "object",
      properties: {
        resume_id: { type: "string", format: "uuid" },
      },
      required: ["resume_id"],
      additionalProperties: false,
    },
  },
  {
    name: "list_master_skills",
    description: "List master skills (canonical skill inventory), optionally filtered by query/category.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        category: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 300 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_control_file",
    description: "Return the current control file text.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
];
