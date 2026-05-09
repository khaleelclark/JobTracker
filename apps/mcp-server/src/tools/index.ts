import { getApplication } from "./getApplication";
import { getControlFile } from "./getControlFile";
import { getFullContextDump } from "./getFullContextDump";
import { getMasterResume } from "./getMasterResume";
import { getReflection } from "./getReflection";
import { getResume } from "./getResume";
import { generateResume } from "./generateResume";
import { listEmailLogs } from "./listEmailLogs";
import { listEngagementEvents } from "./listEngagementEvents";
import { listFollowupAttempts } from "./listFollowupAttempts";
import { listInterviews } from "./listInterviews";
import { listMasterSkills } from "./listMasterSkills";
import { searchApplications } from "./searchApplications";

export const toolHandlers: Record<
  string,
  (input: unknown) => Promise<unknown>
> = {
  search_applications: searchApplications,
  get_application: getApplication,
  list_interviews: listInterviews,
  get_reflection: getReflection,
  list_email_logs: listEmailLogs,
  list_followup_attempts: listFollowupAttempts,
  list_engagement_events: listEngagementEvents,
  get_resume: getResume,
  get_master_resume: getMasterResume,
  generate_resume: generateResume,
  list_master_skills: listMasterSkills,
  get_control_file: getControlFile,
  get_full_context_dump: getFullContextDump,
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
    description:
      "Search applications by query/status and return a bounded list.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
        generic_status: {
          type: "string",
          enum: [
            "applied",
            "under_review",
            "interviewing",
            "offered",
            "rejected",
            "withdrawn",
            "archived",
          ],
        },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_application",
    description:
      "Fetch full details for one application including related interviews/followups/events.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", format: "uuid" },
      },
      required: ["id"],
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
    description:
      "List communication logs for an application, a company, or globally.",
    inputSchema: {
      type: "object",
      properties: {
        application_id: { type: "string", format: "uuid" },
        company_name: { type: "string", minLength: 1, maxLength: 200 },
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
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
    description:
      "Get one resume by id, including linked applications and master skills.",
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
    name: "get_master_resume",
    description:
      "Return the master resume JSON from /home/khaleel/Projects/Job App/master-resume.json. Use this as the source resume when creating a tailored resume for a job position.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "generate_resume",
    description:
      "Generate a PDF resume from an AI-tailored resume JSON object and save it to /home/khaleel/Generated Resumes. You must provide the resume property for this tool to work.",
    inputSchema: {
      type: "object",
      properties: {
        resume: {
          type: "object",
          description: `a verbose JSON Resume in the master resume format after tailoring/reordering for the target position.`,
        },
      },
      required: ["resume"],
      additionalProperties: false,
    },
  },
  {
    name: "list_master_skills",
    description:
      "List master skills (canonical skill inventory), optionally filtered by query/category.",
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
  {
    name: "get_full_context_dump",
    description:
      "WARNING: Use only when explicitly asked for full/system-wide context. Prefer narrower tools for routine retrieval.",
    inputSchema: {
      type: "object",
      properties: {
        since: {
          type: "string",
          format: "date-time",
          description:
            "Optional ISO timestamp. Only include rows at/after this value where applicable.",
        },
        limit_per_table: {
          type: "integer",
          minimum: 1,
          maximum: 500,
          default: 100,
        },
      },
      additionalProperties: false,
    },
  },
];
