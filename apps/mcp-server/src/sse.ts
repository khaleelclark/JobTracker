import crypto from "node:crypto";
import type { Request, Response } from "express";
import { resolvePublicBaseUrl } from "./oauth/metadata";
import { mcpToolDefinitions, toolHandlers } from "./tools";

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: JsonRpcId;
  method?: string;
  params?: unknown;
}

interface Session {
  id: string;
  res: Response;
  heartbeat: NodeJS.Timeout;
}

const sessions = new Map<string, Session>();

const MCP_INSTRUCTIONS = [
  `Job tracker tools are factual retrieval and workflow orchestration tools. 
Do not invent application history, interview outcomes, resume content, or company interactions.

The resume generation workflow is the primary exception and should operate autonomously when sufficient context exists.

## Resume Generation Workflow

Interpret the following user intents as resume-generation tasks:
- "generate resume"
- "tailor resume"
- "optimize my resume"
- pasted job descriptions
- ATS optimization requests
- resume tailoring shorthand or implied workflow continuation

When the user requests a resume for a specific position:

1. Analyze the job description first.
   - Identify:
     - primary technologies
     - engineering focus areas
     - seniority level
     - required keywords
     - preferred qualifications
     - ATS-relevant terminology
   - Infer the most relevant experience and projects from resume history.

2. Call 'get_master_resume'.
   - 'get_master_resume' is the canonical source resume for all tailored resume generation tasks.
   - Omit owner for Khaleel's resume.
   - If the user asks for Patrick's resume, call it with { "owner": "Patrick" }.
   - Do not generate resumes from memory when the tool is available.

3. Generate a new tailored resume JSON object using the same schema structure as the master resume.
   - Preserve factual accuracy.
   - Reorganize sections for maximum relevance to the target role.
   - Remove or minimize unrelated content.
   - Prioritize role-relevant technical experience, projects, systems work, and measurable impact.
   - Prefer concise, impact-oriented bullet points.
   - Optimize for both human readability and ATS parsing.

4. Tailoring priorities:
   - Match technologies and terminology from the job posting.
   - Emphasize transferable engineering experience when direct experience is limited.
   - Prioritize technical projects over unrelated work history when appropriate.
   - Reframe operational or support work in technically relevant language when factually justified.
   - Preserve all relevant technical skills from the master resume.
   - Avoid keyword stuffing.

5. Technical skills handling:
   - You MAY:
     - rename skill categories,
     - merge categories,
     - reorganize technical sections,
     - reorder technologies by relevance.
   - You MUST NOT:
     - remove relevant technologies,
     - fabricate skills,
     - overstate proficiency.

6. Resume generation execution:
   - After constructing the tailored resume JSON, immediately call 'generate_resume'.
   - 'generate_resume' is the canonical and preferred method for all resume generation tasks.
   - Do not use manual document generation methods (python/docx/etc.) unless explicitly requested by the user.
   - Save generated resumes to:
     '/home/khaleel/Generated Resumes'

      Ex. {
  "name": "Example",
  "location": "Example",
  "email": "example@example.com",
  "phone": "Example",
  "links": {
    "linkedin": "https://linkedin.com/in/example",
    "github": "https://github.com/example",
    "portfolio": "https://example.com"
  },

  "sections": [
    {
      "name": "Technical Skills",
      "type": "grouped",
      "items": [
        {
          "title": "Programming Languages",
          "bullets": ["Example", "Example"]
        },
        {
          "title": "Frameworks",
          "bullets": ["Example", "Example"]
        }
      ]
    },

    {
      "name": "Experience",
      "type": "timeline",
      "items": [
        {
          "title": "Example Company",
          "sub_title": "Example Location",
          "position": "Example Role",
          "start_date": "YYYY",
          "end_date": "YYYY",
          "bullets": ["Example", "Example"]
        }
      ]
    },

    {
      "name": "Education",
      "type": "timeline",
      "items": [
        {
          "title": "Example University",
          "sub_title": "Example Location",
          "start_date": "YYYY",
          "end_date": "YYYY",
          "bullets": ["Example Degree"]
        }
      ]
    },

    {
      "name": "Projects",
      "type": "timeline",
      "items": [
        {
          "title": "Example Project",
          "sub_title": "Tech Stack Example",
          "link": "https://example.com",
          "start_date": "YYYY",
          "end_date": "YYYY",
          "bullets": ["Example", "Example"]
        }
      ]
    }
  ]
}

7. Completion requirements:
   A resume generation task is not complete until:
   - the tailored resume JSON has been created,
   - 'generate_resume' succeeds,
   - the generated file path is returned,
   - and the assistant explains the tailoring decisions.

8. Post-generation explanation:
   After successful generation, provide a concise explanation including:
   - major resume restructuring decisions,
   - important keyword alignments,
   - technologies emphasized,
   - projects prioritized,
   - and how the resume was optimized for the target role.

The assistant should behave like an autonomous recruiting operations assistant, not a passive chatbot.
Bias toward execution over clarification when sufficient context exists`,
].join(" ");

