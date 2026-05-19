import { z } from "zod";
import { getPool } from "../db/client.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  department: string | null;
  location: string | null;
  domain: string | null;
  created_at: Date;
  updated_at: Date;
};

// ─── Input schemas ────────────────────────────────────────────────────────────

const CreateCustomerSchema = z.object({
  name: z.string().min(1, "name is required"),
  phone: z.string().optional(),
  email: z.string().email("invalid email").optional(),
  department: z.string().optional(),
  location: z.string().optional(),
});

export type CreateCustomerInput = z.input<typeof CreateCustomerSchema>;

const UpdateCustomerSchema = CreateCustomerSchema.partial();
export type UpdateCustomerInput = z.input<typeof UpdateCustomerSchema>;

// ─── Domain functions ─────────────────────────────────────────────────────────

export async function createCustomer(input: CreateCustomerInput): Promise<Customer> {
  const data = CreateCustomerSchema.parse(input);
  const pool = getPool();

  const result = await pool.query<Customer>(
    `INSERT INTO customers (name, phone, email, department, location)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.name, data.phone ?? null, data.email ?? null, data.department ?? null, data.location ?? null]
  );

  return result.rows[0];
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const pool = getPool();
  const result = await pool.query<Customer>(`SELECT * FROM customers WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function listCustomers(search?: string): Promise<Customer[]> {
  const pool = getPool();

  if (search) {
    const result = await pool.query<Customer>(
      `SELECT * FROM customers
       WHERE name ILIKE $1 OR email ILIKE $1 OR department ILIKE $1
       ORDER BY name ASC LIMIT 100`,
      [`%${search}%`]
    );
    return result.rows;
  }

  const result = await pool.query<Customer>(
    `SELECT * FROM customers ORDER BY name ASC LIMIT 200`
  );
  return result.rows;
}

export async function updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
  const data = UpdateCustomerSchema.parse(input);
  const pool = getPool();

  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [id];
  let idx = 2;

  if (data.name !== undefined)       { sets.push(`name = $${idx++}`);       params.push(data.name); }
  if (data.phone !== undefined)      { sets.push(`phone = $${idx++}`);      params.push(data.phone); }
  if (data.email !== undefined)      { sets.push(`email = $${idx++}`);      params.push(data.email); }
  if (data.department !== undefined) { sets.push(`department = $${idx++}`); params.push(data.department); }
  if (data.location !== undefined)   { sets.push(`location = $${idx++}`);   params.push(data.location); }

  const result = await pool.query<Customer>(
    `UPDATE customers SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );

  if (!result.rows[0]) throw new Error(`Customer ${id} not found`);
  return result.rows[0];
}

export async function deleteCustomer(id: string): Promise<void> {
  const pool = getPool();
  // Clear all FK references — contacts, tickets — before deleting
  await pool.query(`DELETE FROM contacts WHERE customer_id = $1`, [id]);
  await pool.query(`UPDATE tickets SET customer_id = NULL WHERE customer_id = $1`, [id]);
  await pool.query(`DELETE FROM customers WHERE id = $1`, [id]);
}
