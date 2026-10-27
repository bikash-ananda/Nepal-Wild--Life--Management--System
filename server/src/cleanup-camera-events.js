import { pool } from "./db.js";
import { pruneCameraSnapshots } from "./media.js";

try {
  const deleted = await pruneCameraSnapshots(pool, process.env.CAMERA_SNAPSHOT_RETENTION_DAYS || 30);
  console.log(`Deleted ${deleted} expired camera event record(s).`);
} catch (error) {
  console.error("Camera event cleanup failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
