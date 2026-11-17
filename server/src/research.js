import { randomUUID } from "node:crypto";

export function registerResearchRoutes(app, pool) {
  app.get("/api/public/research", async (request) => {
    const limit = Math.max(1, Math.min(200, Number(request.query.limit) || 100));
    const result = await pool.query(
      "SELECT id, data, created_at, updated_at FROM app_records WHERE entity = 'ResearchStudy' AND data->>'status' = 'published' ORDER BY COALESCE((data->>'year')::int, 0) DESC, created_at DESC LIMIT $1",
      [limit]
    );
    return { studies: result.rows.map((row) => ({ ...row.data, id: row.id, created_at: row.created_at, updated_at: row.updated_at })) };
  });
}
