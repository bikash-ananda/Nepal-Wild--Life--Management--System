import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { addAudit } from "./db.js";

export const allowedRoles = new Set([
  "admin", "researcher", "reviewer", "field_officer", "field_worker", "community_reporter", "technician"
]);

export function publicUser(row) {
  return {
    id: String(row.id), email: row.email, full_name: row.full_name, role: row.role,
    status: row.status, site_ids: row.site_ids || [], created_at: row.created_at,
    updated_at: row.updated_at, last_login_at: row.last_login_at,
  };
}

export async function requireAuth(request, reply) {
  const token = request.cookies?.nws_session;
  if (!token) return reply.code(401).send({ error: "Authentication required" });
  let claims;
  try {
    claims = request.server.jwt.verify(token);
  } catch {
    reply.clearCookie("nws_session", { path: "/" });
    return reply.code(401).send({ error: "Session expired" });
  }
  const result = await request.server.pg.query(
    "SELECT id, email, full_name, role, status, site_ids, session_version, created_at, updated_at, last_login_at FROM app_users WHERE id = $1",
    [claims.sub]
  );
  const row = result.rows[0];
  if (!row || row.status !== "active" || Number(claims.sv || 0) !== Number(row.session_version || 0)) {
    reply.clearCookie("nws_session", { path: "/" });
    return reply.code(401).send({ error: "Account is not active" });
  }
  request.user = publicUser(row);
}

export function checkOrigin(request, reply) {
  const origin = request.headers.origin;
  const allowlist = request.server.allowedOrigins;
  if (origin && !allowlist.has(origin)) {
    reply.code(403).send({ error: "Request origin is not allowed" });
    return false;
  }
  return true;
}

function setSessionCookie(app, reply, user) {
  const token = app.jwt.sign({ sub: String(user.id), role: user.role, sv: Number(user.session_version || 0) }, {
    expiresIn: process.env.SESSION_TTL || "12h",
  });
  reply.setCookie("nws_session", token, {
    path: "/", httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "strict", maxAge: 12 * 60 * 60,
  });
}

async function createUser(pool, payload, actorId = null, status = "active") {
  const email = String(payload.email || "").trim().toLowerCase();
  const password = String(payload.password || "");
  const fullName = String(payload.full_name || payload.name || "").trim();
  const role = String(payload.role || "field_worker");
  if (!email.includes("@")) throw Object.assign(new Error("Enter a valid email address."), { statusCode: 400 });
  if (password.length < 12) throw Object.assign(new Error("Password must be at least 12 characters."), { statusCode: 400 });
  if (!allowedRoles.has(role)) throw Object.assign(new Error("Unsupported user role."), { statusCode: 400 });
  const passwordHash = await bcrypt.hash(password, 12);
  const siteIds = await validateSiteIds(pool, payload.site_ids);
  const result = await pool.query(
    "INSERT INTO app_users (email, password_hash, full_name, role, status, site_ids) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, full_name, role, status, site_ids, created_at, updated_at",
    [email, passwordHash, fullName, role, status, siteIds]
  );
  await addAudit(actorId, "user.create", "User", String(result.rows[0].id), { role, status });
  return publicUser(result.rows[0]);
}

async function validateSiteIds(pool, value) {
  const siteIds = Array.isArray(value) ? [...new Set(value.map(String))] : [];
  if (!siteIds.length) return siteIds;
  const result = await pool.query(
    "SELECT id FROM app_records WHERE entity = 'Site' AND id = ANY($1::text[])", [siteIds]
  );
  if (result.rowCount !== siteIds.length) {
    throw Object.assign(new Error("One or more selected sites no longer exist."), { statusCode: 400 });
  }
  return siteIds;
}

