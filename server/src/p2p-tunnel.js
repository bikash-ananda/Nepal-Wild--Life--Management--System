// Helpers for the dh-fwd P2P control tunnel.
//
// The API never connects to an arbitrary host for these cameras. The host is a fixed
// Docker service name (the dh-fwd bridge) and only a port inside an operator-defined
// range can be chosen, so a camera record cannot be pointed at other internal services.

function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

export function parsePortRange(value) {
  const match = /^(\d{4,5})-(\d{4,5})$/.exec(String(value || "").trim());
  if (!match) return null;
  const low = Number(match[1]);
  const high = Number(match[2]);
  if (low < 1024 || high > 65535 || low > high || high - low > 199) return null;
  return { low, high };
}

export function bridgeHost(env = process.env) {
  const host = String(env.CAMERA_P2P_BRIDGE_HOST || "dh-fwd").trim();
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i.test(host)) {
    throw httpError(503, "CAMERA_P2P_BRIDGE_HOST must be a single Docker service name.");
  }
  return host;
}

export function p2pEnabled(env = process.env) {
  return parsePortRange(env.CAMERA_P2P_PORT_RANGE) !== null;
}

export function deterrenceAllowed(env = process.env) {
  return String(env.CAMERA_P2P_DETERRENCE_ENABLED || "").toLowerCase() === "true";
}

export function p2pTarget(port, env = process.env) {
  const range = parsePortRange(env.CAMERA_P2P_PORT_RANGE);
  if (!range) throw httpError(503, "The P2P control tunnel is not enabled on this server.");
  const value = Number(port);
  if (!Number.isInteger(value) || value < range.low || value > range.high) {
    throw httpError(403, "That tunnel port is outside the range allowed for P2P camera control.");
  }
  return { host: bridgeHost(env), port: value };
}

export function normalizeTunnelProfile(input, env = process.env) {
  const body = input && typeof input === "object" ? input : {};
  const range = parsePortRange(env.CAMERA_P2P_PORT_RANGE);
  if (!range) throw httpError(503, "The P2P control tunnel is not enabled on this server.");
  const bridgePort = Number(body.bridge_port);
  if (!Number.isInteger(bridgePort) || bridgePort < range.low || bridgePort > range.high) {
    throw httpError(400, `Choose a tunnel port between ${range.low} and ${range.high}.`);
  }
  const username = String(body.username || "");
  const password = String(body.password || "");
  if (!username || username.length > 128 || password.length > 256 || /[\r\n]/.test(username + password)) {
    throw httpError(400, "Enter the camera control account name; the account or password is too long or invalid.");
  }
  const profile = {
    bridge_port: bridgePort,
    username,
    password,
    ptz_enabled: body.ptz_enabled === true,
    siren_control_enabled: body.siren_control_enabled === true,
    light_control_enabled: body.light_control_enabled === true,
  };
  if ((profile.siren_control_enabled || profile.light_control_enabled) && !deterrenceAllowed(env)) {
    throw httpError(409, "Manual siren/light control is disabled on this server (CAMERA_P2P_DETERRENCE_ENABLED). Update the study protocol and AGENTS.md before enabling it.");
  }
  return profile;
}

export function privateControlRoute(connection) {
  return connection?.network_mode === "vpn_routed" || connection?.network_mode === "p2p_tunnel";
}
