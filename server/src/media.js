import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { addAudit, mediaRoot } from "./db.js";
import { canReadSite } from "./records.js";

const extensions = new Map([
  ["image/jpeg", ".jpg"], ["image/png", ".png"], ["image/webp", ".webp"], ["image/gif", ".gif"],
  ["video/mp4", ".mp4"], ["video/webm", ".webm"], ["application/pdf", ".pdf"],
  ["text/plain", ".txt"], ["text/csv", ".csv"],
]);

export function mediaIdFromUri(uri) {
  const match = String(uri || "").match(/(?:media:\/\/|\/api\/media\/)?([0-9a-f-]{36})/i);
  return match ? match[1] : null;
}

async function saveUpload(request, pool, visibility, actorId, requireConsent = false) {
  const part = await request.file();
  if (!part) throw Object.assign(new Error("Choose a file to upload."), { statusCode: 400 });
  if (requireConsent && part.fields?.consent?.value !== "true") {
    part.file.resume();
    throw Object.assign(new Error("Consent is required before uploading public wildlife photos."), { statusCode: 400 });
  }
  const contentType = String(part.mimetype || "").split(";")[0].toLowerCase();
  if (requireConsent && !contentType.startsWith("image/")) {
    part.file.resume();
    throw Object.assign(new Error("Public wildlife submissions accept image files only."), { statusCode: 415 });
  }
  const extension = extensions.get(contentType);
  if (!extension) {
    part.file.resume();
    throw Object.assign(new Error("This file type is not allowed."), { statusCode: 415 });
  }
  const id = randomUUID();
  const storageKey = id + extension;
  const destination = path.join(mediaRoot, storageKey);
  try {
    await mkdir(mediaRoot, { recursive: true });
    await pipeline(part.file, createWriteStream(destination, { flags: "wx" }));
    if (part.file.truncated) throw Object.assign(new Error("File exceeds the upload limit."), { statusCode: 413 });
    const fileStat = await stat(destination);
    const sha256 = createHash("sha256").update(await readFile(destination)).digest("hex");
    await pool.query(
      "INSERT INTO media_assets (id, storage_key, original_name, content_type, size_bytes, sha256, visibility, uploaded_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
      [id, storageKey, path.basename(part.filename || "upload" + extension).slice(0, 240), contentType, fileStat.size, sha256, visibility, actorId || null]
    );
    await addAudit(actorId, "media.upload", "MediaAsset", id, { content_type: contentType, size_bytes: fileStat.size });
    return { id, file_uri: "media://" + id, file_url: "/api/media/" + id, sha256, size_bytes: fileStat.size };
  } catch (error) {
    await unlink(destination).catch(() => {});
    if (error.code === "FST_REQ_FILE_TOO_LARGE") {
      throw Object.assign(new Error("File exceeds the upload limit."), { statusCode: 413 });
    }
    throw error;
  }
}

/** Store a camera-triggered JPEG using the same private media path as field uploads. */
export async function saveCameraSnapshot(pool, buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4 || buffer.length > 8 * 1024 * 1024 ||
      buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff) {
    throw Object.assign(new Error("The camera response was not a valid JPEG snapshot."), { statusCode: 502 });
  }
  const id = randomUUID();
  const storageKey = `${id}.jpg`;
  const destination = path.join(mediaRoot, storageKey);
  await mkdir(mediaRoot, { recursive: true });
  try {
    await writeFile(destination, buffer, { flag: "wx" });
    await pool.query(
      "INSERT INTO media_assets (id, storage_key, original_name, content_type, size_bytes, sha256, visibility, uploaded_by) VALUES ($1,$2,$3,'image/jpeg',$4,$5,'private',NULL)",
      [id, storageKey, `camera-event-${id}.jpg`, buffer.length, createHash("sha256").update(buffer).digest("hex")]
    );
  } catch (error) {
    await unlink(destination).catch(() => {});
    throw error;
  }
  return { id, file_uri: `media://${id}`, file_url: `/api/media/${id}`, size_bytes: buffer.length };
}

export async function deleteCameraSnapshot(pool, id) {
  const result = await pool.query("SELECT storage_key FROM media_assets WHERE id=$1", [id]);
  if (!result.rowCount) return;
  await unlink(path.join(mediaRoot, path.basename(result.rows[0].storage_key))).catch(() => {});
  await pool.query("DELETE FROM media_assets WHERE id=$1", [id]);
}

