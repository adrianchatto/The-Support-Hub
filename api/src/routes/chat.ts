import type { FastifyPluginAsync } from "fastify";
import { handleChatMessage } from "../agents/supportAgent.js";
import { getPool } from "../db/client.js";

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  // Start a chat session
  fastify.post("/sessions", async (request, reply) => {
    const { customerName } = request.body as { customerName: string };
    const pool = getPool();
    const result = await pool.query(
      `INSERT INTO chat_sessions (customer_name) VALUES ($1) RETURNING *`,
      [customerName]
    );
    return reply.code(201).send(result.rows[0]);
  });

  // Send a message to the support agent
  fastify.post("/sessions/:sessionId/messages", async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const { customerName, message } = request.body as {
      customerName: string;
      message: string;
    };

    // Fetch conversation history for context
    const pool = getPool();
    const historyResult = await pool.query<{ role: string; content: string }>(
      `SELECT role, content FROM chat_messages
       WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId]
    );

    const history = historyResult.rows.map((row) => ({
      role: row.role as "user" | "assistant",
      content: row.content,
    }));

    // Save the user message
    await pool.query(
      `INSERT INTO chat_messages (session_id, role, content) VALUES ($1, 'user', $2)`,
      [sessionId, message]
    );

    // Run the AI agent
    const result = await handleChatMessage({
      sessionId,
      customerName,
      message,
      conversationHistory: history,
    });

    // Save the assistant response
    const assistantContent =
      result.outcome === "answered"
        ? result.answer
        : result.message;

    await pool.query(
      `INSERT INTO chat_messages (session_id, role, content) VALUES ($1, 'assistant', $2)`,
      [sessionId, assistantContent]
    );

    return reply.code(200).send(result);
  });
};
