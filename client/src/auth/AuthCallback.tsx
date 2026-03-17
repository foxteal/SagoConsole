import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function AuthCallback() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setToken } = useAuth();
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;
    exchangeCode();
  }, []);

  async function exchangeCode() {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorParam = params.get("error");
      const errorDesc = params.get("error_description");

      if (errorParam) {
        setError(`Auth error: ${errorParam}${errorDesc ? ` — ${errorDesc}` : ""}`);
        return;
      }

      if (!code) {
        setError("No authorization code received");
        return;
      }

      const codeVerifier = sessionStorage.getItem("pkce_code_verifier");
      if (!codeVerifier) {
        setError("Missing PKCE verifier — please try logging in again");
        return;
      }

      sessionStorage.removeItem("pkce_code_verifier");

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          redirect_uri: `${window.location.origin}/auth/callback`,
          code_verifier: codeVerifier,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        let message = "Login failed";
        try {
          const data = JSON.parse(text);
          message = data.error || message;
        } catch {
          message = `Login failed: ${res.status} ${text}`;
        }
        setError(message);
        return;
      }

      const { access_token } = await res.json();
      await setToken(access_token);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Auth callback error:", err);
      setError(`Authentication failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg-deep">
        <div className="text-center max-w-md px-4">
          <p className="text-red mb-4">{error}</p>
          <a
            href="/login"
            className="px-4 py-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors inline-block"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-bg-deep">
      <div className="text-text-secondary">Completing login...</div>
    </div>
  );
}
