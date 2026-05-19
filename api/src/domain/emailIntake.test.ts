/**
 * Email intake domain — TDD
 * Tests written before implementation.
 */
import { describe, it, expect, vi } from "vitest";
import { mockQuery } from "../../tests/setup.js";
import {
  processInboundEmail,
  type InboundEmailPayload,
} from "./emailIntake.js";

const BASE_EMAIL: InboundEmailPayload = {
  messageId: "<abc123@mail.hadley.com>",
  fromAddress: "maya.patel@hadley.com",
  fromName: "Maya Patel",
  subject: "Cannot access the client portal",
  bodyText: "Hi, I have been getting a 403 error since 09:00 this morning. Please help.",
};

describe("processInboundEmail", () => {
  it("creates a ticket from an inbound email", async () => {
    const MOCK_TICKET = {
      id: "TCK-1001",
      customer_name: "maya.patel@hadley.com",
      channel: "Email",
      priority: "P3",
      status: "New",
      summary: "Cannot access the client portal",
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [] })                       // duplicate check
      .mockResolvedValueOnce({ rows: [{ nextval: "1001" }] })    // ticket_seq
      .mockResolvedValueOnce({ rows: [MOCK_TICKET] })            // INSERT ticket
      .mockResolvedValueOnce({ rows: [] })                       // reporting event
      .mockResolvedValueOnce({ rows: [] });                      // INSERT email_intake

    const result = await processInboundEmail(BASE_EMAIL);

    expect(result.status).toBe("created");
    expect(result.ticketId).toBe("TCK-1001");
  });

  it("deduplicates emails with the same Message-ID", async () => {
    // Duplicate check returns a row — email already processed
    mockQuery.mockResolvedValueOnce({
      rows: [{ ticket_id: "TCK-1001", message_id: BASE_EMAIL.messageId }],
    });

    const result = await processInboundEmail(BASE_EMAIL);

    expect(result.status).toBe("duplicate");
    expect(result.ticketId).toBe("TCK-1001");
    // Should not have called the ticket insert
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("uses subject as ticket summary", async () => {
    const MOCK_TICKET = {
      id: "TCK-1002",
      summary: "Cannot access the client portal",
      channel: "Email",
      priority: "P3",
      status: "New",
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ nextval: "1002" }] })
      .mockResolvedValueOnce({ rows: [MOCK_TICKET] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await processInboundEmail(BASE_EMAIL);

    const ticketInsertCall = mockQuery.mock.calls[2];
    expect(ticketInsertCall[1]).toContain("Cannot access the client portal");
  });

  it("falls back to a generic summary when subject is blank", async () => {
    const emailNoSubject: InboundEmailPayload = {
      ...BASE_EMAIL,
      messageId: "<xyz@mail.com>",
      subject: "",
    };

    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ nextval: "1003" }] })
      .mockResolvedValueOnce({
        rows: [{ id: "TCK-1003", summary: "Email from maya.patel@hadley.com", channel: "Email", priority: "P3", status: "New", created_at: new Date(), updated_at: new Date() }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await processInboundEmail(emailNoSubject);
    expect(result.status).toBe("created");
  });

  it("rejects emails without a messageId", async () => {
    await expect(
      processInboundEmail({ ...BASE_EMAIL, messageId: "" })
    ).rejects.toThrow(/messageId/i);
  });

  it("rejects emails without a fromAddress", async () => {
    await expect(
      processInboundEmail({ ...BASE_EMAIL, fromAddress: "" })
    ).rejects.toThrow(/fromAddress/i);
  });
});
