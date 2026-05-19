/**
 * Support chatbot agent — Claude-powered, knowledge-grounded
 *
 * Replaces the keyword-matching prototype with a real AI agent that:
 *  1. Fetches all published customer-facing articles from the DB.
 *  2. Sends them as context to Claude along with the customer's message.
 *  3. Claude decides: answer from knowledge, or escalate to a ticket.
 *  4. On escalation, a ticket is auto-created with the conversation as context.
 */
import Anthropic from "@anthropic-ai/sdk";
import { getPool } from "../db/client.js";
import { createTicket } from "../domain/tickets.js";

// Lazy client — created on first use so tests can intercept the constructor
let _anthropic: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

/** Exposed for testing only — allows the test suite to reset the cached client */
export function _resetAnthropicClient(): void {
  _anthropic = null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChatInput = {
  sessionId: string;
  customerName: string;
  message: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
};

export type ChatResult =
  | {
      outcome: "answered";
      answer: string;
      articleIds: string[];
    }
  | {
      outcome: "escalated";
      ticketId: string;
      message: string;
    };

type AgentDecision =
  | { outcome: "answered"; answer: string; articleIds: string[] }
  | { outcome: "escalate"; reason: string };

// ─── Knowledge retrieval ──────────────────────────────────────────────────────

async function fetchPublishedArticles() {
  const pool = getPool();
  const result = await pool.query<{
    id: string;
    title: string;
    summary: string;
    body: string;
  }>(
    `SELECT id, title, summary, body
     FROM articles
     WHERE status = 'Published' AND (audience = 'Customer' OR audience = 'Both')
     ORDER BY title`
  );
  return result.rows;
}

// ─── Prompt construction ──────────────────────────────────────────────────────

function buildSystemPrompt(
  articles: Array<{ id: string; title: string; summary: string; body: string }>
): string {
  const knowledgeBase = articles
    .map(
      (a) =>
        `[Article ID: ${a.id}]\nTitle: ${a.title}\nSummary: ${a.summary}\nContent: ${a.body}`
    )
    .join("\n\n---\n\n");

  return `You are a support assistant for a managed services company.
Your job is to help customers by answering their questions using the knowledge base below.

KNOWLEDGE BASE:
${knowledgeBase}

INSTRUCTIONS:
- If the knowledge base contains enough information to answer the customer's question, answer it clearly and helpfully.
- If you cannot answer from the knowledge base, escalate to a human agent.
- Always respond with valid JSON in one of these two formats:

  Answered:   { "outcome": "answered", "answer": "<your response>", "articleIds": ["<id>", ...] }
  Escalate:   { "outcome": "escalate", "reason": "<why you cannot answer>" }

- "articleIds" must contain only IDs of articles you actually used.
- Do not make up information not in the knowledge base.
- Keep answers concise but complete.
- Do not mention that you are an AI unless directly asked.`;
}

// ─── Main agent function ──────────────────────────────────────────────────────

export async function handleChatMessage(input: ChatInput): Promise<ChatResult> {
  const articles = await fetchPublishedArticles();

  const systemPrompt = buildSystemPrompt(articles);

  const messages: Anthropic.MessageParam[] = [
    ...(input.conversationHistory ?? []),
    { role: "user", content: input.message },
  ];

  let decision: AgentDecision;

  try {
    const response = await getAnthropicClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    decision = JSON.parse(text) as AgentDecision;
  } catch {
    // If Claude returns malformed JSON or the API errors, escalate gracefully
    decision = { outcome: "escalate", reason: "Agent could not process the request" };
  }

  // ─── Handle decision ───────────────────────────────────────────────────────

  if (decision.outcome === "answered") {
    return {
      outcome: "answered",
      answer: decision.answer,
      articleIds: decision.articleIds,
    };
  }

  // Escalate: create a ticket and update the chat session
  const ticket = await createTicket({
    customerName: input.customerName,
    summary: `Chat escalation from ${input.customerName}`,
    description: `Customer message: ${input.message}\n\nEscalation reason: ${decision.reason}`,
    channel: "Chat",
    priority: "P2",
    sourceRef: input.sessionId,
  });

  // Mark session as escalated
  const pool = getPool();
  await pool.query(
    `UPDATE chat_sessions
     SET status = 'escalated', escalated_ticket_id = $2, updated_at = NOW()
     WHERE id = $1`,
    [input.sessionId, ticket.id]
  );

  return {
    outcome: "escalated",
    ticketId: ticket.id,
    message: `We've created a ticket (${ticket.id}) and an agent will be in touch shortly.`,
  };
}
