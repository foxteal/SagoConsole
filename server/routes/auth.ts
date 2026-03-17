import { Router } from "express";
import { config } from "../config";
import { getDb } from "../db";
import { exchangeCodeForTokens, verifyIdToken, signSessionToken, AuthRequest } from "../middleware/auth";

const router = Router();

router.get("/api/auth/config", (_req, res) => {
  res.json({
    issuer: config.oidc.issuer,
    client_id: config.oidc.clientId,
  });
});

router.post("/api/auth/login", async (req, res) => {
  try {
    const { code, redirect_uri, code_verifier } = req.body;

    if (!code || !redirect_uri || !code_verifier) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const tokens = await exchangeCodeForTokens(code, redirect_uri, code_verifier);
    const claims = await verifyIdToken(tokens.id_token);

    const email = claims.email as string;
    const username = (claims.preferred_username as string) || email.split("@")[0];

    const db = getDb();

    // Upsert user
    db.prepare(`
      INSERT INTO users (email, username, last_login)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(email) DO UPDATE SET
        username = excluded.username,
        last_login = datetime('now')
    `).run(email, username);

    const user = db.prepare("SELECT id, email, username FROM users WHERE email = ?").get(email) as {
      id: number;
      email: string;
      username: string;
    };

    const accessToken = await signSessionToken(user);

    res.json({ access_token: accessToken });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Authentication failed" });
  }
});

router.get("/api/auth/me", (req: AuthRequest, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json(req.user);
});

export default router;