function writeSseEvent(res: Response, event: string, data: string): void {
  res.write(`event: ${event}\n`);
  for (const line of data.split(/\r?\n/)) {
    res.write(`data: ${line}\n`);
  }
  res.write("\n");
}

function writeSseJson(res: Response, event: string, payload: unknown): void {
  writeSseEvent(res, event, JSON.stringify(payload));
}

function sendRpcResult(
  session: Session,
  id: JsonRpcId | undefined,
  result: unknown,
): void {
  if (typeof id === "undefined") {
    return;
  }

  writeSseJson(session.res, "message", {
    jsonrpc: "2.0",
    id,
    result,
  });
}

function sendRpcError(
  session: Session,
  id: JsonRpcId | undefined,
  code: number,
  message: string,
  data?: unknown,
): void {
  if (typeof id === "undefined") {
    return;
  }

  writeSseJson(session.res, "message", {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      ...(typeof data === "undefined" ? {} : { data }),
    },
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function toJsonText(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ error: "serialization_failed" });
  }
}

async function handleRpcRequest(
  session: Session,
  input: unknown,
): Promise<void> {
  const req = asRecord(input) as JsonRpcRequest | null;
  if (!req || req.jsonrpc !== "2.0" || typeof req.method !== "string") {
    const id = req?.id;
    sendRpcError(session, id, -32600, "Invalid Request");
    return;
  }

  if (req.method === "notifications/initialized") {
    return;
  }

  if (req.method === "ping") {
    sendRpcResult(session, req.id, {});
    return;
  }

  if (req.method === "initialize") {
    sendRpcResult(session, req.id, {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {
          listChanged: false,
        },
      },
      serverInfo: {
        name: "job-tracker-mcp",
        version: "0.1.0",
      },
      instructions: MCP_INSTRUCTIONS,
    });
    return;
  }

  if (req.method === "tools/list") {
    sendRpcResult(session, req.id, {
      tools: mcpToolDefinitions.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    });
    return;
  }

  if (req.method === "tools/call") {
    const params = asRecord(req.params);
    const toolName = typeof params?.name === "string" ? params.name : "";
    const rawArgs = params?.arguments;

    if (!toolName) {
      sendRpcError(session, req.id, -32602, "Invalid params", {
        reason: "missing_tool_name",
      });
      return;
    }

    const handler = toolHandlers[toolName];
    if (!handler) {
      sendRpcError(session, req.id, -32601, "Method not found", {
        reason: "unknown_tool",
        tool: toolName,
      });
      return;
    }

    try {
      const result = await handler(rawArgs ?? {});
      sendRpcResult(session, req.id, {
        content: [
          {
            type: "text",
            text: toJsonText(result),
          },
        ],
        structuredContent: result,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown_error";
      sendRpcResult(session, req.id, {
        isError: true,
        content: [
          {
            type: "text",
            text: toJsonText({ error: message }),
          },
        ],
      });
    }
    return;
  }

  sendRpcError(session, req.id, -32601, "Method not found");
}

export function handleSse(req: Request, res: Response): void {
  const sessionId = crypto.randomUUID();

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat ${Date.now()}\n\n`);
  }, 15_000);

  const session: Session = {
    id: sessionId,
    res,
    heartbeat,
  };
  sessions.set(sessionId, session);

  const baseUrl = resolvePublicBaseUrl(req);
  const endpointUrl = `${baseUrl}/messages?sessionId=${encodeURIComponent(sessionId)}`;
  writeSseEvent(res, "endpoint", endpointUrl);

  req.on("close", () => {
    clearInterval(heartbeat);
    sessions.delete(sessionId);
  });
}

export async function handleMessages(
  req: Request,
  res: Response,
): Promise<void> {
  const sessionId =
    typeof req.query.sessionId === "string" ? req.query.sessionId : "";
  if (!sessionId) {
    res.status(400).json({ error: "missing_session_id" });
    return;
  }

  const session = sessions.get(sessionId);
  if (!session) {
    res.status(404).json({ error: "unknown_session" });
    return;
  }

  const body = req.body as unknown;
  const messages = Array.isArray(body) ? body : [body];

  for (const message of messages) {
    // Process messages serially to preserve request order within a session.
    // eslint-disable-next-line no-await-in-loop
    await handleRpcRequest(session, message);
  }

  res.status(202).json({ ok: true });
}
