import { z } from "zod";
import { getPool } from "../db/client.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProblemStatus = "Open" | "Under Investigation" | "Resolved" | "Closed";

export type Problem = {
  id: string;
  title: string;
  description: string | null;
  status: ProblemStatus;
  created_at: Date;
  updated_at: Date;
};

// ─── Input schemas ────────────────────────────────────────────────────────────

const CreateProblemSchema = z.object({
  title:       z.string().min(1, "title is required"),
  description: z.string().optional(),
});

export type CreateProblemInput = z.input<typeof CreateProblemSchema>;

const UpdateProblemSchema = z.object({
  title:       z.string().min(1).optional(),
  description: z.string().optional(),
  status:      z.enum(["Open", "Under Investigation", "Resolved", "Closed"]).optional(),
});

export type UpdateProblemInput = z.input<typeof UpdateProblemSchema>;

// ─── Domain functions ─────────────────────────────────────────────────────────

export async function createProblem(input: CreateProblemInput): Promise<Problem> {
  const data = CreateProblemSchema.parse(input);
  const pool = getPool();

  const result = await pool.query<Problem>(
    `INSERT INTO problems (title, description) VALUES ($1, $2) RETURNING *`,
    [data.title, data.description ?? null]
  );

  return result.rows[0];
}

export async function listProblems(): Promise<Problem[]> {
  const pool = getPool();
  const result = await pool.query<Problem>(
    `SELECT * FROM problems ORDER BY updated_at DESC`
  );
  return result.rows;
}

export async function getProblem(id: string): Promise<Problem | null> {
  const pool = getPool();
  const result = await pool.query<Problem>(`SELECT * FROM problems WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function updateProblem(id: string, input: UpdateProblemInput): Promise<Problem> {
  const data = UpdateProblemSchema.parse(input);
  const pool = getPool();

  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [id];
  let idx = 2;

  if (data.title !== undefined)       { sets.push(`title = $${idx++}`);       params.push(data.title); }
  if (data.description !== undefined) { sets.push(`description = $${idx++}`); params.push(data.description); }
  if (data.status !== undefined)      { sets.push(`status = $${idx++}`);      params.push(data.status); }

  const result = await pool.query<Problem>(
    `UPDATE problems SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );

  if (!result.rows[0]) throw new Error(`Problem ${id} not found`);
  return result.rows[0];
}

export async function deleteProblem(id: string): Promise<void> {
  const pool = getPool();
  // Unlink all tickets before deleting
  await pool.query(`UPDATE tickets SET problem_id = NULL WHERE problem_id = $1`, [id]);
  await pool.query(`DELETE FROM problems WHERE id = $1`, [id]);
}

export async function linkTicketToProblem(ticketId: string, problemId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE tickets SET problem_id = $1, updated_at = NOW() WHERE id = $2`,
    [problemId, ticketId]
  );
}

export async function unlinkTicketFromProblem(ticketId: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    `UPDATE tickets SET problem_id = NULL, updated_at = NOW() WHERE id = $1`,
    [ticketId]
  );
}

export async function listProblemTickets(problemId: string): Promise<{ id: string; summary: string; status: string; priority: string; customer_name: string }[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, summary, status, priority, customer_name
     FROM tickets WHERE problem_id = $1 ORDER BY created_at ASC`,
    [problemId]
  );
  return result.rows;
}
