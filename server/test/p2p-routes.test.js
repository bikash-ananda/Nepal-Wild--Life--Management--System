import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import http from "node:http";
import test, { after, before } from "node:test";

const BRIDGE_PORT = 15087;
process.env.CAMERA_ENCRYPTION_KEY = randomBytes(32).toString("base64");
process.env.CAMERA_P2P_PORT_RANGE = "15080-15099";
process.env.CAMERA_P2P_BRIDGE_HOST = "localhost"; // stands in for the dh-fwd service name
process.env.PGHOST = "127.0.0.1";

const { default: Fastify } = await import("fastify");
const { default: websocket } = await import("@fastify/websocket");
const { registerCameraRoutes } = await import("../src/cameras.js");

const md5 = (value) => createHash("md5").update(value).digest("hex");
const calls = [];

// Fake Dahua camera: HTTP Digest auth, records every CGI call it accepts.
function fakeCamera() {
  return http.createServer((req, res) => {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Digest ")) {
      res.writeHead(401, { "WWW-Authenticate": 'Digest realm="Login to cam", qop="auth", nonce="abc123", opaque="x"' });
      return res.end();
    }
    const fields = Object.fromEntries([...header.slice(7).matchAll(/(\w+)=(?:"([^"]*)"|([^,\s]+))/g)].map((m) => [m[1], m[2] ?? m[3]]));
    const ha1 = md5(`${fields.username}:Login to cam:s3cret`);
    const ha2 = md5(`GET:${fields.uri}`);
    const expected = md5(`${ha1}:${fields.nonce}:${fields.nc}:${fields.cnonce}:${fields.qop}:${ha2}`);
    if (fields.username !== "ctl" || fields.response !== expected) {
      res.writeHead(401);
      return res.end("bad credentials");
    }
    calls.push(req.url);
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(req.url.includes("magicBox") ? "type=DH-P3I-PV\r\n" : "OK\r\n");
  });
}

let camera;
let app;
const tunnels = new Map();
const pool = {
  async query(sql, params = []) {
    if (sql.includes("FROM app_records")) return { rows: [{ id: "cam-1", data: { site_id: "s1", brand: "Dahua", model: "P3I-PV" }, created_at: new Date(), updated_at: new Date() }] };
    if (sql.includes("FROM camera_control_tunnels")) return { rows: tunnels.has(params[0]) ? [tunnels.get(params[0])] : [] };
    if (sql.includes("FROM camera_connections")) return { rows: [] };
    if (sql.startsWith("INSERT INTO camera_control_tunnels")) {
      const [camera_id, bridge_port, username, password_ciphertext, password_iv, password_tag, ptz_enabled, siren_control_enabled, light_control_enabled] = params;
      const row = { camera_id, bridge_port, username, password_ciphertext, password_iv, password_tag, ptz_enabled, siren_control_enabled, light_control_enabled, updated_at: new Date() };
      tunnels.set(camera_id, row);
      return { rows: [row] };
    }
    if (sql.startsWith("DELETE FROM camera_control_tunnels")) { tunnels.delete(params[0]); return { rows: [] }; }
    return { rows: [] };
  },
};

before(async () => {
  camera = fakeCamera();
  await new Promise((resolve) => camera.listen(BRIDGE_PORT, resolve));
  app = Fastify();
  app.decorate("allowedOrigins", new Set());
  await app.register(websocket);
  registerCameraRoutes(app, pool, async (request) => { request.user = { id: "u1", role: "admin", site_ids: [] }; }, () => true);
  await app.ready();
});

after(async () => { await app.close(); camera.close(); });

const send = (method, url, payload) => app.inject({ method, url, payload });

test("saving a profile stores an encrypted password and returns no secret", async () => {
  const res = await send("PUT", "/api/cameras/cam-1/control-tunnel", { bridge_port: BRIDGE_PORT, username: "ctl", password: "s3cret", ptz_enabled: true });
  assert.equal(res.statusCode, 200, res.body);
  const body = res.json();
  assert.equal(body.tunnel.has_password, true);
  assert.equal(JSON.stringify(body).includes("s3cret"), false);
  assert.notEqual(tunnels.get("cam-1").password_ciphertext, "s3cret");
});

test("test endpoint reaches the camera through the bridge with Digest auth", async () => {
  const res = await send("POST", "/api/cameras/cam-1/control-tunnel/test");
  assert.equal(res.statusCode, 200, res.body);
  assert.match(res.json().device, /DH-P3I-PV/);
});

test("PTZ goes through the tunnel and uses the saved profile", async () => {
  const before = calls.length;
  const res = await send("POST", "/api/cameras/cam-1/control/ptz", { action: "start", direction: "Left", speed: 2 });
  assert.equal(res.statusCode, 200, res.body);
  assert.ok(calls.slice(before).some((url) => url.startsWith("/cgi-bin/ptz.cgi?action=start") && url.includes("code=Left")));
  await send("POST", "/api/cameras/cam-1/control/ptz", { action: "stop", direction: "Left", speed: 2 });
});

test("siren/light cannot be enabled or used while the server gate is off", async () => {
  const save = await send("PUT", "/api/cameras/cam-1/control-tunnel", { bridge_port: BRIDGE_PORT, username: "ctl", siren_control_enabled: true });
  assert.equal(save.statusCode, 409);
  tunnels.get("cam-1").siren_control_enabled = true; // simulate a stale row
  const before = calls.length;
  const use = await send("POST", "/api/cameras/cam-1/control/deterrence", { device: "siren", state: "on" });
  assert.equal(use.statusCode, 409);
  assert.equal(calls.length, before, "no command may reach the camera");
  tunnels.get("cam-1").siren_control_enabled = false;
});

test("ports outside the range are rejected", async () => {
  const res = await send("PUT", "/api/cameras/cam-1/control-tunnel", { bridge_port: 5432, username: "ctl", password: "x" });
  assert.equal(res.statusCode, 400);
});

test("wrong camera password fails cleanly", async () => {
  tunnels.set("cam-1", { ...tunnels.get("cam-1") });
  await send("PUT", "/api/cameras/cam-1/control-tunnel", { bridge_port: BRIDGE_PORT, username: "ctl", password: "wrong", ptz_enabled: true });
  const res = await send("POST", "/api/cameras/cam-1/control-tunnel/test");
  assert.equal(res.statusCode, 502);
});
