export const config = {
  port: parseInt(process.env.PORT || "8120", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  dbPath: process.env.DB_PATH || "./data/sagoconsole.db",
  jwtSecret: process.env.JWT_SECRET || "dev-secret-change-me",
  oidc: {
    issuer: process.env.OIDC_ISSUER || "",
    clientId: process.env.OIDC_CLIENT_ID || "",
    clientSecret: process.env.OIDC_CLIENT_SECRET || "",
    redirectUri: process.env.OIDC_REDIRECT_URI || "",
  },
  portainer: {
    url: process.env.PORTAINER_URL || "https://portainer.sagocactus.com",
    apiKey: process.env.PORTAINER_API_KEY || "",
  },
  tugtainer: {
    url: process.env.TUGTAINER_URL || "http://host.docker.internal:9412",
    password: process.env.TUGTAINER_PASSWORD || "",
  },
};
