import assert from "node:assert/strict";
import test from "node:test";
import { bridgeHost, normalizeTunnelProfile, p2pTarget, parsePortRange, privateControlRoute } from "../src/p2p-tunnel.js";

const env = { CAMERA_P2P_PORT_RANGE: "15080-15099" };

test("port range parsing rejects unsafe ranges", () => {
  assert.deepEqual(parsePortRange("15080-15099"), { low: 15080, high: 15099 });
  assert.equal(parsePortRange(""), null);
  assert.equal(parsePortRange("80-90"), null);
  assert.equal(parsePortRange("15000-16000"), null);
  assert.equal(parsePortRange("15099-15080"), null);
});

test("target is a fixed service host and an in-range port only", () => {
  assert.deepEqual(p2pTarget(15081, env), { host: "dh-fwd", port: 15081 });
  assert.throws(() => p2pTarget(5432, env), { statusCode: 403 });
  assert.throws(() => p2pTarget(15081, {}), { statusCode: 503 });
  assert.throws(() => bridgeHost({ CAMERA_P2P_BRIDGE_HOST: "evil.example.com/x" }), { statusCode: 503 });
});

test("profile validation", () => {
  const ok = normalizeTunnelProfile({ bridge_port: 15080, username: "ctl", password: "pw", ptz_enabled: true }, env);
  assert.equal(ok.ptz_enabled, true);
  assert.equal(ok.siren_control_enabled, false);
  assert.throws(() => normalizeTunnelProfile({ bridge_port: 9999, username: "ctl" }, env), { statusCode: 400 });
  assert.throws(() => normalizeTunnelProfile({ bridge_port: 15080, username: "" }, env), { statusCode: 400 });
});

test("siren and light stay off unless the server explicitly allows them", () => {
  const body = { bridge_port: 15080, username: "ctl", password: "pw", siren_control_enabled: true };
  assert.throws(() => normalizeTunnelProfile(body, env), { statusCode: 409 });
  assert.equal(normalizeTunnelProfile(body, { ...env, CAMERA_P2P_DETERRENCE_ENABLED: "true" }).siren_control_enabled, true);
});

test("private route helper", () => {
  assert.equal(privateControlRoute({ network_mode: "p2p_tunnel" }), true);
  assert.equal(privateControlRoute({ network_mode: "vpn_routed" }), true);
  assert.equal(privateControlRoute({ network_mode: "public_forward" }), false);
});
