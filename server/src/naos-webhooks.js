import { createHmac } from "node:crypto";

function webhookConfig() {
  const endpoint = String(process.env.NAOS_WEBHOOK_URL || "").trim();
  const secret = String(process.env.NAOS_WEBHOOK_SECRET || "");
  if (!endpoint || secret.length < 32) return null;
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return { endpoint: url.toString(), secret };
  } catch { return null; }
}

export async function processNaosWebhookOutbox(pool, logger = console) {
  const config = webhookConfig();
  if (!config) return 0;
  const client = await pool.connect();
  let rows = [];
  try {
    await client.query("BEGIN");
    const selected = await client.query(
      "SELECT id,event_type,payload,attempts FROM naos_webhook_outbox WHERE status IN ('queued','failed') AND next_attempt_at <= now() ORDER BY created_at ASC LIMIT 10 FOR UPDATE SKIP LOCKED"
    );
    rows = selected.rows;
    for (const row of rows) {
      await client.query(
        "UPDATE naos_webhook_outbox SET status='sending', attempts=attempts+1 WHERE id=$1",
        [row.id]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }

  let delivered = 0;
  for (const row of rows) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({
      event_id: String(row.id),
      event_type: row.event_type,
      occurred_at: new Date().toISOString(),
      data: row.payload,
    });
    const signature = createHmac("sha256", config.secret).update(timestamp + "." + body).digest("hex");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(config.endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "X-WLMS-Event": row.event_type,
          "X-WLMS-Delivery": String(row.id),
          "X-WLMS-Timestamp": timestamp,
          "X-WLMS-Signature": "sha256=" + signature,
        },
        body,
      });
      if (!response.ok) throw new Error("NAOS webhook returned HTTP " + response.status);
      await pool.query(
        "UPDATE naos_webhook_outbox SET status='delivered', delivered_at=now(), last_error='' WHERE id=$1",
        [row.id]
      );
      delivered += 1;
    } catch (error) {
      const attempts = Number(row.attempts || 0) + 1;
      const delaySeconds = Math.min(86400, 30 * (2 ** Math.min(attempts, 10)));
      await pool.query(
        "UPDATE naos_webhook_outbox SET status='failed', next_attempt_at=now() + make_interval(secs => $2::int), last_error=$3 WHERE id=$1",
        [row.id, delaySeconds, String(error.message || "delivery failed").slice(0, 300)]
      );
      logger.warn?.({ event_id: row.id, attempts, err: error }, "NAOS webhook delivery failed");
    } finally {
      clearTimeout(timeout);
    }
  }
  return delivered;
}
