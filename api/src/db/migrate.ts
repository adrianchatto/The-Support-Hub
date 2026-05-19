import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { hash } from "bcryptjs";
import { getPool, closePool } from "./client.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate(): Promise<void> {
  const pool = getPool();
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf8");

  try {
    await pool.query(sql);
    console.log("✓ Schema applied");

    // Seed default admin user (idempotent — skips if email already exists)
    const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? "admin@supporthub.local";
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "Admin1234!";
    const ADMIN_NAME     = process.env.ADMIN_NAME     ?? "Support Hub Admin";

    const existing = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      [ADMIN_EMAIL]
    );

    if (existing.rows.length === 0) {
      const passwordHash = await hash(ADMIN_PASSWORD, 12);
      await pool.query(
        `INSERT INTO users (email, name, role, password_hash)
         VALUES ($1, $2, 'admin', $3)`,
        [ADMIN_EMAIL, ADMIN_NAME, passwordHash]
      );
      console.log(`✓ Default admin seeded: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
    } else {
      console.log(`✓ Admin user already exists, skipping seed`);
    }

    console.log("✓ Migration complete");
  } finally {
    await closePool();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
