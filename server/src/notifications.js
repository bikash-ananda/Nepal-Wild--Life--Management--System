import webpush from "web-push";
import { addAudit } from "./db.js";

const publicKey = String(process.env.VAPID_PUBLIC_KEY || "").trim();
const privateKey = String(process.env.VAPID_PRIVATE_KEY || "").trim();
const subject = String(process.env.VAPID_SUBJECT || "mailto:admin@bikasheng.com.np").trim();
const pushConfigured = Boolean(publicKey && privateKey && subject);

if (pushConfigured) webpush.setVapidDetails(subject, publicKey, privateKey);

function endpointIsValid(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.port || url.username || url.password || url.hostname.includes(":")) return false;
    const host = url.hostname.toLowerCase();
    return ["fcm.googleapis.com", "web.push.apple.com", "wns.windows.com"]
      .some((domain) => host === domain || host.endsWith("." + domain))
      || host === "push.services.mozilla.com"
      || host.endsWith(".push.services.mozilla.com");
  } catch {
    return false;
  }
}

export function registerNotificationRoutes(app, pool, requireAuth, checkOrigin) {
  app.get("/api/notifications/push-config", { preHandler: requireAuth }, async () => ({
    configured: pushConfigured,
    public_key: pushConfigured ? publicKey : null,
  }));

  app.get("/api/notifications/push-status", { preHandler: requireAuth }, async (request) => {
    const result = await pool.query("SELECT count(*)::int AS count FROM push_subscriptions WHERE user_id = $1", [request.user.id]);
    return { enabled: result.rows[0].count > 0 };
  });

  app.post("/api/notifications/push-subscription", {
    preHandler: requireAuth,
    config: { rateLimit: { max: 10, timeWindow: "1 hour" } },
  }, async (request, reply) => {
    if (!checkOrigin(request, reply)) return;
    if (!pushConfigured) return reply.code(503).send({ error: "Browser push delivery is not configured on this server." });
    const subscription = request.body || {};
    const endpoint = String(subscription.endpoint || "");
    const p256dh = String(subscription.keys?.p256dh || "");
    const authSecret = String(subscription.keys?.auth || "");
    if (!endpointIsValid(endpoint) || p256dh.length < 16 || p256dh.length > 256 || authSecret.length < 8 || authSecret.length > 256) {
      return reply.code(400).send({ error: "The browser push subscription is invalid." });
    }
    const owner = await pool.query("SELECT user_id FROM push_subscriptions WHERE endpoint = $1", [endpoint]);
    if (owner.rowCount && String(owner.rows[0].user_id) !== String(request.user.id)) {
      return reply.code(409).send({ error: "This push endpoint is already linked to another account." });
    }
    const count = await pool.query("SELECT count(*)::int AS count FROM push_subscriptions WHERE user_id = $1", [request.user.id]);
    if (!owner.rowCount && count.rows[0].count >= 10) return reply.code(409).send({ error: "This account already has the maximum number of subscribed devices." });
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_secret, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth_secret = EXCLUDED.auth_secret,
       user_agent = EXCLUDED.user_agent, updated_at = now()`,
      [request.user.id, endpoint, p256dh, authSecret, String(request.headers["user-agent"] || "").slice(0, 500)]
    );
    await addAudit(request.user.id, "notification.push_subscribed");
    return reply.code(201).send({ enabled: true });
  });

  app.delete("/api/notifications/push-subscription", { preHandler: requireAuth }, async (request, reply) => {
    if (!checkOrigin(request, reply)) return;
    const endpoint = String(request.body?.endpoint || "");
    if (!endpoint) return reply.code(400).send({ error: "Push endpoint is required." });
    await pool.query("DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2", [request.user.id, endpoint]);
    await addAudit(request.user.id, "notification.push_unsubscribed");
    return { enabled: false };
  });
}

export async function enqueueSitePush(pool, siteId, eventKey, message) {
  if (!pushConfigured || !siteId) return { configured: pushConfigured, sent: 0, failed: 0 };
  const subscriptions = await pool.query(
    `SELECT s.id, s.user_id, s.endpoint, s.p256dh, s.auth_secret
     FROM push_subscriptions s JOIN app_users u ON u.id = s.user_id
     WHERE u.status = 'active' AND $1 = ANY(u.site_ids)
     ORDER BY s.created_at ASC LIMIT 500`,
    [String(siteId)]
  );
  const payload = JSON.stringify({
    title: String(message.title || "Wildlife field update").slice(0, 100),
    body: String(message.body || "Open the app for details.").slice(0, 240),
    url: "/notifications",
    tag: "wildlife-" + String(eventKey).slice(0, 80),
  });
  for (const subscription of subscriptions.rows) {
    await pool.query(
      `INSERT INTO notification_deliveries (event_key, subscription_id, user_id, channel, status, payload)
       VALUES ($1, $2, $3, 'web_push', 'queued', $4::jsonb)
       ON CONFLICT (event_key, subscription_id, channel) DO NOTHING`,
      [String(eventKey), subscription.id, subscription.user_id, payload]
    );
  }
  return { configured: true, queued: subscriptions.rowCount, eligible: subscriptions.rowCount };
}

export async function processPushOutbox(pool, logger = console) {
  if (!pushConfigured) return 0;
  const claimed = await pool.query(
    `WITH picked AS (
       SELECT id FROM notification_deliveries
       WHERE channel = 'web_push' AND status = 'queued' AND next_attempt_at <= now()
       ORDER BY created_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 20
     )
     UPDATE notification_deliveries d
     SET status = 'sending', attempts = attempts + 1
     FROM picked WHERE d.id = picked.id
     RETURNING d.id, d.subscription_id, d.payload, d.attempts`
  );

  for (const delivery of claimed.rows) {
    const subscription = delivery.subscription_id
      ? await pool.query("SELECT endpoint, p256dh, auth_secret FROM push_subscriptions WHERE id = $1", [delivery.subscription_id])
      : { rowCount: 0, rows: [] };
    if (!subscription.rowCount) {
      await pool.query("UPDATE notification_deliveries SET status = 'failed', error_code = 'subscription_missing' WHERE id = $1", [delivery.id]);
      continue;
    }
    try {
      await webpush.sendNotification({
        endpoint: subscription.rows[0].endpoint,
        keys: { p256dh: subscription.rows[0].p256dh, auth: subscription.rows[0].auth_secret },
      }, JSON.stringify(delivery.payload), { TTL: 300, urgency: "high" });
      await pool.query("UPDATE notification_deliveries SET status = 'sent', error_code = NULL WHERE id = $1", [delivery.id]);
    } catch (error) {
      const code = String(error.statusCode || error.code || "delivery_error").slice(0, 40);
      if ([404, 410].includes(Number(error.statusCode))) {
        await pool.query("DELETE FROM push_subscriptions WHERE id = $1", [delivery.subscription_id]);
        await pool.query("UPDATE notification_deliveries SET status = 'failed', error_code = $2 WHERE id = $1", [delivery.id, code]);
      } else if (delivery.attempts >= 5) {
        await pool.query("UPDATE notification_deliveries SET status = 'failed', error_code = $2 WHERE id = $1", [delivery.id, code]);
      } else {
        const backoffSeconds = Math.min(1800, 15 * (2 ** Number(delivery.attempts)));
        await pool.query(
          "UPDATE notification_deliveries SET status = 'queued', error_code = $2, next_attempt_at = now() + ($3 * interval '1 second') WHERE id = $1",
          [delivery.id, code, backoffSeconds]
        );
      }
      logger.warn?.({ errorCode: code, deliveryId: delivery.id }, "Push delivery failed");
    }
  }
  return claimed.rowCount;
}
