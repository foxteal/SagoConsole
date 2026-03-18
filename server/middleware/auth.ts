import { Request, Response, NextFunction } from "express";
import * as jose from "jose";
import { config } from "../config";
import { getDb } from "../db";

let jwks: ReturnType<typeof jose.createRemoteJWKSet> | null = null;
let oidcConfig: { token_endpoint: string; jwks_uri: string; issuer: string } | null = null;

async function getOidcConfig() {
  if (oidcConfig) return oidcConfig;

  const wellKnown = `${config.oidc.issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
  const res = await fetch(wellKnown);
  if (!res.ok) throw new Error(`OIDC discovery failed: ${res.status}`);
  oidcConfig = await res.json() as typeof oidcConfig;
  return oidcConfig!;
}

function getJwks() {
  if (jwks) return jwks;
  // JWKS will be initialized on first use after OIDC discovery
  return null;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<{ id_token: string; access_token: string }> {
  const oidc = await getOidcConfig();

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: config.oidc.clientId,
    client_secret: config.oidc.clientSecret,
    code_verifier: codeVerifier,
  });

  const res = await fetch(oidc.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed: ${res.status} ${text}`);
  }

  return await res.json() as { id_token: string; access_token: string };
}

export async function verifyIdToken(idToken: string): Promise<jose.JWTPayload> {
  const oidc = await getOidcConfig();

  if (!jwks) {
    jwks = jose.createRemoteJWKSet(new URL(oidc.jwks_uri));
  }

  const { payload } = await jose.jwtVerify(idToken, jwks, {
    issuer: oidc.issuer,
    audience: config.oidc.clientId,
  });

  return payload;
}

export async function signSessionToken(user: { id: number; email: string; username: string }): Promise<string> {
  const secret = new TextEncoder().encode(config.jwtSecret);

  return await new jose.SignJWT({ sub: String(user.id), email: user.email, username: user.username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secret);
}

export interface AuthRequest extends Request {
  user?: { id: number; email: string; username: string };
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  // Skip auth for public routes
  if (req.path === "/api/health" || req.path === "/api/auth/config" || req.path === "/api/auth/login" || req.path === "/api/diun/webhook" || (req.path.startsWith("/api/icons/") && req.method === "GET")) {
    next();
    return;
  }

  // Only protect /api routes
  if (!req.path.startsWith("/api/")) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing authorization" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const secret = new TextEncoder().encode(config.jwtSecret);
    const { payload } = await jose.jwtVerify(token, secret);
    req.user = {
      id: parseInt(payload.sub!, 10),
      email: payload.email as string,
      username: payload.username as string,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
