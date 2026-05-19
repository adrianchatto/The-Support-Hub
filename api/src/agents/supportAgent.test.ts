/**
 * Support chatbot agent — TDD
 * Tests written before implementation.
 * The Anthropic SDK is mocked so tests never hit the real API.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockQuery } from "../../tests/setup.js";

// Stable mock — same create fn used across all tests
const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

import { handleChatMessage, _resetAnthropicClient } from "./supportAgent.js";

function setAgentResponse(text: string) {
  mockCreate.mockResolvedValue({
    content: [{ type: "text", text }],
  });
}

const PUBLISHED_ARTICLES = [
  {
    id: "art-001",
    title: "Reset your portal password",
    summary: "Recover portal access with the approved password reset flow.",
    body: "Navigate to the portal login page and click 'Forgot password'. Enter your email address and follow the instructions sent to your inbox.",
    status: "Published",
    audience: "Customer",
  },
  {
    id: "art-002",
    title: "Raising a billing query",
    summary: "How to raise a billing query with the finance team.",
    body: "Email finance@support.com with your invoice number and a description of the issue. Include your account number.",
    status: "Published",
    audience: "Customer",
  },
];

beforeEach(() => {
  _resetAnthropicClient();
  mockCreate.mockReset();
  // Default: articles query returns published articles
  mockQuery.mockResolvedValue({ rows: PUBLISHED_ARTICLES });
});

describe("handleChatMessage", () => {
  it("returns an AI-grounded answer when knowledge resolves the query", async () => {
    setAgentResponse(
      JSON.stringify({
        outcome: "answered",
        answer: "To reset your password, go to the login page and click Forgot password.",
        articleIds: ["art-001"],
      })
    );

    const result = await handleChatMessage({
      sessionId: "sess-001",
      customerName: "Hadley Advisory",
      message: "How do I reset my password?",
    });

    expect(result.outcome).toBe("answered");
    if (result.outcome === "answered") {
      expect(result.answer).toBeTruthy();
      expect(result.articleIds).toContain("art-001");
    }
    expect(mockCreate).toHaveBeenCalledOnce();
  });

  it("creates a ticket when the AI cannot answer from the knowledge base", async () => {
    setAgentResponse(
      JSON.stringify({
        outcome: "escalate",
        reason: "No relevant knowledge article found for this billing dispute.",
      })
    );

    mockQuery
      .mockResolvedValueOnce({ rows: PUBLISHED_ARTICLES })       // article fetch
      .mockResolvedValueOnce({ rows: [{ nextval: "1001" }] })    // ticket seq
      .mockResolvedValueOnce({
        rows: [{
          id: "TCK-1001", channel: "Chat", priority: "P2",
          status: "New", summary: "Chat escalation from Hadley Advisory",
          customer_name: "Hadley Advisory",
          created_at: new Date(), updated_at: new Date(),
        }],
      })
      .mockResolvedValueOnce({ rows: [] })  // reporting event
      .mockResolvedValueOnce({ rows: [] }); // chat session update

    const result = await handleChatMessage({
      sessionId: "sess-002",
      customerName: "Hadley Advisory",
      message: "I have a dispute about invoice #INV-9834",
    });

    expect(result.outcome).toBe("escalated");
    if (result.outcome === "escalated") {
      expect(result.ticketId).toMatch(/^TCK-/);
    }
  });

  it("includes article context in the prompt sent to Claude", async () => {
    setAgentResponse(
      JSON.stringify({ outcome: "answered", answer: "Here is how to reset...", articleIds: ["art-001"] })
    );

    await handleChatMessage({
      sessionId: "sess-003",
      customerName: "Test Co",
      message: "password help",
    });

    expect(mockCreate).toHaveBeenCalledOnce();
    const callArgs = mockCreate.mock.calls[0][0];
    const systemPrompt = callArgs.system as string;
    expect(systemPrompt).toContain("Reset your portal password");
    expect(systemPrompt).toContain("Raising a billing query");
  });

  it("escalates gracefully when Claude returns malformed JSON", async () => {
    setAgentResponse("Sorry I cannot help with that right now.");

    mockQuery
      .mockResolvedValueOnce({ rows: PUBLISHED_ARTICLES })
      .mockResolvedValueOnce({ rows: [{ nextval: "1002" }] })
      .mockResolvedValueOnce({
        rows: [{
          id: "TCK-1002", channel: "Chat", priority: "P2",
          status: "New", summary: "Chat escalation",
          customer_name: "Test Co",
          created_at: new Date(), updated_at: new Date(),
        }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await handleChatMessage({
      sessionId: "sess-004",
      customerName: "Test Co",
      message: "Something unusual",
    });

    expect(["answered", "escalated"]).toContain(result.outcome);
  });
});
