import http from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectMongo } from "./db.js";
import { tenantMiddleware } from "./middleware/tenant.js";
import { didAuthMiddleware } from "./middleware/didAuth.js";
import providersRouter from "./routes/providers.js";
import sessionsRouter from "./routes/sessions.js";
import dashboardRouter from "./routes/dashboard.js";
import internalRouter from "./routes/internal.js";
import { attachSignaling } from "./websocket/signaling.js";
import { getRedis } from "./redis.js";
import { config } from "./config.js";
import { Provider } from "./models/provider.js";

async function seedDemoProviders() {
  const n = await Provider.countDocuments({ tenantId: "default" });
  if (n > 0) return;

  const buf = Buffer.alloc(32);
  buf.write("DEMO_PROV_DID_________", 0, "utf8");

  const didB64 = buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await Provider.create({
    providerId: "demo_silas",
    tenantId: "default",
    did: didB64,
    displayName: "Silas Mercer — Attorney at Law",
    bio: "Consultations for Centuries Mutual clients. Anonymous DIDs only; reputation inherits from CM.",
    ratePerSecond: "500",
    maxDurationSec: 3600,
    walletAddress: "0x4200000000000000000000000000000000000006",
    availabilityOnline: true,
  });
}

async function main() {
  await connectMongo();
  try {
    await getRedis().connect();
  } catch {
    // Redis optional for first boot — reputation will fail closed on cache miss+fetch
  }

  await seedDemoProviders();

  const app = express();

  app.use(
    express.json({
      limit: "512kb",
      verify: (req, _res, buf) => {
        (req as express.Request).rawBody = buf.toString("utf8");
      },
    })
  );

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") ?? true,
      exposedHeaders: ["X-Request-Id"],
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "payphone.api" });
  });

  app.use("/internal", internalRouter);

  app.use(tenantMiddleware);
  app.use(didAuthMiddleware);

  app.use("/providers", providersRouter);
  app.use("/sessions", sessionsRouter);
  app.use("/dashboard", dashboardRouter);

  const server = http.createServer(app);
  attachSignaling(server);

  server.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`payphone api listening on :${config.port}`);
  });
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
