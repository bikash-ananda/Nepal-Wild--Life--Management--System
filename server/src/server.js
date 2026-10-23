import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import nodemailer from "nodemailer";
import { addAudit, migrate, pool } from "./db.js";
import { checkOrigin, registerAuthRoutes, requireAuth, seedAdmin } from "./auth.js";
import { registerFunctionRoutes } from "./functions.js";
import { registerMediaRoutes } from "./media.js";
import { processPushOutbox, registerNotificationRoutes } from "./notifications.js";
import { registerRecordRoutes } from "./records.js";
import { registerCameraRoutes, startCameraEngine } from "./cameras.js";
import { registerAiRoutes } from "./ai.js";
import { registerPublicRoutes } from "./public.js";

const production = process.env.NODE_ENV === "production";
const jwtSecret = process.env.JWT_SECRET || (!production ? "local-development-secret-change-before-deploy" : "");
if (production && (!jwtSecret || jwtSecret.length < 48)) {
  throw new Error("JWT_SECRET must be at least 48 characters in production.");
}
if (production && !process.env.PGPASSWORD) {
  throw new Error("PGPASSWORD must be set in production.");
}
if (production && Buffer.from(String(process.env.CAMERA_ENCRYPTION_KEY || "").trim(), "base64").length !== 32) {
  throw new Error("CAMERA_ENCRYPTION_KEY must be a base64-encoded 32-byte key in production.");
}
if (production && (!process.env.MEDIAMTX_API_USER || String(process.env.MEDIAMTX_API_PASSWORD || "").length < 32)) {
  throw new Error("MEDIAMTX_API_USER and a MEDIAMTX_API_PASSWORD of at least 32 characters are required in production.");
}

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL || (production ? "info" : "debug"), redact: ["req.headers.cookie", "req.headers.authorization", "req.body.password", "req.body.connection.password", "req.body.token"] },
  trustProxy: true,
  bodyLimit: 2 * 1024 * 1024,
});
app.decorate("pg", pool);
const origins = (process.env.APP_ORIGIN || "http://localhost:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);
if (!production) origins.push("http://127.0.0.1:5173", "http://localhost:4173");
app.decorate("allowedOrigins", new Set(origins));

await app.register(cookie);
await app.register(cors, {
  credentials: true,
  origin(origin, callback) {
    if (!origin || app.allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error("Request origin is not allowed."), false);
  },
});
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(jwt, { secret: jwtSecret });
await app.register(rateLimit, { max: 180, timeWindow: "1 minute" });
await app.register(websocket, { options: { maxPayload: 64 * 1024, perMessageDeflate: false } });
await app.register(multipart, {
  limits: { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 20 * 1024 * 1024), files: 1, fields: 12 },
});

app.setErrorHandler((error, request, reply) => {
  if (error.statusCode === 413 || error.code === "FST_REQ_FILE_TOO_LARGE") {
    return reply.code(413).send({ error: "File exceeds the 20 MB upload limit." });
  }
  const status = Number(error.statusCode) >= 400 && Number(error.statusCode) < 600 ? error.statusCode : 500;
  if (status >= 500) request.log.error({ err: error }, "Request failed");
  return reply.code(status).send({ error: status === 500 ? "The server could not complete this request." : error.message });
});

app.get("/api/health", async (_request, reply) => {
  try {
    await pool.query("SELECT 1");
    return { status: "ok", database: "ready", version: process.env.APP_VERSION || "1.0.0" };
  } catch {
    return reply.code(503).send({ status: "degraded", database: "unavailable" });
  }
});

await migrate();
await pool.query("UPDATE notification_deliveries SET status = 'queued' WHERE status = 'sending'");
await seedAdmin(app, pool);
registerAuthRoutes(app, pool);
registerRecordRoutes(app, pool, requireAuth, checkOrigin);
registerMediaRoutes(app, pool, requireAuth, checkOrigin);
registerNotificationRoutes(app, pool, requireAuth, checkOrigin);
registerFunctionRoutes(app, pool, requireAuth, checkOrigin);
registerCameraRoutes(app, pool, requireAuth, checkOrigin);
registerAiRoutes(app, pool, requireAuth, checkOrigin);
registerPublicRoutes(app, pool, requireAuth, checkOrigin);

app.post("/api/integrations/send-email", { preHandler: requireAuth, config: { rateLimit: { max: 10, timeWindow: "1 hour" } } }, async (request, reply) => {
  if (!checkOrigin(request, reply)) return;
  if (!["admin", "researcher"].includes(request.user.role)) return reply.code(403).send({ error: "Researcher access is required." });
  if (!process.env.SMTP_HOST) return reply.code(503).send({ error: "Email delivery is not configured on this server." });
  const { to, subject, body } = request.body || {};
  const recipient = String(to || "").trim();
  const title = String(subject || "").trim().slice(0, 180);
  const message = String(body || "").trim().slice(0, 20000);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) || !title || !message) {
    return reply.code(400).send({ error: "A valid recipient, subject, and message are required." });
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || "" } : undefined,
  });
  await transport.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: recipient, subject: title, text: message });
  await addAudit(request.user.id, "integration.email.sent", null, null, { recipient_domain: recipient.split("@")[1] });
  return { success: true };
});

let pushWorker;
let stopCameraEngine = () => {};
const shutdown = async (signal) => {
  app.log.info({ signal }, "Shutting down API");
  clearInterval(pushWorker);
  await stopCameraEngine();
  await app.close();
  await pool.end();
  process.exit(0);
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

const port = Number(process.env.PORT || 3000);
await app.listen({ port, host: "0.0.0.0" });

stopCameraEngine = startCameraEngine(app, pool);

pushWorker = setInterval(() => {
  processPushOutbox(pool, app.log).catch((error) => app.log.error({ err: error }, "Push worker iteration failed"));
}, 5000);
pushWorker.unref();
