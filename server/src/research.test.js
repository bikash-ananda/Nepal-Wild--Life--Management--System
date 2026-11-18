import test from "node:test";
import assert from "node:assert/strict";
import { registerResearchRoutes } from "./research.js";

test("public research endpoint returns only published records in descending publication year", async () => {
  const routes = new Map();
  const rows = [
    { id: "study-1", data: { title: { np: "शीर्षक", en: "Title" }, year: 2025, status: "published" }, created_at: "2025-01-01", updated_at: "2025-01-02" },
  ];
  const pool = { query: async (sql, params) => {
    assert.match(sql, /data->>'status' = 'published'/);
    assert.match(sql, /ORDER BY CASE/);
    assert.deepEqual(params, [50]);
    return { rows };
  }};
  const app = { get: (path, handler) => routes.set(path, handler) };
  registerResearchRoutes(app, pool);
  const handler = routes.get("/api/public/research");
  const result = await handler({ query: { limit: "50" } });
  assert.equal(result.studies.length, 1);
  assert.equal(result.studies[0].id, "study-1");
  assert.equal(result.studies[0].status, "published");
});

test("public research endpoint clamps requested limit", async () => {
  let captured;
  const app = { get: (_path, handler) => { captured = handler; } };
  registerResearchRoutes(app, { query: async (_sql, params) => { assert.deepEqual(params, [200]); return { rows: [] }; } });
  const result = await captured({ query: { limit: "5000" } });
  assert.deepEqual(result, { studies: [] });
});
