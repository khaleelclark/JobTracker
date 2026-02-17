import { z } from "zod";
import type { Request, Response } from "express";
import { exchangeAuthCode } from "./storage";

const tokenSchema = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string().min(1),
  client_id: z.string().min(1),
  client_secret: z.string().optional().default(""),
  redirect_uri: z.string().min(1),
  code_verifier: z.string().min(1).optional(),
});

export async function handleToken(req: Request, res: Response) {
  const parsed = tokenSchema.safeParse(normalizeBody(req.body));

  if (!parsed.success) {
    return res.status(400).json({ error: "invalid_request", details: parsed.error.flatten() });
  }

  if (parsed.data.client_id !== process.env.OAUTH_CLIENT_ID) {
    return res.status(401).json({ error: "invalid_client" });
  }

  const expectedSecret = process.env.OAUTH_CLIENT_SECRET ?? "";
  if (expectedSecret && parsed.data.client_secret !== expectedSecret) {
    return res.status(401).json({ error: "invalid_client_secret" });
  }

  const accessToken = await exchangeAuthCode({
    code: parsed.data.code,
    clientId: parsed.data.client_id,
    redirectUri: parsed.data.redirect_uri,
    codeVerifier: parsed.data.code_verifier,
  });

  if (!accessToken) {
    return res.status(400).json({ error: "invalid_grant" });
  }

  return res.json({
    token_type: "bearer",
    access_token: accessToken,
    expires_in: 24 * 60 * 60,
  });
}

function normalizeBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== "object") {
    return {};
  }

  return body as Record<string, unknown>;
}
