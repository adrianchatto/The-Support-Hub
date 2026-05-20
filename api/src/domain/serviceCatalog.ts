import { z } from "zod";
import { getPool } from "../db/client.js";

export type ApplicationStatus = "active" | "inactive";
export type ApplicationCriticality = "low" | "medium" | "high" | "critical";

export type Application = {
  id: string;
  name: string;
  description: string | null;
  owner_user_id: string | null;
  status: ApplicationStatus;
  criticality: ApplicationCriticality;
  created_at: Date;
  updated_at: Date;
};

export type TicketCategory = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: Date;
  updated_at: Date;
};

const ApplicationSchema = z.object({
  name: z.string().min(1, "name is required"),
  description: z.string().optional(),
  ownerUserId: z.string().uuid().optional(),
  status: z.enum(["active", "inactive"]).optional().default("active"),
  criticality: z.enum(["low", "medium", "high", "critical"]).optional().default("medium"),
});

const UpdateApplicationSchema = ApplicationSchema.partial();

const TicketCategorySchema = z.object({
  name: z.string().min(1, "name is required"),
  description: z.string().optional(),
  active: z.boolean().optional().default(true),
});

const UpdateTicketCategorySchema = TicketCategorySchema.partial();

export type CreateApplicationInput = z.input<typeof ApplicationSchema>;
export type UpdateApplicationInput = z.input<typeof UpdateApplicationSchema>;
export type CreateTicketCategoryInput = z.input<typeof TicketCategorySchema>;
export type UpdateTicketCategoryInput = z.input<typeof UpdateTicketCategorySchema>;

export async function listApplications(): Promise<Application[]> {
  const pool = getPool();
  const result = await pool.query<Application>(
    `SELECT * FROM applications ORDER BY status ASC, name ASC`
  );
  return result.rows;
}

export async function createApplication(input: CreateApplicationInput): Promise<Application> {
  const data = ApplicationSchema.parse(input);
  const pool = getPool();

  const result = await pool.query<Application>(
    `INSERT INTO applications (name, description, owner_user_id, status, criticality)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (name) DO UPDATE
     SET description   = EXCLUDED.description,
         owner_user_id = EXCLUDED.owner_user_id,
         status        = EXCLUDED.status,
         criticality   = EXCLUDED.criticality,
         updated_at    = NOW()
     RETURNING *`,
    [
      data.name,
      data.description ?? null,
      data.ownerUserId ?? null,
      data.status,
      data.criticality,
    ]
  );

  return result.rows[0];
}

export async function updateApplication(id: string, input: UpdateApplicationInput): Promise<Application> {
  const data = UpdateApplicationSchema.parse(input);
  const pool = getPool();
  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [id];
  let idx = 2;

  if (data.name !== undefined)        { sets.push(`name = $${idx++}`);          params.push(data.name); }
  if (data.description !== undefined) { sets.push(`description = $${idx++}`);   params.push(data.description); }
  if (data.ownerUserId !== undefined) { sets.push(`owner_user_id = $${idx++}`); params.push(data.ownerUserId); }
  if (data.status !== undefined)      { sets.push(`status = $${idx++}`);        params.push(data.status); }
  if (data.criticality !== undefined) { sets.push(`criticality = $${idx++}`);   params.push(data.criticality); }

  const result = await pool.query<Application>(
    `UPDATE applications SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );

  if (!result.rows[0]) throw new Error(`Application ${id} not found`);
  return result.rows[0];
}

export async function deleteApplication(id: string): Promise<void> {
  const pool = getPool();
  await pool.query(`UPDATE applications SET status = 'inactive', updated_at = NOW() WHERE id = $1`, [id]);
}

export async function listTicketCategories(): Promise<TicketCategory[]> {
  const pool = getPool();
  const result = await pool.query<TicketCategory>(
    `SELECT * FROM ticket_categories ORDER BY active DESC, name ASC`
  );
  return result.rows;
}

export async function createTicketCategory(input: CreateTicketCategoryInput): Promise<TicketCategory> {
  const data = TicketCategorySchema.parse(input);
  const pool = getPool();

  const result = await pool.query<TicketCategory>(
    `INSERT INTO ticket_categories (name, description, active)
     VALUES ($1, $2, $3)
     ON CONFLICT (name) DO UPDATE
     SET description = EXCLUDED.description,
         active      = EXCLUDED.active,
         updated_at  = NOW()
     RETURNING *`,
    [data.name, data.description ?? null, data.active]
  );

  return result.rows[0];
}

export async function updateTicketCategory(id: string, input: UpdateTicketCategoryInput): Promise<TicketCategory> {
  const data = UpdateTicketCategorySchema.parse(input);
  const pool = getPool();
  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [id];
  let idx = 2;

  if (data.name !== undefined)        { sets.push(`name = $${idx++}`);        params.push(data.name); }
  if (data.description !== undefined) { sets.push(`description = $${idx++}`); params.push(data.description); }
  if (data.active !== undefined)      { sets.push(`active = $${idx++}`);      params.push(data.active); }

  const result = await pool.query<TicketCategory>(
    `UPDATE ticket_categories SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );

  if (!result.rows[0]) throw new Error(`Ticket category ${id} not found`);
  return result.rows[0];
}

export async function deleteTicketCategory(id: string): Promise<void> {
  const pool = getPool();
  await pool.query(`UPDATE ticket_categories SET active = false, updated_at = NOW() WHERE id = $1`, [id]);
}
