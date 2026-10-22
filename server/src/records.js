import { randomUUID } from "node:crypto";
import { addAudit } from "./db.js";
import { entities } from "./entities.js";
import { publicUser } from "./auth.js";

const privilegedEntities = new Set([
  "AIModel", "AutomationRule", "Camera", "CameraPreset", "Device", "DeviceTemplate",
  "DeterrentDevice", "DeterrentRule", "EdgeDevice", "NotificationContact",
  "NotificationRule", "ResponseProtocol", "Sensor", "StreamSession", "TeamMember", "TrainingJob", "User",
]);
const fieldWriteEntities = new Set([
  "AuditLog", "DatasetRecord", "HwcCase", "Incident", "Patrol",
  "ResponseAction", "WildlifeObservation",
]);
const technicianInventoryEntities = new Set(["Camera", "Device", "EdgeDevice", "Sensor"]);
const inventoryFields = {
  Camera: new Set(["name", "camera_id", "brand", "model", "serial_number", "site_id", "site_name", "municipality", "district", "ward", "latitude", "longitude", "installation_description", "inventory_status"]),
  Device: new Set(["name", "device_uuid", "device_type", "category", "manufacturer", "model", "serial_number", "site_id", "site_name", "latitude", "longitude", "notes"]),
};
const referenceEntities = new Set(["Species", "DeviceTemplate"]);
const pilotSafeActions = new Set([
  "Device health monitoring", "AI standby", "Environmental monitoring",
  "Dashboard alert", "Create human-review task", "Record observation metadata", "Calculate review priority",
  "Notify duty operator", "Notify assigned field team", "Request a second review",
  "Escalate to ranger review", "Create incident draft", "Request researcher review",
  "Prepare multi-agency report", "Generate research summary", "Request administrator approval",
  "Create human-review task", "Add event to site timeline", "Escalate for ranger review",
]);
const pilotSafeRuleTypes = new Set(["human_review", "notification_only", "incident_draft", "researcher_escalation"]);

function enforcePilotActions(entity, data) {
  if (entity === "DeterrentRule" && data.active && !pilotSafeRuleTypes.has(String(data.deterrent_type || ""))) {
    throw Object.assign(new Error("Physical deterrent actions are disabled during the research pilot."), { statusCode: 400 });
  }
  if (!["AutomationRule", "ResponseProtocol"].includes(entity)) return;
  const actions = Array.isArray(data.actions) ? data.actions : [];
  const blocked = actions.filter((action) => !pilotSafeActions.has(String(action)));
  if (blocked.length) {
    throw Object.assign(new Error("This pilot only supports review, reporting, and operator notification actions."), { statusCode: 400 });
  }
}

export function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function sanitizeInventory(entity, value) {
  const fields = inventoryFields[entity];
  if (!fields) return asObject(value);
  const data = Object.fromEntries(Object.entries(asObject(value)).filter(([key]) => fields.has(key)));
  if (entity === "Camera") Object.assign(data, {
    inventory_status: "not_connected", online_status: "not_configured", stream_status: "not_configured",
    ai_status: "disabled", recording_enabled: false, audio_enabled: false, is_demo: false,
  });
  if (entity === "Device") Object.assign(data, { status: "inventory_only", enabled: false });
  return data;
}

export function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

export function normalizeListOptions(value, fallbackLimit) {
  if (typeof value === "string") return { sort: value, limit: fallbackLimit };
  if (typeof value === "number") return { limit: value };
  return { ...asObject(value), limit: fallbackLimit ?? value?.limit };
}

function view(row, entity) {
  const raw = asObject(row.data);
  const record = { ...sanitizeInventory(entity, raw), id: row.id };
  record.created_date = record.created_date || row.created_at;
  record.created_at = record.created_at || row.created_at;
  record.updated_date = record.updated_date || row.updated_at;
  record.updated_at = record.updated_at || row.updated_at;
  return record;
}

