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
  "Job tracker tools are factual retrieval tools, except for the resume generation workflow.",
  "Use get_master_resume as the master resume source when creating a new resume based on existing resume history.",
  "When the user asks for a generated resume for a job position, first look over the job position details, then call get_master_resume.",
  "After retrieving the master resume, generate a new resume JSON object in the same format that is arranged optimally for the position and omits anything unnecessary for that position.",
  "The tailored resume should be human readable and ATS-friendly.",
  "Then call generate_resume with the tailored JSON to save the PDF to /home/khaleel/Generated Resumes.",
  "Once generation succeeds, explain how the resume was reformatted for the specific position.",
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

function sendRpcResult(session: Session, id: JsonRpcId | undefined, result: unknown): void {
  if (typeof id === "undefined") {
    return;
  }

  writeSseJson(session.res, "message", {
    jsonrpc: "2.0",
    id,
    result,
  });
}

function sendRpcError(session: Session, id: JsonRpcId | undefined, code: number, message: string, data?: unknown): void {
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

async function handleRpcRequest(session: Session, input: unknown): Promise<void> {
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
      tools: mcpToolDefinitions.map((tool) => ({
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
      sendRpcError(session, req.id, -32602, "Invalid params", { reason: "missing_tool_name" });
      return;
    }

    const handler = toolHandlers[toolName];
    if (!handler) {
      sendRpcError(session, req.id, -32601, "Method not found", { reason: "unknown_tool", tool: toolName });
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

export async function handleMessages(req: Request, res: Response): Promise<void> {
  const sessionId = typeof req.query.sessionId === "string" ? req.query.sessionId : "";
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
