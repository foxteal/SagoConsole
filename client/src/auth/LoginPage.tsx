import { useState } from "react";
import { generateCodeVerifier, generateCodeChallenge } from "./pkce";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function redirectToAuth() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/config");
      const { issuer, client_id } = await res.json();

      const wellKnown = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
      const oidcRes = await fetch(wellKnown);
      const oidcConfig = await oidcRes.json();

      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      sessionStorage.setItem("pkce_code_verifier", codeVerifier);

      const params = new URLSearchParams({
        response_type: "code",
        client_id,
        redirect_uri: `${window.location.origin}/auth/callback`,
        scope: "openid email profile",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      });

      window.location.href = `${oidcConfig.authorization_endpoint}?${params}`;
    } catch (err) {
      setLoading(false);
      setError("Failed to initialize authentication");
      console.error("Auth redirect error:", err);
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-bg-deep">
      <div className="text-center">
        <div className="mb-6">
          <img src="/logo.png" alt="SagoConsole" className="w-14 h-14 rounded-xl mx-auto mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">SagoConsole</h1>
          <p className="text-sm text-text-tertiary mt-1">Homelab Dashboard</p>
        </div>
        {error && <p className="text-red text-sm mb-4">{error}</p>}
        <button
          onClick={redirectToAuth}
          disabled={loading}
          className="px-6 py-2.5 bg-accent/15 text-accent font-medium rounded-lg border border-accent/30 hover:bg-accent/25 hover:border-accent/50 active:scale-[0.97] transition-all disabled:opacity-50"
        >
          {loading ? "Redirecting..." : "Sign in with Authentik"}
        </button>
      </div>
    </div>
  );
}
