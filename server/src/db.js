import pg from "pg";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";

const { Pool } = pg;

export const mediaRoot = path.resolve(process.env.MEDIA_ROOT || "./data/media");
export const pool = new Pool({
  host: process.env.PGHOST || "127.0.0.1",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "nepal_wildlife",
  user: process.env.PGUSER || "wildlife",
  password: process.env.PGPASSWORD || "wildlife-dev-only",
  max: Number(process.env.PGPOOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function migrate() {
  const sql = await readFile(new URL("../schema.sql", import.meta.url), "utf8");
  await pool.query(sql);
  await mkdir(mediaRoot, { recursive: true });
}

export async function addAudit(actorId, action, entity = null, recordId = null, metadata = {}) {
  try {
    await pool.query(
      "INSERT INTO audit_events (actor_id, action, entity, record_id, metadata) VALUES ($1, $2, $3, $4, $5::jsonb)",
      [actorId || null, action, entity, recordId || null, JSON.stringify(metadata)]
    );
  } catch (error) {
    console.error("Audit event insert failed", error.message);
  }
}
