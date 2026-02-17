import type { NextFunction, Request, Response } from "express";
import { validateAccessToken } from "./storage";
import { setBearerChallenge } from "./metadata";

export async function authRequired(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("authorization") ?? "";

  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    setBearerChallenge(req, res, {
      error: "invalid_token",
      errorDescription: "Missing bearer token",
    });
    return res.status(401).json({ error: "missing_bearer_token" });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  const valid = await validateAccessToken(token);

  if (!valid) {
    setBearerChallenge(req, res, {
      error: "invalid_token",
      errorDescription: "Invalid or expired token",
    });
    return res.status(401).json({ error: "invalid_or_expired_token" });
  }

  return next();
}
