import { describe, expect, it } from "vitest";
import {
  addTicket,
  createInitialState,
  derivePriority,
  escalateChatToTicket,
  getChannelCounts,
  resolveCustomerAgentRequest,
  searchPublishedArticles,
} from "./supportHub";

describe("support hub domain", () => {
  it("creates tickets with stable reporting events", () => {
    const state = createInitialState();
    const next = addTicket(state, {
      channel: "Phone",
      customer: "Hadley Advisory",
      contact: "Maya Patel",
      summary: "Cannot access client portal",
      priority: "P2",
    });

    expect(next.tickets).toHaveLength(1);
    expect(next.tickets[0]).toMatchObject({
      id: "TCK-1001",
      status: "New",
      channel: "Phone",
      priority: "P2",
    });
    expect(next.tickets[0].timeline[0]).toMatchObject({
      message: "Ticket created",
      createdAt: expect.any(String),
    });
    expect(next.events).toContainEqual(
      expect.objectContaining({
        type: "ticket.created",
        ticketId: "TCK-1001",
        channel: "Phone",
        customer: "Hadley Advisory",
      }),
    );
  });

  it("derives ITIL-style priority from impact and urgency", () => {
    expect(derivePriority("High", "High")).toBe("P1");
    expect(derivePriority("High", "Medium")).toBe("P2");
    expect(derivePriority("Medium", "Medium")).toBe("P3");
    expect(derivePriority("Low", "Low")).toBe("P4");
  });

  it("captures ITIL classification, problem candidates, and grouped tickets", () => {
    const state = createInitialState();
    const parent = addTicket(state, {
      category: "Access",
      channel: "Phone",
      customer: "Hadley Advisory",
      impact: "High",
      requestType: "Incident",
      summary: "Client portal outage",
      urgency: "High",
    });
    const child = addTicket(parent, {
      category: "Access",
      channel: "Email",
      customer: "Hadley Advisory",
      impact: "High",
      parentTicketId: "TCK-1001",
      requestType: "Incident",
      summary: "Second user cannot access client portal",
      urgency: "Medium",
    });

    expect(child.tickets[0]).toMatchObject({
      priority: "P1",
      problemCandidate: true,
      requestType: "Incident",
    });
    expect(child.tickets[1]).toMatchObject({
      parentTicketId: "TCK-1001",
      priority: "P2",
    });
  });

  it("searches only published customer-visible knowledge articles", () => {
    const state = createInitialState();

    expect(searchPublishedArticles(state, "password")).toEqual([
      expect.objectContaining({ title: "Reset your portal password" }),
    ]);
    expect(searchPublishedArticles(state, "internal")).toEqual([]);
  });

  it("escalates chat into a ticket with article context", () => {
    const state = createInitialState();
    const next = escalateChatToTicket(state, {
      customer: "Portal customer",
      message: "I tried the password article but I am still locked out",
      suggestedArticleIds: ["KB-001"],
    });

    expect(next.tickets[0]).toMatchObject({
      id: "TCK-1001",
      channel: "Chat",
      summary: "Chat escalation: password reset",
    });
    expect(next.tickets[0].linkedArticleIds).toEqual(["KB-001"]);
    expect(next.events).toContainEqual(
      expect.objectContaining({
        type: "chat.escalated",
        ticketId: "TCK-1001",
        channel: "Chat",
      }),
    );
  });

  it("lets the bot answer from knowledge instead of creating a ticket", () => {
    const state = createInitialState();
    const next = resolveCustomerAgentRequest(state, {
      customer: "Hadley Advisory",
      message: "How do I reset my password?",
    });

    expect(next.tickets).toHaveLength(0);
    expect(next.botDecision).toMatchObject({
      outcome: "answered",
      articleId: "KB-001",
    });
  });

  it("lets the bot create a ticket only when knowledge cannot resolve the request", () => {
    const state = createInitialState();
    const next = resolveCustomerAgentRequest(state, {
      customer: "Hadley Advisory",
      message: "I need help with a billing exception",
    });

    expect(next.tickets).toHaveLength(1);
    expect(next.tickets[0]).toMatchObject({
      channel: "Chat",
      summary: "Chat escalation: billing exception",
    });
    expect(next.botDecision).toMatchObject({
      outcome: "ticket_created",
      ticketId: "TCK-1001",
    });
  });

  it("counts tickets by channel for management reporting", () => {
    const state = createInitialState();
    const withPhone = addTicket(state, {
      channel: "Phone",
      customer: "Hadley Advisory",
      contact: "Maya Patel",
      summary: "Cannot access client portal",
      priority: "P2",
    });
    const withChat = escalateChatToTicket(withPhone, {
      customer: "Portal customer",
      message: "I need help",
      suggestedArticleIds: [],
    });

    expect(getChannelCounts(withChat)).toEqual([
      { channel: "Phone", count: 1 },
      { channel: "Chat", count: 1 },
    ]);
  });
});
