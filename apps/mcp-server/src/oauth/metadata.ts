import type { Request, Response } from "express";

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function resolvePublicBaseUrl(req: Request): string {
  const forwardedProto = (req.header("x-forwarded-proto") ?? req.protocol ?? "http").split(",")[0]?.trim();
  const forwardedHost = (req.header("x-forwarded-host") ?? req.header("host") ?? "").split(",")[0]?.trim();

  if (!forwardedHost) {
    return "http://127.0.0.1:7331";
  }

  const proto = forwardedProto || "http";
  return stripTrailingSlash(`${proto}://${forwardedHost}`);
}

export function buildProtectedResourceMetadata(req: Request) {
  const baseUrl = resolvePublicBaseUrl(req);
  return {
    resource: `${baseUrl}/sse`,
    authorization_servers: [baseUrl],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp.read"],
  };
}

export function buildAuthorizationServerMetadata(req: Request) {
  const baseUrl = resolvePublicBaseUrl(req);
  return {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth/authorize`,
    token_endpoint: `${baseUrl}/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    token_endpoint_auth_methods_supported: ["client_secret_post"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["mcp.read"],
  };
}

export function handleProtectedResourceMetadata(req: Request, res: Response) {
  return res.json(buildProtectedResourceMetadata(req));
}

export function handleAuthorizationServerMetadata(req: Request, res: Response) {
  return res.json(buildAuthorizationServerMetadata(req));
}

function escapeHeaderValue(input: string): string {
  return input.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function setBearerChallenge(
  req: Request,
  res: Response,
  options: { error?: string; errorDescription?: string } = {},
): void {
  const baseUrl = resolvePublicBaseUrl(req);
  const params: string[] = [
    'realm="job-tracker-mcp"',
    `resource_metadata="${escapeHeaderValue(`${baseUrl}/.well-known/oauth-protected-resource`)}"`,
  ];

  if (options.error) {
    params.push(`error="${escapeHeaderValue(options.error)}"`);
  }

  if (options.errorDescription) {
    params.push(`error_description="${escapeHeaderValue(options.errorDescription)}"`);
  }

  res.setHeader("WWW-Authenticate", `Bearer ${params.join(", ")}`);
}
