import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getPool, closePool } from "./client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate(): Promise<void> {
  const pool = getPool();
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf8");

  try {
    await pool.query(sql);
    console.log("✓ Migration complete");
  } finally {
    await closePool();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