function valueAt(record, key) {
  if (key === "created_date" || key === "created_at") return record.created_date || record.created_at;
  if (key === "updated_date" || key === "updated_at") return record.updated_date || record.updated_at;
  return String(key).split(".").reduce((value, part) => value == null ? undefined : value[part], record);
}

function matchesValue(actual, expected) {
  if (expected && typeof expected === "object" && !Array.isArray(expected)) {
    for (const [operator, value] of Object.entries(expected)) {
      if (operator === "$options") continue;
      if (operator === "$ne" && actual === value) return false;
      if (operator === "$eq" && actual !== value) return false;
      if (operator === "$in" && (!Array.isArray(value) || !value.includes(actual))) return false;
      if (operator === "$nin" && Array.isArray(value) && value.includes(actual)) return false;
      if (operator === "$exists" && Boolean(actual !== undefined) !== Boolean(value)) return false;
      if (operator === "$regex") {
        let regex;
        try { regex = new RegExp(String(value), expected.$options || ""); } catch { return false; }
        if (!regex.test(String(actual ?? ""))) return false;
      }
      if (operator === "$gt" && !(Number(actual) > Number(value))) return false;
      if (operator === "$gte" && !(Number(actual) >= Number(value))) return false;
      if (operator === "$lt" && !(Number(actual) < Number(value))) return false;
      if (operator === "$lte" && !(Number(actual) <= Number(value))) return false;
    }
    return true;
  }
  if (Array.isArray(actual)) return actual.includes(expected);
  return actual === expected;
}

function matchesFilter(record, filter) {
  for (const [key, expected] of Object.entries(asObject(filter))) {
    if (key === "$or" && Array.isArray(expected)) {
      if (!expected.some((entry) => matchesFilter(record, entry))) return false;
    } else if (key === "$and" && Array.isArray(expected)) {
      if (!expected.every((entry) => matchesFilter(record, entry))) return false;
    } else if (!matchesValue(valueAt(record, key), expected)) return false;
  }
  return true;
}

function sortRecords(records, sort) {
  if (!sort) return records;
  const descending = String(sort).startsWith("-");
  const key = descending ? String(sort).slice(1) : String(sort);
  return records.sort((left, right) => {
    const a = valueAt(left, key);
    const b = valueAt(right, key);
    if (a == null && b == null) return 0;
    if (a == null) return descending ? 1 : -1;
    if (b == null) return descending ? -1 : 1;
    const numberA = Number(a);
    const numberB = Number(b);
    const order = Number.isFinite(numberA) && Number.isFinite(numberB)
      ? numberA - numberB : String(a).localeCompare(String(b));
    return descending ? -order : order;
  });
}

export function canWrite(user, entity) {
  if (entity === "User") return user.role === "admin";
  if (entity === "VerificationSample") return ["admin", "researcher", "reviewer"].includes(user.role);
  if (["admin", "researcher"].includes(user.role)) return true;
  if (user.role === "technician" && technicianInventoryEntities.has(entity)) return true;
  return fieldWriteEntities.has(entity) && ["reviewer", "field_officer", "field_worker", "community_reporter"].includes(user.role);
}

export function canReadSite(user, record) {
  if (record.visibility === "reviewer_only" && !["admin", "researcher", "reviewer"].includes(user.role)) return false;
  if (["admin", "researcher"].includes(user.role) || !record.site_id) return true;
  const siteIds = user.site_ids || [];
  return siteIds.includes(String(record.site_id));
}

export async function getRecord(pool, entity, id) {
  if (entity === "User") {
    const result = await pool.query(
      "SELECT id, email, full_name, role, status, site_ids, created_at, updated_at, last_login_at FROM app_users WHERE id = $1",
      [id]
    );
    return result.rows[0] ? publicUser(result.rows[0]) : null;
  }
  const result = await pool.query(
    "SELECT id, data, created_at, updated_at FROM app_records WHERE entity = $1 AND id = $2", [entity, id]
  );
  return result.rows[0] ? view(result.rows[0], entity) : null;
}

