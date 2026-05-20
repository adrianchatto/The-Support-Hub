import { z } from "zod";
import type { DatabaseError } from "pg";
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

function isMissingCatalogTableError(error: unknown): error is DatabaseError {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && (error as { code?: string }).code === "42P01";
}

async function ensureServiceCatalogSchema(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    CREATE TABLE IF NOT EXISTS applications (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name          TEXT NOT NULL UNIQUE,
      description   TEXT,
      owner_user_id UUID,
      status        TEXT NOT NULL DEFAULT 'active',
      criticality   TEXT NOT NULL DEFAULT 'medium',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS owner_user_id UUID;
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS criticality TEXT NOT NULL DEFAULT 'medium';
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    CREATE TABLE IF NOT EXISTS ticket_categories (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name        TEXT NOT NULL UNIQUE,
      description TEXT,
      active      BOOLEAN NOT NULL DEFAULT true,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE ticket_categories ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE ticket_categories ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE ticket_categories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE ticket_categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

    CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_name_unique ON applications(name);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_ticket_categories_name_unique ON ticket_categories(name);
  `);
}

async function seedDefaultServiceCatalog(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    INSERT INTO applications (name, description, status, criticality)
    VALUES
      ('Microsoft 365', 'Email, Teams, SharePoint and OneDrive support.', 'active', 'high'),
      ('Customer Portal', 'External customer self-service and account access.', 'active', 'critical'),
      ('CRM', 'Customer relationship management and account records.', 'active', 'high'),
      ('Finance System', 'Billing, invoicing and payment operations.', 'active', 'medium'),
      ('Endpoint Devices', 'Laptops, mobile devices and desktop tooling.', 'active', 'medium')
    ON CONFLICT (name) DO NOTHING;
  `);
  await pool.query(`
    INSERT INTO ticket_categories (name, description, active)
    VALUES
      ('Access', 'Login, permissions, password and account access work.', true),
      ('Incident', 'Faults, outages, break-fix and service degradation.', true),
      ('How-to Question', 'Usage guidance and process questions.', true),
      ('Data Issue', 'Incorrect, duplicate, missing or stale business data.', true),
      ('Service Request', 'Standard fulfilment requests and low-risk changes.', true),
      ('Integration', 'API, sync, import/export and connected system issues.', true)
    ON CONFLICT (name) DO NOTHING;
  `);
}

export async function listApplications(): Promise<Application[]> {
  const pool = getPool();
  await ensureServiceCatalogSchema();
  await seedDefaultServiceCatalog();
  try {
    const result = await pool.query<Application>(
      `SELECT * FROM applications ORDER BY status ASC, name ASC`
    );
    return result.rows;
  } catch (error) {
    if (isMissingCatalogTableError(error)) return [];
    throw error;
  }
}

export async function createApplication(input: CreateApplicationInput): Promise<Application> {
  const data = ApplicationSchema.parse(input);
  const pool = getPool();
  await ensureServiceCatalogSchema();

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
  await ensureServiceCatalogSchema();
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
  await ensureServiceCatalogSchema();
  await pool.query(`UPDATE applications SET status = 'inactive', updated_at = NOW() WHERE id = $1`, [id]);
}

export async function listTicketCategories(): Promise<TicketCategory[]> {
  const pool = getPool();
  await ensureServiceCatalogSchema();
  await seedDefaultServiceCatalog();
  try {
    const result = await pool.query<TicketCategory>(
      `SELECT * FROM ticket_categories ORDER BY active DESC, name ASC`
    );
    return result.rows;
  } catch (error) {
    if (isMissingCatalogTableError(error)) return [];
    throw error;
  }
}

export async function createTicketCategory(input: CreateTicketCategoryInput): Promise<TicketCategory> {
  const data = TicketCategorySchema.parse(input);
  const pool = getPool();
  await ensureServiceCatalogSchema();

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
  await ensureServiceCatalogSchema();
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
  await ensureServiceCatalogSchema();
  await pool.query(`UPDATE ticket_categories SET active = false, updated_at = NOW() WHERE id = $1`, [id]);
}
