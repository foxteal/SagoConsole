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
import alertsRouter from "./routes/alerts";
import updatesRouter from "./routes/updates";
import screensRouter from "./routes/screens";
import proxyRouter from "./routes/proxy";
import rommSorterRouter from "./routes/romm-sorter";
import tdarrCleanupRouter from "./routes/tdarr-cleanup";
import jellyfinRouter from "./routes/jellyfin";
import thresholdsRouter from "./routes/thresholds";
import iconsRouter from "./routes/icons";
import serviceGroupsRouter from "./routes/service-groups";
import alertMonitorsRouter from "./routes/alert-monitors";
import diunRouter from "./routes/diun";
import containerActionsRouter from "./routes/container-actions";
import { ICONS_DIR } from "./routes/icons";
import { pollAlerts, pollSyncthing } from "./services/alerts";

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
app.use(alertsRouter);
app.use(updatesRouter);
app.use(screensRouter);
app.use(proxyRouter);
app.use(rommSorterRouter);
app.use(tdarrCleanupRouter);
app.use(jellyfinRouter);
app.use(thresholdsRouter);
app.use(iconsRouter);
app.use(serviceGroupsRouter);
app.use(alertMonitorsRouter);
app.use(diunRouter);
app.use(containerActionsRouter);

// Serve uploaded icons as static files
app.use("/api/icons", express.static(ICONS_DIR));

// Static files (built client)
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));

// SPA fallback — all non-API routes serve index.html
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// Initialize database on startup
getDb();

// Start alert polling (every 60s)
pollAlerts().catch((err) => console.error("Initial alert poll failed:", err));
setInterval(() => {
  pollAlerts().catch((err) => console.error("Alert poll failed:", err));
}, 60000);

// Syncthing poll on separate 10-minute interval
pollSyncthing().catch((err) => console.error("Initial syncthing poll:", err));
setInterval(() => {
  pollSyncthing().catch((err) => console.error("Syncthing poll failed:", err));
}, 600_000);

app.listen(config.port, () => {
  console.log(`SagoConsole listening on port ${config.port}`);
});