export async function pruneCameraSnapshots(pool, retentionDays = 30) {
  const requestedDays = Number(retentionDays);
  const days = Number.isFinite(requestedDays) ? Math.max(1, Math.min(365, requestedDays)) : 30;
  const result = await pool.query(
    `SELECT r.id AS event_id, m.id AS media_id, m.storage_key,
       CASE WHEN m.id IS NULL THEN false ELSE EXISTS (
         SELECT 1 FROM app_records other
         WHERE (other.entity <> 'CameraEvent' OR other.id <> r.id) AND (
           other.data->>'image_uri' = 'media://' || m.id::text OR
           other.data->>'photo_uri' = 'media://' || m.id::text OR
           other.data->>'image_url' = '/api/media/' || m.id::text OR
           other.data->>'photo_url' = '/api/media/' || m.id::text OR
           other.data->>'media_asset_id' = m.id::text OR
           other.data->'photos' @> jsonb_build_array('media://' || m.id::text) OR
           other.data->'photos' @> jsonb_build_array('/api/media/' || m.id::text)
         )
       ) END AS externally_referenced
     FROM app_records r LEFT JOIN media_assets m ON m.id::text = r.data->>'snapshot_asset_id'
     WHERE r.entity='CameraEvent' AND r.created_at < now() - make_interval(days => $1::int)
     ORDER BY r.created_at ASC`, [days]
  );
  let deletedEvents = 0;
  for (const row of result.rows) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const deleted = await client.query(
        `DELETE FROM app_records
         WHERE entity='CameraEvent' AND id=$1 AND created_at < now() - make_interval(days => $2::int)
         RETURNING id`, [row.event_id, days]
      );
      if (!deleted.rowCount) {
        await client.query("COMMIT");
        continue;
      }
      if (row.media_id && !row.externally_referenced) {
        try {
          await unlink(path.join(mediaRoot, path.basename(row.storage_key)));
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
        await client.query("DELETE FROM media_assets WHERE id=$1", [row.media_id]);
      }
      await client.query("COMMIT");
      deletedEvents += 1;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
  return deletedEvents;
}

export function registerMediaRoutes(app, pool, requireAuth, checkOrigin) {
  app.post("/api/uploads", { preHandler: requireAuth }, async (request, reply) => {
    const result = await saveUpload(request, pool, "private", request.user.id);
    return reply.code(201).send(result);
  });

  app.post("/api/public/uploads", { config: { rateLimit: { max: 8, timeWindow: "1 hour" } } }, async (request, reply) => {
    if (!checkOrigin(request, reply)) return;
    const result = await saveUpload(request, pool, "private", null, true);
    return reply.code(201).send(result);
  });

  app.post("/api/media/signed-url", { preHandler: requireAuth }, async (request, reply) => {
    const id = mediaIdFromUri(request.body?.file_uri);
    if (!id) return reply.code(400).send({ error: "Invalid file reference." });
    const result = await pool.query("SELECT id, uploaded_by FROM media_assets WHERE id = $1", [id]);
    if (!result.rowCount || !(await canAccessMedia(pool, request.user, id, result.rows[0].uploaded_by))) {
      return reply.code(404).send({ error: "File not found." });
    }
    return { signed_url: "/api/media/" + id, file_url: "/api/media/" + id };
  });

  app.get("/api/media/:id", { preHandler: requireAuth }, async (request, reply) => {
    const result = await pool.query("SELECT storage_key, content_type, uploaded_by FROM media_assets WHERE id = $1", [request.params.id]);
    if (!result.rowCount || !(await canAccessMedia(pool, request.user, request.params.id, result.rows[0].uploaded_by))) {
      return reply.code(404).send({ error: "File not found." });
    }
    const filePath = path.join(mediaRoot, path.basename(result.rows[0].storage_key));
    reply.header("Cache-Control", "private, no-store");
    reply.type(result.rows[0].content_type);
    return reply.send(createReadStream(filePath));
  });
}

export async function canAccessMedia(pool, user, id, uploadedBy) {
  if (String(uploadedBy || "") === String(user.id)) return true;
  const uri = "media://" + id;
  const url = "/api/media/" + id;
  const result = await pool.query(
    `SELECT entity, id, data FROM app_records
     WHERE data->'photos' @> jsonb_build_array($1::text)
        OR data->>'image_uri' = $1
        OR data->>'photo_uri' = $1
        OR data->>'image_url' = $2
        OR data->>'media_asset_id' = $3`,
    [uri, url, id]
  );
  return result.rows.some((row) => {
    const record = { ...row.data, id: row.id };
    if (["admin", "researcher", "reviewer"].includes(user.role)) return canReadSite(user, record);
    return Boolean(record.site_id) && canReadSite(user, record);
  });
}