export async function listRecords(pool, entity, filter = {}, options = {}, user = null) {
  if (!entities.has(entity)) throw Object.assign(new Error("Unknown entity."), { statusCode: 404 });
  let records;
  if (entity === "User") {
    if (user?.role !== "admin") throw Object.assign(new Error("Administrator access required."), { statusCode: 403 });
    const result = await pool.query(
      "SELECT id, email, full_name, role, status, site_ids, created_at, updated_at, last_login_at FROM app_users ORDER BY created_at DESC LIMIT 500"
    );
    records = result.rows.map(publicUser);
  } else {
    const result = await pool.query(
      "SELECT id, data, created_at, updated_at FROM app_records WHERE entity = $1 ORDER BY created_at DESC LIMIT 5000", [entity]
    );
    records = result.rows.map((row) => view(row, entity));
  }
  records = records.filter((record) => matchesFilter(record, filter));
  if (user) records = records.filter((record) => canReadSite(user, record));
  if (options.site_id) records = records.filter((record) => String(record.site_id) === String(options.site_id));
  records = sortRecords(records, options.sort || null);
  if (options.distinct) {
    return [...new Set(records.map((record) => valueAt(record, options.distinct)).filter((value) => value != null))];
  }
  const offset = Math.max(0, Number(options.offset || 0));
  const limit = Math.max(0, Math.min(1000, Number(options.limit || 200)));
  if (Array.isArray(options.fields) && options.fields.length) {
    records = records.map((record) => Object.fromEntries(
      [...new Set(["id", "created_date", "updated_date", ...options.fields])]
        .filter((field) => record[field] !== undefined).map((field) => [field, record[field]])
    ));
  }
  return records.slice(offset, offset + limit);
}

export async function createRecord(pool, entity, payload, actorId = null) {
  payload = sanitizeInventory(entity, payload);
  enforcePilotActions(entity, payload);
  const id = String(payload.id || randomUUID());
  const now = new Date().toISOString();
  const data = { ...payload, id };
  if (!data.created_date) data.created_date = now;
  if (!data.created_at) data.created_at = data.created_date;
  data.updated_date = now;
  data.updated_at = now;
  const result = await pool.query(
    "INSERT INTO app_records (entity, id, data, created_by, updated_by) VALUES ($1, $2, $3::jsonb, $4, $4) RETURNING id, data, created_at, updated_at",
    [entity, id, JSON.stringify(data), actorId || null]
  );
  await addAudit(actorId, "record.create", entity, id);
  return view(result.rows[0], entity);
}

