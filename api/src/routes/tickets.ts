import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
  createTicket,
  getTicket,
  listTickets,
  updateTicketStatus,
  assignTicket,
  addTicketMessage,
  type TicketStatus,
  type SupportChannel,
  type TicketPriority,
} from "../domain/tickets.js";

export const ticketRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/tickets
  fastify.post("/", async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const ticket = await createTicket({
      customerName: body.customerName as string,
      contactName: body.contactName as string | undefined,
      summary: body.summary as string,
      description: body.description as string | undefined,
      channel: body.channel as SupportChannel,
      priority: body.priority as TicketPriority,
      category: body.category as string | undefined,
      sourceRef: body.sourceRef as string | undefined,
    });
    return reply.code(201).send(ticket);
  });

  // GET /api/v1/tickets
  fastify.get("/", async (request) => {
    const query = request.query as Record<string, string>;
    return listTickets({
      status: query.status as TicketStatus | undefined,
      channel: query.channel as SupportChannel | undefined,
      priority: query.priority as TicketPriority | undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
  });

  // GET /api/v1/tickets/:id
  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const ticket = await getTicket(id);
    if (!ticket) return reply.code(404).send({ error: "Ticket not found" });
    return ticket;
  });

  // PATCH /api/v1/tickets/:id/status
  fastify.patch("/:id/status", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: TicketStatus };
    const ticket = await updateTicketStatus(id, status);
    return ticket;
  });

  // PATCH /api/v1/tickets/:id/assign
  fastify.patch("/:id/assign", async (request) => {
    const { id } = request.params as { id: string };
    const { agentId, teamId } = request.body as { agentId: string; teamId?: string };
    return assignTicket(id, agentId, teamId);
  });

  // POST /api/v1/tickets/:id/messages
  fastify.post("/:id/messages", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, string>;
    const message = await addTicketMessage({
      ticketId: id,
      authorName: body.authorName,
      authorId: body.authorId,
      body: body.body,
      visibility: body.visibility as "internal" | "customer",
    });
    return reply.code(201).send(message);
  });
};
