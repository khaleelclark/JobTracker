import type { Request, Response } from "express";
import { createAuthCode } from "./storage";

export async function handleAuthorize(req: Request, res: Response) {
  const clientId = String(req.query.client_id ?? "");
  const redirectUri = String(req.query.redirect_uri ?? "");
  const state = String(req.query.state ?? "");
  const responseType = String(req.query.response_type ?? "");
  const codeChallenge = String(req.query.code_challenge ?? "").trim();
  const codeChallengeMethodRaw = String(req.query.code_challenge_method ?? "").trim();

  if (responseType !== "code") {
    return res.status(400).json({ error: "unsupported_response_type" });
  }

  if (!clientId || clientId !== process.env.OAUTH_CLIENT_ID) {
    return res.status(401).json({ error: "invalid_client" });
  }

  if (!redirectUri) {
    return res.status(400).json({ error: "missing_redirect_uri" });
  }

  let codeChallengeMethod: "S256" | undefined;
  if (codeChallenge) {
    if (!codeChallengeMethodRaw || codeChallengeMethodRaw.toUpperCase() !== "S256") {
      return res.status(400).json({ error: "invalid_request", error_description: "S256 PKCE is required" });
    }
    codeChallengeMethod = "S256";
  }

  const code = await createAuthCode(clientId, redirectUri, {
    codeChallenge: codeChallenge || undefined,
    codeChallengeMethod,
  });
  const redirect = new URL(redirectUri);
  redirect.searchParams.set("code", code);

  if (state) {
    redirect.searchParams.set("state", state);
  }

  return res.redirect(302, redirect.toString());
}