export async function updateRecord(pool, entity, id, patch, actorId = null) {
  const existing = await getRecord(pool, entity, id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const merged = { ...existing, ...asObject(patch), id, updated_date: now, updated_at: now };
  const data = { ...sanitizeInventory(entity, merged), id, updated_date: now, updated_at: now };
  enforcePilotActions(entity, data);
  const result = await pool.query(
    "UPDATE app_records SET data = $3::jsonb, updated_at = now(), updated_by = $4 WHERE entity = $1 AND id = $2 RETURNING id, data, created_at, updated_at",
    [entity, id, JSON.stringify(data), actorId || null]
  );
  await addAudit(actorId, "record.update", entity, id);
  return view(result.rows[0], entity);
}

export async function deleteRecord(pool, entity, id, actorId = null) {
  if (entity === "User") throw Object.assign(new Error("User accounts must be disabled, not deleted."), { statusCode: 405 });
  const result = await pool.query("DELETE FROM app_records WHERE entity = $1 AND id = $2 RETURNING id", [entity, id]);
  if (!result.rowCount) return false;
  await addAudit(actorId, "record.delete", entity, id);
  return true;
}

export function registerRecordRoutes(app, pool, requireAuth, checkOrigin) {
  app.get("/api/entities/:entity", { preHandler: requireAuth }, async (request, reply) => {
    const { entity } = request.params;
    if (!entities.has(entity)) return reply.code(404).send({ error: "Unknown entity." });
    const filter = parseJson(request.query.filter, {});
    const options = {
      sort: request.query.sort,
      limit: request.query.limit,
      offset: request.query.offset,
      site_id: request.query.site_id,
      distinct: request.query.distinct,
      fields: parseJson(request.query.fields, undefined),
    };
    return listRecords(pool, entity, filter, options, request.user);
  });

  app.get("/api/entities/:entity/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { entity, id } = request.params;
    if (!entities.has(entity)) return reply.code(404).send({ error: "Unknown entity." });
    const record = await getRecord(pool, entity, id);
    if (!record) return reply.code(404).send({ error: "Record not found." });
    if (!canReadSite(request.user, record)) return reply.code(403).send({ error: "You do not have access to this site." });
    if (entity === "User" && request.user.role !== "admin") return reply.code(403).send({ error: "Administrator access required." });
    return record;
  });

  app.post("/api/entities/:entity", { preHandler: requireAuth }, async (request, reply) => {
    const { entity } = request.params;
    if (!entities.has(entity)) return reply.code(404).send({ error: "Unknown entity." });
    if (!canWrite(request.user, entity)) return reply.code(403).send({ error: "You cannot create this record." });
    if (!checkOrigin(request, reply)) return;
    const payload = asObject(request.body);
    if (entity === "User") {
      if (request.user.role !== "admin") return reply.code(403).send({ error: "Administrator access required." });
      return reply.code(405).send({ error: "Use the administrator user-management endpoint." });
    }
    if (payload.site_id && !canReadSite(request.user, payload)) return reply.code(403).send({ error: "You do not have access to this site." });
    try {
      return reply.code(201).send(await createRecord(pool, entity, payload, request.user.id));
    } catch (error) {
      if (error.code === "23505") return reply.code(409).send({ error: "A record with this ID already exists." });
      throw error;
    }
  });

  app.patch("/api/entities/:entity/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { entity, id } = request.params;
    if (!entities.has(entity)) return reply.code(404).send({ error: "Unknown entity." });
    if (!canWrite(request.user, entity)) return reply.code(403).send({ error: "You cannot update this record." });
    if (entity === "User") return reply.code(405).send({ error: "Use the administrator user-management endpoint." });
    if (!checkOrigin(request, reply)) return;
    const current = await getRecord(pool, entity, id);
    if (!current) return reply.code(404).send({ error: "Record not found." });
    if (!canReadSite(request.user, current)) return reply.code(403).send({ error: "You do not have access to this site." });
    const patch = asObject(request.body);
    if (patch.site_id && !canReadSite(request.user, patch)) return reply.code(403).send({ error: "You do not have access to this site." });
    return updateRecord(pool, entity, id, patch, request.user.id);
  });

  app.delete("/api/entities/:entity/:id", { preHandler: requireAuth }, async (request, reply) => {
    const { entity, id } = request.params;
    if (!entities.has(entity)) return reply.code(404).send({ error: "Unknown entity." });
    if (!canWrite(request.user, entity)) return reply.code(403).send({ error: "You cannot delete this record." });
    if (entity === "User") return reply.code(405).send({ error: "User accounts must be disabled, not deleted." });
    if (!checkOrigin(request, reply)) return;
    const current = await getRecord(pool, entity, id);
    if (!current) return reply.code(404).send({ error: "Record not found." });
    if (!canReadSite(request.user, current)) return reply.code(403).send({ error: "You do not have access to this site." });
    if (entity === "Camera") {
      const connection = await pool.query("SELECT 1 FROM camera_connections WHERE camera_id=$1", [id]);
      if (connection.rowCount) return reply.code(409).send({ error: "Remove this camera's server connection first so its media stream path is cleaned up." });
    }
    const deleted = await deleteRecord(pool, entity, id, request.user.id);
    return deleted ? { success: true } : reply.code(404).send({ error: "Record not found." });
  });
}
