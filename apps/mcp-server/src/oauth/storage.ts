import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { resolveOauthStorePath } from "../lib/paths";

interface AuthCodeEntry {
  clientId: string;
  redirectUri: string;
  expiresAt: number;
  codeChallenge?: string;
  codeChallengeMethod?: "S256";
}

interface AccessTokenEntry {
  clientId: string;
  expiresAt: number;
}

interface PersistedStore {
  accessTokens: Record<string, AccessTokenEntry>;
}

const authCodes = new Map<string, AuthCodeEntry>();
let accessTokens: Record<string, AccessTokenEntry> = {};
let loaded = false;

async function ensureLoaded(): Promise<void> {
  if (loaded) {
    return;
  }

  loaded = true;
  try {
    const filePath = resolveOauthStorePath();
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as PersistedStore;
    accessTokens = parsed.accessTokens ?? {};
  } catch {
    accessTokens = {};
  }
}

async function persist(): Promise<void> {
  const filePath = resolveOauthStorePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const payload: PersistedStore = { accessTokens };
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

export async function createAuthCode(
  clientId: string,
  redirectUri: string,
  options: {
    codeChallenge?: string;
    codeChallengeMethod?: "S256";
  } = {},
): Promise<string> {
  await ensureLoaded();

  const code = crypto.randomBytes(24).toString("hex");
  authCodes.set(code, {
    clientId,
    redirectUri,
    expiresAt: Date.now() + 10 * 60 * 1000,
    codeChallenge: options.codeChallenge,
    codeChallengeMethod: options.codeChallengeMethod,
  });

  return code;
}

export async function exchangeAuthCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  codeVerifier?: string;
}): Promise<string | null> {
  await ensureLoaded();

  const entry = authCodes.get(input.code);
  if (!entry) {
    return null;
  }

  authCodes.delete(input.code);

  if (entry.expiresAt < Date.now()) {
    return null;
  }

  if (entry.clientId !== input.clientId || entry.redirectUri !== input.redirectUri) {
    return null;
  }

  if (entry.codeChallenge) {
    if (!input.codeVerifier || !entry.codeChallengeMethod) {
      return null;
    }

    if (entry.codeChallengeMethod === "S256") {
      const digest = crypto.createHash("sha256").update(input.codeVerifier).digest("base64url");
      if (digest !== entry.codeChallenge) {
        return null;
      }
    }
  }

  const accessToken = crypto.randomBytes(24).toString("hex");
  accessTokens[accessToken] = {
    clientId: input.clientId,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };

  await persist();
  return accessToken;
}

export async function validateAccessToken(token: string): Promise<boolean> {
  await ensureLoaded();

  const entry = accessTokens[token];
  if (!entry) {
    return false;
  }

  if (entry.expiresAt < Date.now()) {
    delete accessTokens[token];
    await persist();
    return false;
  }

  return true;
}
