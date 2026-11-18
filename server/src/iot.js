import { createHash, randomBytes, randomUUID } from "node:crypto";
import { addAudit } from "./db.js";

const farmerRoles = new Set(["farmer", "field_officer", "field_worker", "community_reporter", "technician"]);
const allowedCommands = new Set(["siren", "light"]);

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function canAccessSite(user, siteId) {
  return ["admin", "researcher"].includes(user.role)
    || (user.site_ids || []).map(String).includes(String(siteId));
}

function requireManager(user) {
  if (!["admin", "technician"].includes(user.role)) {
    throw Object.assign(new Error("Administrator or technician access is required."), { statusCode: 403 });
  }
}

async function authenticateDevice(request, reply) {
  const header = String(request.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (token.length < 32) return reply.code(401).send({ error: "Device authentication required." });
  const result = await request.server.pg.query(
    "SELECT controller_id, site_id, enabled FROM iot_controllers WHERE token_hash = $1",
    [hashToken(token)]
  );
  const controller = result.rows[0];
  if (!controller || !controller.enabled) return reply.code(401).send({ error: "Device credential is invalid or disabled." });
  request.iotController = controller;
}

export function registerIotRoutes(app, pool, requireAuth, checkOrigin) {
  // Provision a controller. The high-entropy token is shown only once and only its hash is stored.
  app.post("/api/iot/controllers", { preHandler: requireAuth }, async (request, reply) => {
    if (!checkOrigin(request, reply)) return;
    requireManager(request.user);
    const body = request.body || {};
    const siteId = String(body.site_id || "").trim();
    const label = String(body.label || "").trim().slice(0, 100);
    const controllerId = String(body.controller_id || randomUUID()).trim().slice(0, 100);
    if (!siteId || !label || !controllerId) return reply.code(400).send({ error: "Site, controller ID, and label are required." });
    if (!canAccessSite(request.user, siteId)) return reply.code(403).send({ error: "You cannot provision a controller for this site." });
    const site = await pool.query("SELECT id FROM app_records WHERE entity = 'Site' AND id = $1", [siteId]);
    if (!site.rowCount) return reply.code(400).send({ error: "Selected site does not exist." });
    const token = `wlms_${randomBytes(32).toString("base64url")}`;
    try {
      await pool.query(
        "INSERT INTO iot_controllers (controller_id, site_id, label, token_hash, created_by) VALUES ($1, $2, $3, $4, $5)",
        [controllerId, siteId, label, hashToken(token), request.user.id]
      );
    } catch (error) {
      if (error.code === "23505") return reply.code(409).send({ error: "Controller ID is already registered." });
      throw error;
    }
    await addAudit(request.user.id, "iot.controller.provision", "IotController", controllerId, { site_id: siteId });
    return reply.code(201).send({
      controller: { controller_id: controllerId, site_id: siteId, label, status: "offline" },
      device_token: token,
      warning: "Copy this token now. It cannot be retrieved later.",
    });
  });

  app.get("/api/iot/controllers", { preHandler: requireAuth }, async (request) => {
    const params = [];
    let where = "WHERE enabled = true";
    if (!["admin", "researcher"].includes(request.user.role)) {
      params.push((request.user.site_ids || []).map(String));
      where += " AND site_id = ANY($1::text[])";
    }
    const result = await pool.query(
      `SELECT controller_id, site_id, label, firmware_version, CASE WHEN status = 'disabled' THEN 'disabled' WHEN last_seen_at IS NULL OR last_seen_at < now() - interval '90 seconds' THEN 'offline' ELSE 'online' END AS status, last_seen_at, capabilities, created_at FROM iot_controllers ${where} ORDER BY created_at DESC`,
      params
    );
    return result.rows;
  });

  app.post("/api/iot/controllers/:controllerId/commands", {
    preHandler: requireAuth,
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
  }, async (request, reply) => {
    if (!checkOrigin(request, reply)) return;
    const body = request.body || {};
    const command = String(body.command || "");
    const action = String(body.action || "");
    const controllerId = String(request.params.controllerId || "");
    if (!allowedCommands.has(command)) {
      return reply.code(403).send({ error: "This command is not enabled. Electric-fence and high-voltage commands are disabled in this pilot." });
    }
    if (!farmerRoles.has(request.user.role) && !["admin", "researcher"].includes(request.user.role)) {
      return reply.code(403).send({ error: "Your account cannot operate farm devices." });
    }
    if (command === "siren" && (action !== "pulse" || !Number.isInteger(Number(body.duration_seconds))
      || Number(body.duration_seconds) < 1 || Number(body.duration_seconds) > 10)) {
      return reply.code(400).send({ error: "Siren command must be a 1–10 second supervised pulse." });
    }
    if (command === "light" && !["on", "off"].includes(action)) {
      return reply.code(400).send({ error: "Light action must be on or off." });
    }
    const result = await pool.query(
      "SELECT controller_id, site_id, status, last_seen_at FROM iot_controllers WHERE controller_id = $1 AND enabled = true",
      [controllerId]
    );
    const controller = result.rows[0];
    if (!controller) return reply.code(404).send({ error: "Controller not found." });
    if (!canAccessSite(request.user, controller.site_id)) return reply.code(403).send({ error: "You do not have access to this farm." });
    if (!controller.last_seen_at || Date.now() - new Date(controller.last_seen_at).getTime() > 90000) return reply.code(409).send({ error: "Controller is offline. No command was queued." });
    const id = randomUUID();
    const payload = command === "siren"
      ? { command, action, duration_seconds: Number(body.duration_seconds) }
      : { command, action };
    await pool.query(
      "INSERT INTO iot_commands (id, controller_id, site_id, requested_by, command, payload, status, expires_at) VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'queued', now() + interval '30 seconds')",
      [id, controllerId, controller.site_id, request.user.id, command, JSON.stringify(payload)]
    );
    await addAudit(request.user.id, "iot.command.queued", "IotCommand", id, { controller_id: controllerId, command, action });
    return reply.code(202).send({ command_id: id, status: "queued", expires_in_seconds: 30 });
  });

  app.get("/api/iot/commands/:commandId", { preHandler: requireAuth }, async (request, reply) => {
    await pool.query(
      "UPDATE iot_commands SET status = 'expired' WHERE id = $1 AND status IN ('queued', 'sent') AND expires_at <= now()",
      [request.params.commandId]
    );
    const result = await pool.query(
      "SELECT id AS command_id, controller_id, site_id, command, status, result_code, created_at, delivered_at, completed_at FROM iot_commands WHERE id = $1",
      [request.params.commandId]
    );
    const command = result.rows[0];
    if (!command) return reply.code(404).send({ error: "Command not found." });
    if (!canAccessSite(request.user, command.site_id)) return reply.code(403).send({ error: "You do not have access to this farm." });
    return command;
  });

  // ESP32 polling endpoint. Commands are short-lived and are delivered at most once.
  app.get("/api/iot/device/commands", { preHandler: authenticateDevice }, async (request) => {
    const controller = request.iotController;
    const result = await pool.query(
      `WITH expired_commands AS (
         UPDATE iot_commands SET status = 'expired'
         WHERE controller_id = $1 AND status IN ('queued', 'sent') AND expires_at <= now()
       ), next_commands AS (
         SELECT id FROM iot_commands
         WHERE controller_id = $1 AND status = 'queued' AND expires_at > now()
         ORDER BY created_at ASC LIMIT 5
         FOR UPDATE SKIP LOCKED
       )
       UPDATE iot_commands c SET status = 'sent', delivered_at = now()
       FROM next_commands n WHERE c.id = n.id
       RETURNING c.id, c.command, c.payload, c.expires_at`,
      [controller.controller_id]
    );
    return { commands: result.rows };
  });

  app.post("/api/iot/device/heartbeat", { preHandler: authenticateDevice }, async (request, reply) => {
    const body = request.body || {};
    const firmware = String(body.firmware_version || "").slice(0, 80);
    const capabilities = body.capabilities && typeof body.capabilities === "object" && !Array.isArray(body.capabilities)
      ? Object.fromEntries(Object.entries(body.capabilities).filter(([key, value]) =>
          ["siren", "light", "sensors"].includes(key) && typeof value === "boolean"))
      : {};
    await pool.query(
      "UPDATE iot_controllers SET status = 'online', firmware_version = $2, capabilities = $3::jsonb, last_seen_at = now(), updated_at = now() WHERE controller_id = $1",
      [request.iotController.controller_id, firmware, JSON.stringify(capabilities)]
    );
    return reply.code(200).send({ success: true, server_time: new Date().toISOString() });
  });

  app.post("/api/iot/device/commands/:commandId/ack", { preHandler: authenticateDevice }, async (request, reply) => {
    const outcome = String(request.body?.outcome || "");
    if (!["acknowledged", "failed"].includes(outcome)) return reply.code(400).send({ error: "Outcome must be acknowledged or failed." });
    const result = await pool.query(
      "UPDATE iot_commands SET status = $3, completed_at = now(), result_code = $4 WHERE id = $1 AND controller_id = $2 AND status = 'sent' AND expires_at > now() RETURNING id",
      [request.params.commandId, request.iotController.controller_id, outcome, String(request.body?.result_code || "").slice(0, 80)]
    );
    if (!result.rowCount) return reply.code(404).send({ error: "Command not found, expired, or already completed." });
    return { success: true };
  });
}
