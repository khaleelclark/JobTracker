import express from "express";
import cors from "cors";
import { loadProjectEnv } from "./lib/loadEnv";
import { handleAuthorize } from "./oauth/authorize";
import { handleToken } from "./oauth/token";
import { authRequired } from "./oauth/authMiddleware";
import { handleAuthorizationServerMetadata, handleProtectedResourceMetadata } from "./oauth/metadata";
import { handleMessages, handleSse } from "./sse";
import { requiredToolNames, toolHandlers } from "./tools";

loadProjectEnv();

const app = express();
const port = Number(process.env.MCP_PORT ?? 7331);

app.set("trust proxy", true);
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "mcp-server" });
});

app.get(/^\/\.well-known\/oauth-protected-resource(?:\/.*)?$/, handleProtectedResourceMetadata);
app.get(/^\/\.well-known\/oauth-authorization-server(?:\/.*)?$/, handleAuthorizationServerMetadata);

app.get("/oauth/authorize", handleAuthorize);
app.post("/oauth/token", handleToken);

app.get("/sse", authRequired, handleSse);
app.post("/messages", authRequired, handleMessages);

app.get("/mcp/tools", authRequired, (_req, res) => {
  res.json({ tools: requiredToolNames });
});

app.post("/mcp/tools/:toolName", authRequired, async (req, res) => {
  const toolName = req.params.toolName;
  const handler = toolHandlers[toolName];

  if (!handler) {
    return res.status(404).json({ error: "unknown_tool" });
  }

  try {
    const result = await handler(req.body ?? {});
    return res.json({ tool: toolName, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    return res.status(500).json({ error: message });
  }
});

app.listen(port, "127.0.0.1", () => {
  // eslint-disable-next-line no-console
  console.log(`MCP server listening on http://127.0.0.1:${port}`);
});
