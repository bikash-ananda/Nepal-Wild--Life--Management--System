import { createHash, randomUUID } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, readFile, stat, unlink } from "node:fs/promises";
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

async function saveUpload(request, pool, visibility, actorId) {
  const part = await request.file();
  if (!part) throw Object.assign(new Error("Choose a file to upload."), { statusCode: 400 });
  const contentType = String(part.mimetype || "").split(";")[0].toLowerCase();
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

export function registerMediaRoutes(app, pool, requireAuth) {
  app.post("/api/uploads", { preHandler: requireAuth }, async (request, reply) => {
    const result = await saveUpload(request, pool, "private", request.user.id);
    return reply.code(201).send(result);
  });

  app.post("/api/public/uploads", { config: { rateLimit: { max: 8, timeWindow: "1 hour" } } }, async (request, reply) => {
    const result = await saveUpload(request, pool, "private", null);
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
