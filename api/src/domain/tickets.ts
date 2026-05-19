import { z } from "zod";
import { getPool } from "../db/client.js";

// ─── Types ────────────────────────────────────────────────────────────────────

const CHANNELS = ["Email", "Phone", "Chat", "Portal"] as const;
const PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
const STATUSES = ["New", "Open", "Pending", "Resolved", "Closed"] as const;
const VISIBILITIES = ["internal", "customer"] as const;
const TICKET_TYPES = ["incident", "service_request", "question"] as const;

export type SupportChannel = (typeof CHANNELS)[number];
export type TicketPriority = (typeof PRIORITIES)[number];
export type TicketStatus = (typeof STATUSES)[number];
export type MessageVisibility = (typeof VISIBILITIES)[number];
export type TicketType = (typeof TICKET_TYPES)[number];

export type Ticket = {
  id: string;
  customer_name: string;
  contact_name: string | null;
  summary: string;
  description: string | null;
  channel: SupportChannel;
  priority: TicketPriority;
  status: TicketStatus;
  ticket_type: TicketType;
  category: string | null;
  assigned_team_id: string | null;
  assigned_agent_id: string | null;
  problem_id: string | null;
  first_response_due_at: Date | null;
  resolution_due_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type TicketMessage = {
  id: string;
  ticket_id: string;
  author_name: string;
  body: string;
  visibility: MessageVisibility;
  created_at: Date;
};

// ─── Input schemas (Zod) ──────────────────────────────────────────────────────

const CreateTicketSchema = z.object({
  customerName: z.string().min(1, "customerName is required"),
  contactName: z.string().optional(),
  summary: z.string().min(1, "summary is required"),
  description: z.string().optional(),
  channel: z.enum(CHANNELS, { errorMap: () => ({ message: "Invalid channel" }) }),
  priority: z.enum(PRIORITIES, { errorMap: () => ({ message: "Invalid priority" }) }),
  ticketType: z.enum(TICKET_TYPES).optional().default("incident"),
  category: z.string().optional(),
  sourceRef: z.string().optional(),
  customerId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
});

export type CreateTicketInput = z.input<typeof CreateTicketSchema>;

const UpdateStatusSchema = z.object({
  status: z.enum(STATUSES, { errorMap: () => ({ message: "Invalid status" }) }),
});

const AddMessageSchema = z.object({
  ticketId: z.string(),
  authorName: z.string().min(1),
  authorId: z.string().uuid().optional(),
  body: z.string().min(1),
  visibility: z.enum(VISIBILITIES, { errorMap: () => ({ message: "Invalid visibility" }) }),
});

export type AddTicketMessageInput = z.input<typeof AddMessageSchema>;

// ─── Domain functions ─────────────────────────────────────────────────────────

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const data = CreateTicketSchema.parse(input);
  const pool = getPool();

  // Generate stable human-readable ticket ID
  const seqResult = await pool.query(`SELECT nextval('ticket_seq') AS nextval`);
  const ticketId = `TCK-${seqResult.rows[0].nextval}`;

  // Resolve SLA policy by priority
  const ticketResult = await pool.query<Ticket>(
    `INSERT INTO tickets (
       id, customer_name, contact_name, summary, description,
       channel, priority, status, ticket_type, category, source_ref,
       customer_id, contact_id
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,'New',$8,$9,$10,$11,$12)
     RETURNING *`,
    [
      ticketId,
      data.customerName,
      data.contactName ?? null,
      data.summary,
      data.description ?? null,
      data.channel,
      data.priority,
      data.ticketType,
      data.category ?? null,
      data.sourceRef ?? null,
      data.customerId ?? null,
      data.contactId ?? null,
    ]
  );

  const ticket = ticketResult.rows[0];

  // Append-only reporting event
  await pool.query(
    `INSERT INTO reporting_events (event_type, ticket_id, channel, priority, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      "ticket.created",
      ticket.id,
      ticket.channel,
      ticket.priority,
      JSON.stringify({ customerName: ticket.customer_name, summary: ticket.summary }),
    ]
  );

  return ticket;
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const pool = getPool();
  const result = await pool.query<Ticket>(
    `SELECT * FROM tickets WHERE id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export type ListTicketsFilter = {
  status?: TicketStatus;
  channel?: SupportChannel;
  priority?: TicketPriority;
  assignedAgentId?: string;
  customerId?: string;
  limit?: number;
  offset?: number;
};

export async function listTickets(filter: ListTicketsFilter = {}): Promise<Ticket[]> {
  const pool = getPool();
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filter.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filter.status);
  }
  if (filter.channel) {
    conditions.push(`channel = $${idx++}`);
    params.push(filter.channel);
  }
  if (filter.priority) {
    conditions.push(`priority = $${idx++}`);
    params.push(filter.priority);
  }
  if (filter.assignedAgentId) {
    conditions.push(`assigned_agent_id = $${idx++}`);
    params.push(filter.assignedAgentId);
  }
  if (filter.customerId) {
    conditions.push(`customer_id = $${idx++}`);
    params.push(filter.customerId);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filter.limit ?? 50;
  const offset = filter.offset ?? 0;

  const result = await pool.query<Ticket>(
    `SELECT * FROM tickets ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    [...params, limit, offset]
  );

  return result.rows;
}

export async function updateTicketStatus(
  id: string,
  status: TicketStatus
): Promise<Ticket> {
  const { status: validStatus } = UpdateStatusSchema.parse({ status });
  const pool = getPool();

  const setClauses: string[] = [`status = $2`, `updated_at = NOW()`];
  const params: unknown[] = [id, validStatus];

  if (validStatus === "Resolved") {
    setClauses.push(`resolved_at = NOW()`);
  } else if (validStatus === "Closed") {
    setClauses.push(`closed_at = NOW()`);
  }

  const result = await pool.query<Ticket>(
    `UPDATE tickets SET ${setClauses.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );

  const ticket = result.rows[0];

  await pool.query(
    `INSERT INTO reporting_events (event_type, ticket_id, channel, priority, payload)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      "ticket.status_changed",
      ticket.id,
      ticket.channel,
      ticket.priority,
      JSON.stringify({ newStatus: validStatus }),
    ]
  );

  return ticket;
}

export async function assignTicket(
  id: string,
  agentId: string,
  teamId?: string
): Promise<Ticket> {
  const pool = getPool();

  const result = await pool.query<Ticket>(
    `UPDATE tickets
     SET assigned_agent_id = $2,
         assigned_team_id  = COALESCE($3, assigned_team_id),
         updated_at        = NOW()
     WHERE id = $1
     RETURNING *`,
    [id, agentId, teamId ?? null]
  );

  const ticket = result.rows[0];

  await pool.query(
    `INSERT INTO reporting_events (event_type, ticket_id, actor_id, payload)
     VALUES ($1, $2, $3, $4)`,
    [
      "ticket.assigned",
      ticket.id,
      agentId,
      JSON.stringify({ agentId, teamId: teamId ?? null }),
    ]
  );

  return ticket;
}

export async function listTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const pool = getPool();
  const result = await pool.query<TicketMessage>(
    `SELECT * FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC`,
    [ticketId]
  );
  return result.rows;
}

export async function addTicketMessage(
  input: AddTicketMessageInput
): Promise<TicketMessage> {
  const data = AddMessageSchema.parse(input);
  const pool = getPool();

  const result = await pool.query<TicketMessage>(
    `INSERT INTO ticket_messages (ticket_id, author_id, author_name, body, visibility)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.ticketId,
      data.authorId ?? null,
      data.authorName,
      data.body,
      data.visibility,
    ]
  );

  return result.rows[0];
}