export async function seedAdmin(app, pool) {
  const email = String(process.env.BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || "";
  if (!email || !password) return;
  const existingAdmin = await pool.query("SELECT id FROM app_users WHERE email = $1 AND role = 'admin'", [email]);
  if (existingAdmin.rowCount) return;
  const owner = await pool.query("SELECT id FROM app_users WHERE email = $1", [email]);
  if (owner.rowCount) throw new Error("BOOTSTRAP_ADMIN_EMAIL is already used by a non-admin account; choose a unique administrator email.");
  const activeAdmin = await pool.query("SELECT id FROM app_users WHERE role = 'admin' AND status = 'active' LIMIT 1");
  if (activeAdmin.rowCount) return;
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    "INSERT INTO app_users (email, password_hash, full_name, role, status) VALUES ($1, $2, $3, 'admin', 'active')",
    [email, passwordHash, process.env.BOOTSTRAP_ADMIN_NAME || "Wildlife Administrator"]
  );
  app.log.info("Created the first administrator account from deployment environment.");
}

export function registerAuthRoutes(app, pool) {
  app.post("/api/auth/login", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, async (request, reply) => {
    if (!checkOrigin(request, reply)) return;
    const email = String(request.body?.email || "").trim().toLowerCase();
    const password = String(request.body?.password || "");
    const result = await pool.query(
      "SELECT id, email, password_hash, full_name, role, status, site_ids, session_version, created_at, updated_at FROM app_users WHERE email = $1",
      [email]
    );
    const row = result.rows[0];
    if (!row || row.status !== "active" || !(await bcrypt.compare(password, row.password_hash))) {
      return reply.code(401).send({ error: "Email or password is incorrect." });
    }
    await pool.query("UPDATE app_users SET last_login_at = now(), updated_at = now() WHERE id = $1", [row.id]);
    setSessionCookie(app, reply, row);
    await addAudit(row.id, "auth.login");
    return { user: publicUser(row) };
  });

  app.get("/api/auth/me", { preHandler: requireAuth }, async (request) => ({ user: request.user }));

  app.post("/api/auth/logout", { preHandler: requireAuth }, async (request, reply) => {
    if (!checkOrigin(request, reply)) return;
    await addAudit(request.user.id, "auth.logout");
    reply.clearCookie("nws_session", { path: "/" });
    return { success: true };
  });

  app.post("/api/auth/register", { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, async (request, reply) => {
    if (!checkOrigin(request, reply)) return;
    if (process.env.ALLOW_SELF_REGISTRATION !== "true") {
      return reply.code(403).send({ error: "Registration is closed. Ask an administrator to create your account." });
    }
    const user = await createUser(pool, request.body || {}, null, "pending");
    return reply.code(202).send({ pending: true, email: user.email });
  });

  app.post("/api/auth/request-password-reset", { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, async (request, reply) => {
    if (!checkOrigin(request, reply)) return;
    const email = String(request.body?.email || "").trim().toLowerCase();
    const result = await pool.query("SELECT id FROM app_users WHERE email = $1 AND status = 'active'", [email]);
    if (result.rowCount && process.env.SMTP_HOST) {
      const token = randomBytes(32).toString("hex");
      const hash = createHash("sha256").update(token).digest("hex");
      await pool.query(
        "INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '30 minutes')",
        [hash, result.rows[0].id]
      );
      const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true",
        auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD || "" } : undefined,
      });
      const link = (process.env.APP_ORIGIN || "http://localhost:5173") + "/reset-password?token=" + token;
      await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email, subject: "Reset your Nepal Wildlife Management System password",
        text: "Use this link within 30 minutes to reset your password: " + link,
      });
    }
    return reply.code(202).send({ success: true });
  });

  app.post("/api/auth/reset-password", { config: { rateLimit: { max: 5, timeWindow: "1 hour" } } }, async (request, reply) => {
    if (!checkOrigin(request, reply)) return;
    const token = String(request.body?.resetToken || request.body?.token || "");
    const password = String(request.body?.newPassword || "");
    if (password.length < 12) return reply.code(400).send({ error: "Password must be at least 12 characters." });
    const hash = createHash("sha256").update(token).digest("hex");
    const found = await pool.query(
      "SELECT user_id FROM password_reset_tokens WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()",
      [hash]
    );
    if (!found.rowCount) return reply.code(400).send({ error: "This reset link is invalid or expired." });
    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query("UPDATE app_users SET password_hash = $2, session_version = session_version + 1, updated_at = now() WHERE id = $1", [found.rows[0].user_id, passwordHash]);
    await pool.query("UPDATE password_reset_tokens SET consumed_at = now() WHERE token_hash = $1", [hash]);
    await addAudit(found.rows[0].user_id, "auth.password_reset");
    return { success: true };
  });

  app.get("/api/admin/users", { preHandler: requireAuth }, async (request, reply) => {
    if (request.user.role !== "admin") return reply.code(403).send({ error: "Administrator access required." });
    const result = await pool.query("SELECT id, email, full_name, role, status, site_ids, created_at, updated_at, last_login_at FROM app_users ORDER BY created_at DESC");
    return result.rows.map(publicUser);
  });

  app.post("/api/admin/users", { preHandler: requireAuth }, async (request, reply) => {
    if (request.user.role !== "admin") return reply.code(403).send({ error: "Administrator access required." });
    if (!checkOrigin(request, reply)) return;
    const user = await createUser(pool, request.body || {}, request.user.id, request.body?.status === "pending" ? "pending" : "active");
    return reply.code(201).send(user);
  });

  app.patch("/api/admin/users/:id", { preHandler: requireAuth }, async (request, reply) => {
    if (request.user.role !== "admin") return reply.code(403).send({ error: "Administrator access required." });
    if (!checkOrigin(request, reply)) return;
    const body = request.body || {};
    if (String(request.params.id) === String(request.user.id) &&
      (body.status === "disabled" || (body.role && body.role !== "admin"))) {
      return reply.code(400).send({ error: "You cannot disable or demote your own administrator account." });
    }
    const fields = [];
    const values = [];
    if (body.role && allowedRoles.has(String(body.role))) {
      values.push(String(body.role)); fields.push("role = $" + values.length);
    }
    if (body.status && ["active", "pending", "disabled"].includes(String(body.status))) {
      values.push(String(body.status)); fields.push("status = $" + values.length);
    }
    if (Array.isArray(body.site_ids)) {
      values.push(await validateSiteIds(pool, body.site_ids)); fields.push("site_ids = $" + values.length);
    }
    if (!fields.length) return reply.code(400).send({ error: "No supported user fields were provided." });
    values.push(request.params.id);
    const client = await pool.connect();
    let result;
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(716301)");
      const current = await client.query("SELECT id, role, status FROM app_users WHERE id = $1 FOR UPDATE", [request.params.id]);
      if (!current.rowCount) {
        await client.query("ROLLBACK");
        return reply.code(404).send({ error: "User not found." });
      }
      const nextRole = body.role && allowedRoles.has(String(body.role)) ? String(body.role) : current.rows[0].role;
      const nextStatus = body.status && ["active", "pending", "disabled"].includes(String(body.status)) ? String(body.status) : current.rows[0].status;
      if (current.rows[0].role === "admin" && current.rows[0].status === "active" &&
        (nextRole !== "admin" || nextStatus !== "active")) {
        const admins = await client.query("SELECT count(*)::int AS count FROM app_users WHERE role = 'admin' AND status = 'active' AND id <> $1", [request.params.id]);
        if (admins.rows[0].count < 1) {
          await client.query("ROLLBACK");
          return reply.code(409).send({ error: "At least one active administrator account must remain." });
        }
      }
      result = await client.query(
        "UPDATE app_users SET " + fields.join(", ") + ", updated_at = now() WHERE id = $" + values.length +
        " RETURNING id, email, full_name, role, status, site_ids, created_at, updated_at, last_login_at", values
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    await addAudit(request.user.id, "user.update", "User", request.params.id, body);
    return publicUser(result.rows[0]);
  });
}
