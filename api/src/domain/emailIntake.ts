import { z } from "zod";
import { getPool } from "../db/client.js";
import { createTicket } from "./tickets.js";

// ─── Types ────────────────────────────────────────────────────────────────────

const InboundEmailSchema = z.object({
  messageId: z.string().min(1, "messageId is required"),
  fromAddress: z.string().email("fromAddress must be a valid email"),
  fromName: z.string().optional(),
  subject: z.string().optional(),
  bodyText: z.string().optional(),
  bodyHtml: z.string().optional(),
});

export type InboundEmailPayload = z.input<typeof InboundEmailSchema>;

export type EmailIntakeResult =
  | { status: "created"; ticketId: string }
  | { status: "duplicate"; ticketId: string };

// ─── Domain function ──────────────────────────────────────────────────────────

export async function processInboundEmail(
  payload: InboundEmailPayload
): Promise<EmailIntakeResult> {
  const email = InboundEmailSchema.parse(payload);
  const pool = getPool();

  // Deduplicate by RFC 2822 Message-ID
  const existing = await pool.query<{ ticket_id: string; message_id: string }>(
    `SELECT ticket_id, message_id FROM email_intake WHERE message_id = $1`,
    [email.messageId]
  );

  if (existing.rows.length > 0) {
    return { status: "duplicate", ticketId: existing.rows[0].ticket_id };
  }

  // Derive ticket summary from subject; fall back to sender identity
  const summary =
    email.subject?.trim() ||
    `Email from ${email.fromAddress}`;

  // Create the ticket
  const ticket = await createTicket({
    customerName: email.fromName ?? email.fromAddress,
    summary,
    description: email.bodyText ?? undefined,
    channel: "Email",
    priority: "P3", // Default; agents can reprioritise after triage
    sourceRef: email.messageId,
  });

  // Record intake for deduplication and audit
  await pool.query(
    `INSERT INTO email_intake (message_id, from_address, from_name, subject, body_text, ticket_id, processed_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [
      email.messageId,
      email.fromAddress,
      email.fromName ?? null,
      email.subject ?? null,
      email.bodyText ?? null,
      ticket.id,
    ]
  );

  return { status: "created", ticketId: ticket.id };
}
