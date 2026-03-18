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
  diun: {
    webhookToken: process.env.DIUN_WEBHOOK_TOKEN || "",
  },
  backrest: {
    url: process.env.BACKREST_URL || "http://host.docker.internal:9898",
    username: process.env.BACKREST_USERNAME || "skip",
    password: process.env.BACKREST_PASSWORD || "",
  },
  syncthing: {
    url: process.env.SYNCTHING_URL || "http://host.docker.internal:8384",
    apiKey: process.env.SYNCTHING_API_KEY || "",
  },
};
