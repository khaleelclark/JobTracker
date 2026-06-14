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
    description: "Get one resume by id, including linked applications.",
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
      "Return a master resume JSON for AI-tailored resume generation. Omit owner to load the default master resume file, or pass an owner name to load a named master resume (e.g. 'Patrick' loads patrick-master-resume.json, or a managed resume stored through /api/master-resumes).",
    inputSchema: {
      type: "object",
      properties: {
        owner: {
          type: "string",
          minLength: 1,
          maxLength: 80,
          pattern: "^[a-zA-Z0-9_-]+$",
          description:
            "Optional managed master resume owner, for example 'Patrick'.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "generate_resume",
    description:
      "Generate a PDF resume from an AI-tailored resume JSON object. Saves the PDF directly to the user's local machine and returns the file name and path. Always provide a descriptive file_name like 'Full Name - Role - Company.pdf'. Tell the user the file was saved and give them the file name.",
    inputSchema: {
      type: "object",
      properties: {
        resume: {
          type: "object",
          description: `a verbose JSON Resume in the master resume format after tailoring/reordering for the target position.`,
        },
        file_name: {
          type: "string",
          maxLength: 200,
          description: "Descriptive file name for the PDF, e.g. 'Jane Smith - Senior Engineer - Acme.pdf'. Do not include a path. Extension is optional.",
        },
      },
      required: ["resume", "file_name"],
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
