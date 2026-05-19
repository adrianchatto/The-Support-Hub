import { z } from "zod";
import { getPool } from "../db/client.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SlaPolicy = {
  id: string;
  name: string;
  priority: string;
  category: string | null;
  first_response_minutes: number;
  resolution_minutes: number;
  created_at: Date;
};

// ─── Input schemas ────────────────────────────────────────────────────────────

const UpsertSlaPolicySchema = z.object({
  name: z.string().min(1),
  priority: z.enum(["P1", "P2", "P3", "P4"]),
  category: z.string().optional(),
  firstResponseMinutes: z.number().int().positive(),
  resolutionMinutes: z.number().int().positive(),
});

export type UpsertSlaPolicyInput = z.input<typeof UpsertSlaPolicySchema>;

// ─── Domain functions ─────────────────────────────────────────────────────────

export async function listSlaPolicies(): Promise<SlaPolicy[]> {
  const pool = getPool();
  const result = await pool.query<SlaPolicy>(
    `SELECT * FROM sla_policies ORDER BY priority ASC, name ASC`
  );
  return result.rows;
}

export async function upsertSlaPolicy(input: UpsertSlaPolicyInput): Promise<SlaPolicy> {
  const data = UpsertSlaPolicySchema.parse(input);
  const pool = getPool();

  const result = await pool.query<SlaPolicy>(
    `INSERT INTO sla_policies (name, priority, category, first_response_minutes, resolution_minutes)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (name) DO UPDATE SET
       priority                 = EXCLUDED.priority,
       category                 = EXCLUDED.category,
       first_response_minutes   = EXCLUDED.first_response_minutes,
       resolution_minutes       = EXCLUDED.resolution_minutes
     RETURNING *`,
    [data.name, data.priority, data.category ?? null, data.firstResponseMinutes, data.resolutionMinutes]
  );

  return result.rows[0];
}

export async function deleteSlaPolicy(id: string): Promise<void> {
  const pool = getPool();
  await pool.query(`DELETE FROM sla_policies WHERE id = $1`, [id]);
}

// ─── SLA compliance query ─────────────────────────────────────────────────────

export type SlaStatus = "green" | "amber" | "red" | "none";

export type SlaComplianceSummary = {
  total: number;
  green: number;   // within SLA
  amber: number;   // within 80% of SLA window
  red: number;     // breached
  none: number;    // no SLA policy attached
  compliance_pct: number;
};

export async function getSlaComplianceSummary(): Promise<SlaComplianceSummary> {
  const pool = getPool();

  const result = await pool.query<{
    total: string;
    green: string;
    amber: string;
    red: string;
    none: string;
  }>(`
    WITH open_tickets AS (
      SELECT
        t.id,
        t.first_response_due_at,
        t.resolution_due_at,
        t.sla_policy_id,
        NOW() AS now
      FROM tickets t
      WHERE t.status NOT IN ('Resolved', 'Closed')
    ),
    classified AS (
      SELECT
        id,
        CASE
          WHEN sla_policy_id IS NULL THEN 'none'
          WHEN resolution_due_at IS NOT NULL AND now > resolution_due_at THEN 'red'
          WHEN resolution_due_at IS NOT NULL AND now > (resolution_due_at - (resolution_due_at - now) * 0.2) THEN 'amber'
          ELSE 'green'
        END AS rag
      FROM open_tickets
    )
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE rag = 'green') AS green,
      COUNT(*) FILTER (WHERE rag = 'amber') AS amber,
      COUNT(*) FILTER (WHERE rag = 'red')   AS red,
      COUNT(*) FILTER (WHERE rag = 'none')  AS none
    FROM classified
  `);

  const row = result.rows[0];
  const total = parseInt(row.total, 10);
  const green = parseInt(row.green, 10);
  const amber = parseInt(row.amber, 10);
  const red   = parseInt(row.red,   10);
  const none  = parseInt(row.none,  10);
  const tracked = total - none;

  return {
    total,
    green,
    amber,
    red,
    none,
    compliance_pct: tracked > 0 ? Math.round((green / tracked) * 100) : 100,
  };
}
