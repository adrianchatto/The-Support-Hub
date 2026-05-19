/**
 * Ticket domain — TDD
 * Tests are written first. Implementation must make these green.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockQuery } from "../../tests/setup.js";
import {
  createTicket,
  getTicket,
  listTickets,
  updateTicketStatus,
  assignTicket,
  addTicketMessage,
  type CreateTicketInput,
} from "./tickets.js";

const MOCK_TICKET = {
  id: "TCK-1001",
  customer_name: "Hadley Advisory",
  contact_name: "Maya Patel",
  summary: "Cannot access client portal",
  description: "Getting a 403 error on login since 09:00 today",
  channel: "Email",
  priority: "P2",
  status: "New",
  category: null,
  assigned_team_id: null,
  assigned_agent_id: null,
  first_response_due_at: null,
  resolution_due_at: null,
  created_at: new Date("2026-05-19T10:00:00Z"),
  updated_at: new Date("2026-05-19T10:00:00Z"),
};

describe("createTicket", () => {
  it("inserts a ticket and returns it with a stable TCK-NNNN id", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ nextval: "1001" }] })  // ticket_seq
      .mockResolvedValueOnce({ rows: [MOCK_TICKET] })            // INSERT ... RETURNING
      .mockResolvedValueOnce({ rows: [] });                      // reporting event

    const input: CreateTicketInput = {
      customerName: "Hadley Advisory",
      contactName: "Maya Patel",
      summary: "Cannot access client portal",
      description: "Getting a 403 error on login since 09:00 today",
      channel: "Email",
      priority: "P2",
    };

    const ticket = await createTicket(input);

    expect(ticket.id).toBe("TCK-1001");
    expect(ticket.status).toBe("New");
    expect(ticket.channel).toBe("Email");
    expect(ticket.priority).toBe("P2");
  });

  it("writes a ticket.created reporting event", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ nextval: "1001" }] })
      .mockResolvedValueOnce({ rows: [MOCK_TICKET] })
      .mockResolvedValueOnce({ rows: [] });

    await createTicket({
      customerName: "Hadley Advisory",
      summary: "Test",
      channel: "Phone",
      priority: "P3",
    });

    // Third call should be the reporting event insert
    const eventCall = mockQuery.mock.calls[2];
    expect(eventCall[0]).toMatch(/INSERT INTO reporting_events/);
    expect(eventCall[1]).toContain("ticket.created");
  });

  it("rejects an unknown channel", async () => {
    await expect(
      createTicket({
        customerName: "Test",
        summary: "Test",
        channel: "Fax" as never,
        priority: "P3",
      })
    ).rejects.toThrow(/channel/i);
  });

  it("rejects an unknown priority", async () => {
    await expect(
      createTicket({
        customerName: "Test",
        summary: "Test",
        channel: "Email",
        priority: "P9" as never,
      })
    ).rejects.toThrow(/priority/i);
  });
});

describe("getTicket", () => {
  it("returns a ticket by id", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_TICKET] });

    const ticket = await getTicket("TCK-1001");
    expect(ticket).toMatchObject({ id: "TCK-1001", status: "New" });
  });

  it("returns null for unknown id", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const ticket = await getTicket("TCK-9999");
    expect(ticket).toBeNull();
  });
});

describe("listTickets", () => {
  it("returns tickets filtered by status", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_TICKET, { ...MOCK_TICKET, id: "TCK-1002" }] });

    const tickets = await listTickets({ status: "New" });
    expect(tickets).toHaveLength(2);
  });

  it("returns tickets filtered by channel", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_TICKET] });

    const tickets = await listTickets({ channel: "Email" });
    expect(tickets).toHaveLength(1);
    expect(tickets[0].channel).toBe("Email");
  });
});

describe("updateTicketStatus", () => {
  it("transitions a ticket to a valid status", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ...MOCK_TICKET, status: "Open" }] })
      .mockResolvedValueOnce({ rows: [] }); // reporting event

    const updated = await updateTicketStatus("TCK-1001", "Open");
    expect(updated.status).toBe("Open");
  });

  it("records a ticket.status_changed reporting event", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ...MOCK_TICKET, status: "Resolved" }] })
      .mockResolvedValueOnce({ rows: [] });

    await updateTicketStatus("TCK-1001", "Resolved");

    const eventCall = mockQuery.mock.calls[1];
    expect(eventCall[0]).toMatch(/INSERT INTO reporting_events/);
    expect(eventCall[1]).toContain("ticket.status_changed");
  });

  it("rejects an invalid status", async () => {
    await expect(
      updateTicketStatus("TCK-1001", "Deleted" as never)
    ).rejects.toThrow(/status/i);
  });
});

describe("assignTicket", () => {
  it("assigns a ticket to an agent and emits a reporting event", async () => {
    const agentId = "agent-uuid-123";
    mockQuery
      .mockResolvedValueOnce({ rows: [{ ...MOCK_TICKET, assigned_agent_id: agentId }] })
      .mockResolvedValueOnce({ rows: [] }); // event

    const updated = await assignTicket("TCK-1001", agentId);
    expect(updated.assigned_agent_id).toBe(agentId);
  });
});

describe("addTicketMessage", () => {
  it("adds an internal note to a ticket", async () => {
    const MOCK_MSG = {
      id: "msg-uuid",
      ticket_id: "TCK-1001",
      author_name: "Support Agent",
      body: "Contacted the customer",
      visibility: "internal",
      created_at: new Date(),
    };
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_MSG] });

    const msg = await addTicketMessage({
      ticketId: "TCK-1001",
      authorName: "Support Agent",
      body: "Contacted the customer",
      visibility: "internal",
    });

    expect(msg.visibility).toBe("internal");
    expect(msg.body).toBe("Contacted the customer");
  });

  it("adds a customer-visible reply", async () => {
    const MOCK_MSG = {
      id: "msg-uuid-2",
      ticket_id: "TCK-1001",
      author_name: "Support Agent",
      body: "We are looking into this",
      visibility: "customer",
      created_at: new Date(),
    };
    mockQuery.mockResolvedValueOnce({ rows: [MOCK_MSG] });

    const msg = await addTicketMessage({
      ticketId: "TCK-1001",
      authorName: "Support Agent",
      body: "We are looking into this",
      visibility: "customer",
    });

    expect(msg.visibility).toBe("customer");
  });

  it("rejects invalid visibility", async () => {
    await expect(
      addTicketMessage({
        ticketId: "TCK-1001",
        authorName: "Agent",
        body: "Test",
        visibility: "secret" as never,
      })
    ).rejects.toThrow(/visibility/i);
  });
});
