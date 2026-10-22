import { createCipheriv, createDecipheriv, randomUUID, timingSafeEqual } from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";
import { addAudit } from "./db.js";
import { canReadSite, getRecord } from "./records.js";

const managerRoles = new Set(["admin", "technician"]);
const viewerRoles = new Set(["admin", "researcher", "reviewer", "technician"]);
const mediaApiBase = () => process.env.MEDIAMTX_API_URL || "http://mediamtx:9997";

function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

function requireManager(user) {
  if (!managerRoles.has(user.role)) throw httpError(403, "Administrator or technician access is required.");
}

function encryptionKey() {
  const value = String(process.env.CAMERA_ENCRYPTION_KEY || "").trim();
  const key = Buffer.from(value, "base64");
  if (key.length !== 32) throw httpError(503, "Camera setup is unavailable until the server encryption key is configured.");
  return key;
}

function encryptPassword(password) {
  const iv = randomUUID().replaceAll("-", "").slice(0, 24);
  const ivBuffer = Buffer.from(iv, "hex");
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), ivBuffer);
  const ciphertext = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv, tag: cipher.getAuthTag().toString("base64") };
}

function decryptPassword(row) {
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(row.password_iv, "hex"));
  decipher.setAuthTag(Buffer.from(row.password_tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(row.password_ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

function normalizeHost(value) {
  let host = String(value || "").trim();
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  if (!host || host.length > 253 || /[\s/@?#\\]/.test(host)) throw httpError(400, "Enter a public IP/DDNS host or a VPN-routed camera address.");
  const ipVersion = net.isIP(host);
  if (!ipVersion && (!host.includes(".") || !/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(host))) {
    throw httpError(400, "Enter a valid IP address or fully qualified hostname.");
  }
  const lowered = host.toLowerCase();
  if (["localhost", "metadata.google.internal"].includes(lowered) || lowered.endsWith(".localhost") || lowered.endsWith(".local") || lowered.endsWith(".internal")) {
    throw httpError(400, "That hostname cannot be used as a camera address.");
  }
  return host;
}

function ip4Number(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null;
  return (((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3]) >>> 0;
}

function inCidrV4(ip, cidr) {
  const [network, rawPrefix] = String(cidr).split("/");
  const ipNumber = ip4Number(ip);
  const networkNumber = ip4Number(network);
  const prefix = rawPrefix === undefined ? 32 : Number(rawPrefix);
  if (ipNumber === null || networkNumber === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (ipNumber & mask) === (networkNumber & mask);
}

function isPublicV4(ip) {
  const denied = [
    "0.0.0.0/8", "10.0.0.0/8", "100.64.0.0/10", "127.0.0.0/8", "169.254.0.0/16",
    "172.16.0.0/12", "192.0.0.0/24", "192.0.2.0/24", "192.168.0.0/16",
    "198.18.0.0/15", "198.51.100.0/24", "203.0.113.0/24", "224.0.0.0/4", "240.0.0.0/4",
  ];
  return ip4Number(ip) !== null && !denied.some((cidr) => inCidrV4(ip, cidr));
}

function isPublicV6(ip) {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb") || lower.startsWith("ff")) return false;
  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice(7);
    return net.isIP(mapped) === 4 && isPublicV4(mapped);
  }
  const first = Number.parseInt(lower.split(":")[0] || "0", 16);
  return first >= 0x2000 && first <= 0x3fff && !lower.startsWith("2001:db8:");
}

async function validateNetworkTarget(connection) {
  const host = normalizeHost(connection.host);
  let addresses;
  try {
    addresses = net.isIP(host) ? [{ address: host, family: net.isIP(host) }] : await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    throw httpError(400, "The camera host could not be resolved. Check the address/DDNS name and try again.");
  }
  if (!addresses.length) throw httpError(400, "The camera host has no reachable address.");

  if (connection.network_mode === "public_forward") {
    if (addresses.some(({ address, family }) => !(family === 4 ? isPublicV4(address) : isPublicV6(address)))) {
      throw httpError(400, "Public/DDNS mode must resolve to public internet addresses. Select VPN route for a private camera address.");
    }
    return host;
  }

  const allowedCidrs = String(process.env.CAMERA_VPN_CIDRS || "").split(",").map((entry) => entry.trim()).filter(Boolean);
  if (!allowedCidrs.length) throw httpError(503, "VPN camera routes are not enabled on the server. Ask the administrator to add this farm network to CAMERA_VPN_CIDRS.");
  if (addresses.some(({ address, family }) => family !== 4 || !allowedCidrs.some((cidr) => inCidrV4(address, cidr)))) {
    throw httpError(400, "The camera address is outside the VPN networks configured on the server.");
  }
  return host;
}

function normalizeConnection(value) {
  const input = value && typeof value === "object" ? value : {};
  const networkMode = String(input.network_mode || "");
  if (!new Set(["public_forward", "vpn_routed"]).has(networkMode)) {
    throw httpError(400, "Choose public/DDNS port forwarding or a VPN-routed camera connection.");
  }
  const protocol = String(input.protocol || "rtsp").toLowerCase();
  if (!new Set(["rtsp", "rtsps", "http", "https"]).has(protocol)) throw httpError(400, "Choose RTSP, RTSPS, HLS over HTTP, or HLS over HTTPS.");
  const port = Number(input.port || 554);
  if (!Number.isInteger(port) || port < 1 || port > 65535 || (port < 1024 && ![80, 443, 554, 322].includes(port))) {
    throw httpError(400, "Enter a valid camera or forwarded stream port (554 RTSP, 80 HTTP, 443 HTTPS are common defaults).");
  }
  const streamPath = String(input.stream_path || "").trim();
  if (!streamPath.startsWith("/") || streamPath.startsWith("//") || streamPath.length > 512 || /[\s\\#]/.test(streamPath)) {
    throw httpError(400, "Enter the camera's stream path beginning with /, without a host or credentials. Query parameters are allowed.");
  }
  if (/[\r\n]/.test(streamPath)) throw httpError(400, "The stream path contains an invalid character.");
  const username = String(input.username || "");
  const password = String(input.password || "");
  if (username.length > 128 || password.length > 256 || /[\r\n]/.test(username + password)) {
    throw httpError(400, "Camera username or password is too long or contains invalid characters.");
  }
  const transport = String(input.rtsp_transport || "tcp").toLowerCase();
  if (!new Set(["tcp", "udp"]).has(transport)) throw httpError(400, "Choose TCP or UDP transport.");
  const networkLabel = String(input.network_label || "").trim();
  if (!networkLabel || networkLabel.length > 120) throw httpError(400, "Name this camera's router or network route (for example, Farm North / Router 1).");

  return {
    network_mode: networkMode,
    network_label: networkLabel,
    protocol,
    host: normalizeHost(input.host),
    port,
    stream_path: streamPath,
    username,
    password,
    allow_no_auth: input.allow_no_auth === true,
    rtsp_transport: transport,
  };
}

function sourceUrl(connection) {
  const host = net.isIPv6(connection.host) ? `[${connection.host}]` : connection.host;
  const url = new URL(`${connection.protocol}://${host}:${connection.port}${connection.stream_path}`);
  url.username = connection.username;
  url.password = connection.password;
  return url.toString();
}

async function mediaRequest(path, options = {}, timeoutMs = 2500) {
  const serviceUser = String(process.env.MEDIAMTX_API_USER || "");
  const servicePassword = String(process.env.MEDIAMTX_API_PASSWORD || "");
  if (!serviceUser || servicePassword.length < 32) throw httpError(503, "The private camera service credentials are not configured on the server.");
  try {
    return await fetch(new URL(path, mediaApiBase()), {
      ...options,
      headers: {
        Authorization: `Basic ${Buffer.from(`${serviceUser}:${servicePassword}`).toString("base64")}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw httpError(503, "The camera streaming service is unavailable. Start or check the MediaMTX service on the VPS.");
  }
}

async function writeMediaPath(pathName, connection, onDemand) {
  const body = {
    source: sourceUrl(connection),
    sourceOnDemand: onDemand,
    sourceOnDemandStartTimeout: "12s",
    sourceOnDemandCloseAfter: "30s",
  };
  if (["rtsp", "rtsps"].includes(connection.protocol)) body.rtspTransport = connection.rtsp_transport;
  const encodedName = encodeURIComponent(pathName);
  const current = await mediaRequest(`/v3/config/paths/get/${encodedName}`);
  const action = current.ok ? "replace" : "add";
  const response = await mediaRequest(`/v3/config/paths/${action}/${encodedName}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) throw httpError(502, "MediaMTX could not apply this camera path. Check its service status and camera stream details.");
}

async function deleteMediaPath(pathName) {
  const response = await mediaRequest(`/v3/config/paths/delete/${encodeURIComponent(pathName)}`, { method: "DELETE" });
  if (!response.ok && response.status !== 404) throw httpError(502, "MediaMTX could not remove the camera path.");
}

async function probeWithMediaMTX(connection) {
  await validateNetworkTarget(connection);
  const testName = `probe_${randomUUID().replaceAll("-", "")}`;
  let applied = false;
  try {
    await writeMediaPath(testName, connection, false);
    applied = true;
    const deadline = Date.now() + Math.max(5000, Math.min(15000, Number(process.env.CAMERA_TEST_TIMEOUT_MS || 10000)));
    while (Date.now() < deadline) {
      const response = await mediaRequest(`/v3/paths/get/${encodeURIComponent(testName)}`);
      if (response.ok) {
        const status = await response.json().catch(() => ({}));
        if (status.online === true) {
          return { success: true, message: "Camera stream reached the VPS and MediaMTX received video/audio tracks.", tracks: status.tracks2?.length || status.tracks?.length || 0 };
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw httpError(502, "The VPS could not read this camera stream yet. Check the router route, port, credentials, stream path, and codec.");
  } finally {
    if (applied) await deleteMediaPath(testName).catch(() => {});
  }
}

function safeConnection(row, online = null) {
  return {
    configured: Boolean(row),
    network_mode: row?.network_mode || null,
    network_label: row?.network_label || "",
    host: row?.host || "",
    port: row?.port || null,
    protocol: row?.protocol || "",
    stream_path: row?.stream_path || "",
    username: row?.username || "",
    rtsp_transport: row?.rtsp_transport || "tcp",
    has_password: Boolean(row?.password_ciphertext),
    state: row?.state || "not_configured",
    last_test_status: row?.last_test_status || "never",
    last_test_at: row?.last_test_at || null,
    last_applied_at: row?.last_applied_at || null,
    last_error: row?.last_error || "",
    path_name: row?.path_name || "",
    whep_url: row ? `/media/${row.path_name}/whep` : "",
    online,
  };
}

async function authorizedCamera(pool, user, cameraId) {
  const camera = await getRecord(pool, "Camera", cameraId);
  if (!camera) throw httpError(404, "Camera not found.");
  if (!camera.site_id || !canReadSite(user, camera)) throw httpError(403, "You do not have access to this camera's site.");
  return camera;
}

async function connectionFor(pool, cameraId) {
  const result = await pool.query("SELECT * FROM camera_connections WHERE camera_id = $1", [cameraId]);
  return result.rows[0] || null;
}

function makePathName(cameraId) {
  return `cam_${String(cameraId).replace(/[^a-z0-9]/gi, "").slice(0, 36)}`;
}

async function saveConnection(pool, camera, connection, userId, previous = null) {
  const password = connection.allow_no_auth ? "" : (connection.password || (previous ? decryptPassword(previous) : ""));
  const encrypted = encryptPassword(password);
  const pathName = previous?.path_name || makePathName(camera.id);
  const result = await pool.query(
    `INSERT INTO camera_connections (
       camera_id, site_id, path_name, network_mode, network_label, protocol, host, port, stream_path,
       username, password_ciphertext, password_iv, password_tag, rtsp_transport, state,
       last_test_status, last_test_at, configured_by, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'configured','passed',now(),$15,now(),now())
     ON CONFLICT (camera_id) DO UPDATE SET site_id=EXCLUDED.site_id, network_mode=EXCLUDED.network_mode,
       network_label=EXCLUDED.network_label, protocol=EXCLUDED.protocol, host=EXCLUDED.host, port=EXCLUDED.port,
       stream_path=EXCLUDED.stream_path, username=EXCLUDED.username, password_ciphertext=EXCLUDED.password_ciphertext,
       password_iv=EXCLUDED.password_iv, password_tag=EXCLUDED.password_tag, rtsp_transport=EXCLUDED.rtsp_transport,
       enabled=true, state='configured', last_test_status='passed', last_test_at=now(), last_error='',
       configured_by=EXCLUDED.configured_by, updated_at=now()
     RETURNING *`,
    [camera.id, String(camera.site_id), pathName, connection.network_mode, connection.network_label,
      connection.protocol, connection.host, connection.port, connection.stream_path, connection.username,
      encrypted.ciphertext, encrypted.iv, encrypted.tag, connection.rtsp_transport, userId]
  );
  return result.rows[0];
}

async function markApply(pool, cameraId, state, message = "") {
  await pool.query(
    "UPDATE camera_connections SET state=$2, last_error=$3, last_applied_at=CASE WHEN $2='configured' THEN now() ELSE last_applied_at END, updated_at=now() WHERE camera_id=$1",
    [cameraId, state, String(message).slice(0, 300)]
  );
}

async function applyStoredConnection(pool, row) {
  const connection = {
    ...row,
    password: decryptPassword(row),
  };
  await writeMediaPath(row.path_name, connection, true);
  await markApply(pool, row.camera_id, "configured", "");
}

async function listCameraStatuses(app, pool, user) {
  const cameras = await pool.query(
    `SELECT r.id, r.data, c.path_name, c.state, c.network_label, c.last_test_status, c.last_test_at, c.last_applied_at, c.last_error
     FROM app_records r LEFT JOIN camera_connections c ON c.camera_id = r.id
     WHERE r.entity='Camera' ORDER BY r.created_at DESC LIMIT 1000`
  );
  const visible = cameras.rows.filter((row) => canReadSite(user, { ...row.data, id: row.id }));
  let onlinePaths = new Set();
  const pathResponse = await mediaRequest("/v3/paths/list?itemsPerPage=1000").catch(() => null);
  if (pathResponse?.ok) {
    const payload = await pathResponse.json().catch(() => ({}));
    onlinePaths = new Set((payload.items || []).filter((path) => path.online).map((path) => path.name));
  }
  return visible.map((row) => ({
    camera_id: row.id,
    configured: Boolean(row.path_name),
    network_label: row.network_label || "",
    state: row.state || "not_configured",
    online: row.path_name ? onlinePaths.has(row.path_name) : false,
    last_test_status: row.last_test_status || "never",
    last_test_at: row.last_test_at,
    last_applied_at: row.last_applied_at,
    last_error: row.last_error || "",
    media_service_available: Boolean(pathResponse?.ok),
  }));
}

export function registerCameraRoutes(app, pool, requireAuth, checkOrigin) {
  app.get("/api/cameras/status", { preHandler: requireAuth }, async (request) => ({ cameras: await listCameraStatuses(app, pool, request.user) }));

  app.get("/api/cameras/:id/connection", { preHandler: requireAuth }, async (request, reply) => {
    requireManager(request.user);
    reply.header("Cache-Control", "no-store");
    await authorizedCamera(pool, request.user, request.params.id);
    const row = await connectionFor(pool, request.params.id);
    if (!row) return { connection: safeConnection(null) };
    const status = await mediaRequest(`/v3/paths/get/${encodeURIComponent(row.path_name)}`).catch(() => null);
    const pathStatus = status?.ok ? await status.json().catch(() => ({})) : {};
    return { connection: safeConnection(row, pathStatus.online === true) };
  });

  app.post("/api/cameras/test-connection", {
    preHandler: requireAuth,
    config: { rateLimit: { max: 8, timeWindow: "10 minutes" } },
  }, async (request, reply) => {
    requireManager(request.user);
    if (!checkOrigin(request, reply)) return;
    const body = request.body || {};
    const site = await getRecord(pool, "Site", String(body.site_id || ""));
    if (!site) return reply.code(400).send({ error: "Select an existing research site first." });
    if (!canReadSite(request.user, site)) return reply.code(403).send({ error: "You do not have access to this site's camera network." });
    const connection = normalizeConnection(body.connection);
    const existingCamera = body.camera_id ? await authorizedCamera(pool, request.user, String(body.camera_id)) : null;
    if (existingCamera && String(existingCamera.site_id) !== String(site.id)) return reply.code(400).send({ error: "The selected site must match this camera's site." });
    const previous = existingCamera ? await connectionFor(pool, existingCamera.id) : null;
    if (!connection.password && previous && !connection.allow_no_auth) connection.password = decryptPassword(previous);
    else if (!connection.password && !connection.allow_no_auth) return reply.code(400).send({ error: "Enter the camera password or confirm that this stream has no password." });
    let result;
    try {
      result = await probeWithMediaMTX(connection);
    } catch (error) {
      if (previous) {
        await pool.query("UPDATE camera_connections SET last_test_status='failed',last_test_at=now(),last_error=$2,updated_at=now() WHERE camera_id=$1", [existingCamera.id, String(error.message || "Connection test failed").slice(0, 300)]).catch(() => {});
      }
      await addAudit(request.user.id, "camera.connection.test", "Camera", existingCamera?.id || null, {
        site_id: String(site.id), network_mode: connection.network_mode, protocol: connection.protocol,
        network_label: connection.network_label, result: "failed",
      }).catch(() => {});
      throw error;
    }
    if (previous) await pool.query("UPDATE camera_connections SET last_test_status='passed',last_test_at=now(),last_error='',updated_at=now() WHERE camera_id=$1", [existingCamera.id]);
    await addAudit(request.user.id, "camera.connection.test", "Camera", null, {
      site_id: String(site.id), network_mode: connection.network_mode, protocol: connection.protocol,
      network_label: connection.network_label, result: "passed",
    });
    return result;
  });

  app.post("/api/cameras/setup", {
    preHandler: requireAuth,
    config: { rateLimit: { max: 8, timeWindow: "10 minutes" } },
  }, async (request, reply) => {
    requireManager(request.user);
    if (!checkOrigin(request, reply)) return;
    const body = request.body || {};
    const metadata = body.camera && typeof body.camera === "object" ? body.camera : {};
    const name = String(metadata.name || "").trim();
    const siteId = String(metadata.site_id || "");
    const site = await getRecord(pool, "Site", siteId);
    if (!name || !site) return reply.code(400).send({ error: "Camera name and an existing research site are required." });
    if (!canReadSite(request.user, site)) return reply.code(403).send({ error: "You do not have access to this site's camera network." });
    const requestedLabel = String(metadata.camera_id || "").trim();
    const cameraLabel = (requestedLabel || `CAM-${randomUUID().slice(0, 8).toUpperCase()}`).slice(0, 80);
    const duplicateLabel = await pool.query("SELECT 1 FROM app_records WHERE entity='Camera' AND data->>'camera_id'=$1 LIMIT 1", [cameraLabel]);
    if (duplicateLabel.rowCount) return reply.code(409).send({ error: "That camera label is already in use. Choose a unique label." });
    encryptionKey();
    const connection = normalizeConnection(body.connection);
    if (!connection.password && !connection.allow_no_auth) return reply.code(400).send({ error: "Enter the camera password or confirm that this stream has no password." });
    const test = await probeWithMediaMTX(connection);

    const id = randomUUID();
    const now = new Date().toISOString();
    const data = {
      id,
      name: name.slice(0, 120),
      camera_id: cameraLabel,
      brand: String(metadata.brand || "Generic").trim().slice(0, 80),
      model: String(metadata.model || "").trim().slice(0, 120),
      serial_number: String(metadata.serial_number || "").trim().slice(0, 120),
      site_id: siteId,
      site_name: String(site.name || "").slice(0, 120),
      ward: String(metadata.ward || site.ward || "").slice(0, 40),
      municipality: String(metadata.municipality || "Pokhara").slice(0, 80),
      district: String(metadata.district || "Kaski").slice(0, 80),
      latitude: metadata.latitude == null || metadata.latitude === "" ? null : Number(metadata.latitude),
      longitude: metadata.longitude == null || metadata.longitude === "" ? null : Number(metadata.longitude),
      installation_description: String(metadata.installation_description || "").trim().slice(0, 500),
      inventory_status: "configured",
      online_status: "unknown",
      stream_status: "configured",
      ai_status: "disabled",
      recording_enabled: false,
      audio_enabled: false,
      is_demo: false,
      created_date: now,
      created_at: now,
      updated_date: now,
      updated_at: now,
    };
    if ((data.latitude !== null && (!Number.isFinite(data.latitude) || Math.abs(data.latitude) > 90)) ||
      (data.longitude !== null && (!Number.isFinite(data.longitude) || Math.abs(data.longitude) > 180))) {
      return reply.code(400).send({ error: "Enter valid latitude and longitude values." });
    }

    const encrypted = encryptPassword(connection.password);
    const client = await pool.connect();
    let committed = false;
    try {
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO app_records (entity,id,data,created_by,updated_by) VALUES ('Camera',$1,$2::jsonb,$3,$3)",
        [id, JSON.stringify(data), request.user.id]
      );
      const pathName = makePathName(id);
      await client.query(
        `INSERT INTO camera_connections (camera_id,site_id,path_name,network_mode,network_label,protocol,host,port,stream_path,username,password_ciphertext,password_iv,password_tag,rtsp_transport,state,last_test_status,last_test_at,configured_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'configured','passed',now(),$15)`,
        [id, siteId, pathName, connection.network_mode, connection.network_label, connection.protocol,
          connection.host, connection.port, connection.stream_path, connection.username,
          encrypted.ciphertext, encrypted.iv, encrypted.tag, connection.rtsp_transport, request.user.id]
      );
      await client.query("COMMIT");
      committed = true;
      await addAudit(request.user.id, "camera.setup.create", "Camera", id, {
        site_id: siteId, network_mode: connection.network_mode, network_label: connection.network_label,
        protocol: connection.protocol, test: test.success ? "passed" : "failed",
      }).catch((error) => request.log.error({ err: error, cameraId: id }, "Camera setup audit write failed"));
      const stored = await connectionFor(pool, id);
      try {
        await applyStoredConnection(pool, stored);
      } catch {
        await markApply(pool, id, "apply_failed", "Camera tested successfully but MediaMTX did not accept the saved path. Retry apply from camera setup.").catch(() => {});
      }
      const record = await getRecord(pool, "Camera", id);
      const finalConnection = await connectionFor(pool, id);
      const pathStatusResponse = await mediaRequest(`/v3/paths/get/${encodeURIComponent(finalConnection.path_name)}`).catch(() => null);
      const pathStatus = pathStatusResponse?.ok ? await pathStatusResponse.json().catch(() => ({})) : {};
      return reply.code(201).send({ camera: record, connection: safeConnection(finalConnection, pathStatus.online === true) });
    } catch (error) {
      if (!committed) await client.query("ROLLBACK").catch(() => {});
      if (error.code === "23505") return reply.code(409).send({ error: "This camera ID or connection already exists." });
      throw error;
    } finally {
      client.release();
    }
  });

  app.put("/api/cameras/:id/connection", {
    preHandler: requireAuth,
    config: { rateLimit: { max: 8, timeWindow: "10 minutes" } },
  }, async (request, reply) => {
    requireManager(request.user);
    if (!checkOrigin(request, reply)) return;
    const camera = await authorizedCamera(pool, request.user, request.params.id);
    const previous = await connectionFor(pool, camera.id);
    encryptionKey();
    const connection = normalizeConnection(request.body || {});
    if (!connection.password && !previous && !connection.allow_no_auth) throw httpError(400, "Enter the camera password or confirm that this stream has no password.");
    if (!connection.password && previous && !connection.allow_no_auth) connection.password = decryptPassword(previous);
    await probeWithMediaMTX(connection);
    const saved = await saveConnection(pool, camera, connection, request.user.id, previous);
    try {
      await applyStoredConnection(pool, saved);
    } catch {
      await markApply(pool, camera.id, "apply_failed", "Camera test passed, but the streaming service could not apply the path. Retry apply from this page.").catch(() => {});
    }
    await addAudit(request.user.id, "camera.connection.update", "Camera", camera.id, {
      network_mode: connection.network_mode, network_label: connection.network_label, protocol: connection.protocol,
    });
    const finalRow = await connectionFor(pool, camera.id);
    return { connection: safeConnection(finalRow) };
  });

  app.post("/api/cameras/:id/connection/apply", {
    preHandler: requireAuth,
    config: { rateLimit: { max: 20, timeWindow: "10 minutes" } },
  }, async (request, reply) => {
    requireManager(request.user);
    if (!checkOrigin(request, reply)) return;
    const camera = await authorizedCamera(pool, request.user, request.params.id);
    const row = await connectionFor(pool, camera.id);
    if (!row) return reply.code(404).send({ error: "This camera has no connection profile yet." });
    try {
      await applyStoredConnection(pool, row);
    } catch (error) {
      await markApply(pool, camera.id, "apply_failed", "MediaMTX could not apply the saved stream path.").catch(() => {});
      throw error;
    }
    await addAudit(request.user.id, "camera.connection.apply", "Camera", camera.id);
    return { connection: safeConnection(await connectionFor(pool, camera.id)) };
  });

  app.delete("/api/cameras/:id/connection", {
    preHandler: requireAuth,
    config: { rateLimit: { max: 10, timeWindow: "10 minutes" } },
  }, async (request, reply) => {
    requireManager(request.user);
    if (!checkOrigin(request, reply)) return;
    const camera = await authorizedCamera(pool, request.user, request.params.id);
    const row = await connectionFor(pool, camera.id);
    if (row) await deleteMediaPath(row.path_name);
    await pool.query("DELETE FROM camera_connections WHERE camera_id=$1", [camera.id]);
    await addAudit(request.user.id, "camera.connection.remove", "Camera", camera.id);
    return { success: true };
  });

  app.post("/api/cameras/:id/view-token", {
    preHandler: requireAuth,
    config: { rateLimit: { max: 30, timeWindow: "10 minutes" } },
  }, async (request, reply) => {
    if (!checkOrigin(request, reply)) return;
    if (!viewerRoles.has(request.user.role)) return reply.code(403).send({ error: "Your role cannot view live camera streams." });
    const camera = await authorizedCamera(pool, request.user, request.params.id);
    const row = await connectionFor(pool, camera.id);
    if (!row || row.state !== "configured" || !row.enabled) return reply.code(409).send({ error: "This camera stream has not been applied to the server." });
    const token = request.server.jwt.sign({
      sub: String(request.user.id), purpose: "camera_stream", camera_id: camera.id, path_name: row.path_name,
    }, { expiresIn: "30m" });
    reply.header("Cache-Control", "no-store");
    return { whep_url: `/media/${row.path_name}/whep`, token, expires_in: 1800 };
  });

  app.post("/api/cameras/media-auth", async (request, reply) => {
    const body = request.body || {};
    if (body.action === "api") {
      const expectedUser = Buffer.from(String(process.env.MEDIAMTX_API_USER || ""));
      const expectedPassword = Buffer.from(String(process.env.MEDIAMTX_API_PASSWORD || ""));
      const suppliedUser = Buffer.from(String(body.user || ""));
      const suppliedPassword = Buffer.from(String(body.password || ""));
      const userMatches = expectedUser.length > 0 && suppliedUser.length === expectedUser.length && timingSafeEqual(suppliedUser, expectedUser);
      const passwordMatches = expectedPassword.length >= 32 && suppliedPassword.length === expectedPassword.length && timingSafeEqual(suppliedPassword, expectedPassword);
      if (userMatches && passwordMatches) return reply.code(200).send({ status: "ok" });
      return reply.code(401).send({ status: "error" });
    }
    if (!body.token || body.action !== "read" || body.protocol !== "webrtc") return reply.code(401).send({ status: "error" });
    let claims;
    try { claims = request.server.jwt.verify(String(body.token)); } catch { return reply.code(401).send({ status: "error" }); }
    if (claims.purpose !== "camera_stream" || claims.path_name !== body.path) return reply.code(401).send({ status: "error" });
    const camera = await getRecord(pool, "Camera", String(claims.camera_id || ""));
    const result = await pool.query(
      `SELECT u.id,u.role,u.status,u.site_ids,c.path_name,c.enabled,c.state
       FROM app_users u JOIN camera_connections c ON c.camera_id=$2 WHERE u.id=$1`,
      [claims.sub, String(claims.camera_id || "")]
    );
    if (!camera || !result.rowCount) return reply.code(401).send({ status: "error" });
    const user = result.rows[0];
    if (user.status !== "active" || !viewerRoles.has(user.role) || !user.enabled || user.state !== "configured" ||
      user.path_name !== body.path || !canReadSite(user, camera)) {
      return reply.code(401).send({ status: "error" });
    }
    return reply.code(200).send({ status: "ok", expireAt: new Date(Number(claims.exp) * 1000).toISOString() });
  });
}

let reconcilePromise = null;
export function startCameraEngine(app, pool) {
  const reconcile = async () => {
    if (reconcilePromise) return reconcilePromise;
    reconcilePromise = (async () => {
      const result = await pool.query("SELECT * FROM camera_connections WHERE enabled=true AND state IN ('configured','apply_failed') ORDER BY created_at");
      for (const row of result.rows) {
        try {
          const current = await mediaRequest(`/v3/config/paths/get/${encodeURIComponent(row.path_name)}`);
          if (current.ok && row.state !== "apply_failed") continue;
          await applyStoredConnection(pool, row);
        } catch {
          app.log.warn({ cameraId: row.camera_id }, "Camera stream path reconciliation failed");
        }
      }
    })().finally(() => { reconcilePromise = null; });
    return reconcilePromise;
  };
  void reconcile();
  const timer = setInterval(() => { void reconcile(); }, 30000);
  timer.unref();
  return () => clearInterval(timer);
}
