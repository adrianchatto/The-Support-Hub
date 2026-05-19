import { z } from "zod";
import { hash } from "bcryptjs";
import { getPool } from "../db/client.js";
import type { UserRole } from "./auth.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  team_id: string | null;
  created_at: Date;
};

// ─── Input schemas ────────────────────────────────────────────────────────────

const CreateUserSchema = z.object({
  email:    z.string().email("invalid email"),
  name:     z.string().min(1, "name is required"),
  role:     z.enum(["agent", "supervisor", "admin"]),
  password: z.string().min(8, "password must be at least 8 characters"),
  teamId:   z.string().uuid().optional(),
});

export type CreateUserInput = z.input<typeof CreateUserSchema>;

const UpdateUserSchema = z.object({
  name:     z.string().min(1).optional(),
  role:     z.enum(["agent", "supervisor", "admin"]).optional(),
  password: z.string().min(8).optional(),
  teamId:   z.string().uuid().nullable().optional(),
});

export type UpdateUserInput = z.input<typeof UpdateUserSchema>;

// ─── Domain functions ─────────────────────────────────────────────────────────

export async function createUser(input: CreateUserInput): Promise<User> {
  const data = CreateUserSchema.parse(input);
  const pool = getPool();

  const passwordHash = await hash(data.password, 12);

  const result = await pool.query<User>(
    `INSERT INTO users (email, name, role, password_hash, team_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, name, role, team_id, created_at`,
    [
      data.email.toLowerCase().trim(),
      data.name,
      data.role,
      passwordHash,
      data.teamId ?? null,
    ]
  );

  return result.rows[0];
}

export async function listUsers(): Promise<User[]> {
  const pool = getPool();
  const result = await pool.query<User>(
    `SELECT id, email, name, role, team_id, created_at
     FROM users
     ORDER BY name ASC`
  );
  return result.rows;
}

export async function listAgents(): Promise<User[]> {
  const pool = getPool();
  const result = await pool.query<User>(
    `SELECT id, email, name, role, team_id, created_at
     FROM users
     WHERE role IN ('agent', 'supervisor')
     ORDER BY name ASC`
  );
  return result.rows;
}

export async function getUser(id: string): Promise<User | null> {
  const pool = getPool();
  const result = await pool.query<User>(
    `SELECT id, email, name, role, team_id, created_at FROM users WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<User> {
  const data = UpdateUserSchema.parse(input);
  const pool = getPool();

  const sets: string[] = [];
  const params: unknown[] = [id];
  let idx = 2;

  if (data.name !== undefined)     { sets.push(`name = $${idx++}`);    params.push(data.name); }
  if (data.role !== undefined)     { sets.push(`role = $${idx++}`);    params.push(data.role); }
  if (data.teamId !== undefined)   { sets.push(`team_id = $${idx++}`); params.push(data.teamId); }
  if (data.password !== undefined) {
    const passwordHash = await hash(data.password, 12);
    sets.push(`password_hash = $${idx++}`);
    params.push(passwordHash);
  }

  if (sets.length === 0) throw new Error("No fields to update");

  const result = await pool.query<User>(
    `UPDATE users SET ${sets.join(", ")} WHERE id = $1
     RETURNING id, email, name, role, team_id, created_at`,
    params
  );

  if (!result.rows[0]) throw new Error(`User ${id} not found`);
  return result.rows[0];
}

export async function deleteUser(id: string): Promise<void> {
  const pool = getPool();
  // Unassign tickets rather than blocking the delete
  await pool.query(`UPDATE tickets SET assigned_agent_id = NULL WHERE assigned_agent_id = $1`, [id]);
  await pool.query(`DELETE FROM users WHERE id = $1`, [id]);
}
