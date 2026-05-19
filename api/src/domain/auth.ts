import { compare } from "bcryptjs";
import { getPool } from "../db/client.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = "agent" | "supervisor" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(
  email: string,
  password: string
): Promise<AuthUser> {
  const pool = getPool();

  const result = await pool.query<AuthUser & { password_hash: string | null }>(
    `SELECT id, email, name, role, password_hash FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );

  const user = result.rows[0];

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (!user.password_hash) {
    throw new Error("This account has no password set. Contact your administrator.");
  }

  const valid = await compare(password, user.password_hash);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  return {
    id:    user.id,
    email: user.email,
    name:  user.name,
    role:  user.role as UserRole,
  };
}
