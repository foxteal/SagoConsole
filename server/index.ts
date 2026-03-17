import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import { config } from "./config";
import { getDb } from "./db";
import { authMiddleware } from "./middleware/auth";
import healthRouter from "./routes/health";
import authRouter from "./routes/auth";
import linksRouter from "./routes/links";
import metricsRouter from "./routes/metrics";
import containersRouter from "./routes/containers";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(authMiddleware);

// Routes
app.use(healthRouter);
app.use(authRouter);
app.use(linksRouter);
app.use(metricsRouter);
app.use(containersRouter);

// Static files (built client)
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));

// SPA fallback — all non-API routes serve index.html
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// Initialize database on startup
getDb();

app.listen(config.port, () => {
  console.log(`SagoConsole listening on port ${config.port}`);
});
