import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test, { after, before } from "node:test";

const { default: Fastify } = await import("fastify");
const { registerIotRoutes } = await import("../src/iot.js");

const controllers = new Map();
const commands = new Map();
const pool = {
  async query(sql, params = []) {
    if (sql.includes("FROM app_records") && sql.includes("entity = 'Site'")) {
      const rows = params[0] === "site-a" ? [{ id: "site-a" }] : [];
      return { rows, rowCount: rows.length };
    }
    if (sql.startsWith("INSERT INTO iot_controllers")) {
      const [controller_id, site_id, label, token_hash] = params;
      controllers.set(controller_id, { controller_id, site_id, label, token_hash, status: "offline", enabled: true });
      return { rows: [] };
    }
    if (sql.includes("FROM iot_controllers") && sql.includes("token_hash = $1")) {
      return { rows: [...controllers.values()].filter((item) => item.token_hash === params[0]) };
    }
    if (sql.includes("FROM iot_controllers") && sql.includes("controller_id = $1")) {
      return { rows: controllers.has(params[0]) ? [controllers.get(params[0])] : [] };
    }
    if (sql.startsWith("INSERT INTO iot_commands")) {
      const [id, controller_id, site_id, requested_by, command, payload] = params;
      commands.set(id, { id, controller_id, site_id, requested_by, command, payload: JSON.parse(payload), status: "queued" });
      return { rows: [] };
    }
    if (sql.includes("WITH next_commands")) {
      const rows = [...commands.values()].filter((item) => item.controller_id === params[0] && item.status === "queued");
      rows.forEach((item) => { item.status = "sent"; });
      return { rows: rows.map(({ id, command, payload }) => ({ id, command, payload })) };
    }
    if (sql.startsWith("UPDATE iot_controllers SET")) {
      const item = controllers.get(params[0]);
      if (item) Object.assign(item, { status: "online", firmware_version: params[1], capabilities: JSON.parse(params[2]) });
      return { rows: [] };
    }
    if (sql.startsWith("UPDATE iot_commands SET")) {
      const item = commands.get(params[0]);
      if (!item || item.controller_id !== params[1] || item.status !== "sent") return { rowCount: 0, rows: [] };
      item.status = params[2];
      return { rowCount: 1, rows: [{ id: item.id }] };
    }
    return { rows: [] };
  },
};

let app;
let farmer;
let admin;

before(async () => {
  app = Fastify();
  app.decorate("pg", pool);
  app.decorate("allowedOrigins", new Set());
  farmer = { id: "farmer-1", role: "farmer", site_ids: ["site-a"] };
  admin = { id: "admin-1", role: "admin", site_ids: [] };
  registerIotRoutes(app, pool, async (request) => { request.user = request.headers["x-test-role"] === "admin" ? admin : farmer; }, () => true);
  await app.ready();
});

after(async () => { await app.close(); });

test("administrator provisions a site-scoped controller and receives a one-time token", async () => {
  const res = await app.inject({ method: "POST", url: "/api/iot/controllers", headers: { "x-test-role": "admin" }, payload: { site_id: "site-a", controller_id: "PK21-ESP32-001", label: "Pokhara 21 ESP32-01" } });
  assert.equal(res.statusCode, 201, res.body);
  const body = res.json();
  assert.match(body.device_token, /^wlms_/);
  assert.equal(controllers.get("PK21-ESP32-001").token_hash, createHash("sha256").update(body.device_token).digest("hex"));
  assert.notEqual(controllers.get("PK21-ESP32-001").token_hash, body.device_token);
});

test("farmer cannot enqueue a command for a controller outside assigned sites", async () => {
  controllers.set("OTHER-ESP32", { controller_id: "OTHER-ESP32", site_id: "site-b", enabled: true });
  const res = await app.inject({ method: "POST", url: "/api/iot/controllers/OTHER-ESP32/commands", payload: { command: "light", action: "on" } });
  assert.equal(res.statusCode, 403);
});

test("electric fence and arbitrary command types are rejected", async () => {
  const res = await app.inject({ method: "POST", url: "/api/iot/controllers/PK21-ESP32-001/commands", payload: { command: "electric_fence", action: "on" } });
  assert.equal(res.statusCode, 403);
});

test("siren duration is bounded to a short supervised pulse", async () => {
  const res = await app.inject({ method: "POST", url: "/api/iot/controllers/PK21-ESP32-001/commands", payload: { command: "siren", action: "pulse", duration_seconds: 60 } });
  assert.equal(res.statusCode, 400);
});

test("device token authenticates heartbeat and command polling", async () => {
  const registered = [...controllers.values()].find((item) => item.controller_id === "PK21-ESP32-001");
  const token = "wlms_test_token_for_device_authentication_123456789";
  registered.token_hash = createHash("sha256").update(token).digest("hex");
  const headers = { authorization: `Bearer ${token}` };
  const heartbeat = await app.inject({ method: "POST", url: "/api/iot/device/heartbeat", headers, payload: { firmware_version: "0.1.0", capabilities: { siren: true, light: true, electric_fence: true } } });
  assert.equal(heartbeat.statusCode, 200, heartbeat.body);
  assert.equal(registered.capabilities.electric_fence, undefined);
  const poll = await app.inject({ method: "GET", url: "/api/iot/device/commands", headers });
  assert.equal(poll.statusCode, 200, poll.body);
  assert.ok(Array.isArray(poll.json().commands));
});

test("device endpoints reject missing credentials", async () => {
  const res = await app.inject({ method: "GET", url: "/api/iot/device/commands" });
  assert.equal(res.statusCode, 401);
});
