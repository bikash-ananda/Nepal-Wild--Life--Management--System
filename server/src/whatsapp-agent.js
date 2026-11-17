import { addAudit } from "./db.js";

const ADMIN_ROLES = new Set(["admin"]);

function requireAdmin(request, reply) {
  if (!ADMIN_ROLES.has(request.user?.role)) {
    reply.code(403).send({ error: "Administrator access is required." });
    return false;
  }
  return true;
}

export function publicSettings(row) {
  const credentialsPresent = Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
    process.env.WHATSAPP_APP_SECRET
  );
  return {
    product_name: "WLMS — Wildlife Management System",
    official_number: row.official_number,
    display_name: row.display_name,
    default_language: row.default_language,
    greeting_np: row.greeting_np,
    greeting_en: row.greeting_en,
    agent_enabled: false,
    live_delivery_enabled: false,
    test_mode: true,
    connection_status: credentialsPresent ? "credentials_present_pending_integration" : "not_connected",
    credentials_present: credentialsPresent,
    webhook_verified: Boolean(row.webhook_verified_at),
    webhook_verified_at: row.webhook_verified_at,
    updated_at: row.updated_at,
  };
}

export function registerWhatsAppAgentRoutes(app, pool, requireAuth, checkOrigin) {
  app.get("/api/admin/whatsapp-agent", { preHandler: requireAuth }, async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    const [settings, logs] = await Promise.all([
      pool.query("SELECT * FROM whatsapp_agent_settings WHERE id = true"),
      pool.query(
        `SELECT a.id, a.action, a.metadata, a.created_at, u.full_name AS actor_name
         FROM audit_events a LEFT JOIN app_users u ON u.id = a.actor_id
         WHERE a.action LIKE 'whatsapp_agent.%'
         ORDER BY a.created_at DESC LIMIT 20`
      ),
    ]);
    if (!settings.rowCount) {
      return reply.code(503).send({ error: "WhatsApp Agent settings are not initialized." });
    }
    return { settings: publicSettings(settings.rows[0]), activity: logs.rows };
  });

  app.patch("/api/admin/whatsapp-agent", { preHandler: requireAuth }, async (request, reply) => {
    if (!requireAdmin(request, reply)) return;
    if (!checkOrigin(request, reply)) return;
    const body = request.body || {};
    const language = String(body.default_language || "ne").trim();
    const greetingNp = String(body.greeting_np || "").trim();
    const greetingEn = String(body.greeting_en || "").trim();
    if (!["ne", "en", "auto"].includes(language)) {
      return reply.code(400).send({ error: "Choose Nepali, English, or automatic language selection." });
    }
    if (!greetingNp || greetingNp.length > 1200 || !greetingEn || greetingEn.length > 1200) {
      return reply.code(400).send({ error: "Both greetings are required and must be 1,200 characters or fewer." });
    }
    const result = await pool.query(
      `UPDATE whatsapp_agent_settings
       SET default_language = $1, greeting_np = $2, greeting_en = $3,
           updated_by = $4, updated_at = now()
       WHERE id = true
       RETURNING *`,
      [language, greetingNp, greetingEn, request.user.id]
    );
    if (!result.rowCount) return reply.code(503).send({ error: "WhatsApp Agent settings are not initialized." });
    await addAudit(request.user.id, "whatsapp_agent.settings_updated", "WhatsAppAgent", "default", {
      default_language: language,
      sender_number: result.rows[0].official_number,
    });
    return { settings: publicSettings(result.rows[0]) };
  });
}
