import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import { ticketRoutes } from "./routes/tickets.js";
import { emailIntakeRoutes } from "./routes/emailIntake.js";
import { chatRoutes } from "./routes/chat.js";
import { customerRoutes } from "./routes/customers.js";
import { slaPolicyRoutes } from "./routes/slaPolicies.js";
import { articleRoutes } from "./routes/articles.js";

export async function buildServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV !== "production"
          ? { target: "pino-pretty" }
          : undefined,
    },
  });

  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN ?? "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  });

  await fastify.register(sensible);

  // Health check — Coolify and Azure use this
  fastify.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // API routes
  await fastify.register(ticketRoutes, { prefix: "/api/v1/tickets" });
  await fastify.register(emailIntakeRoutes, { prefix: "/api/v1/intake" });
  await fastify.register(chatRoutes, { prefix: "/api/v1/chat" });
  await fastify.register(customerRoutes, { prefix: "/api/v1/customers" });
  await fastify.register(slaPolicyRoutes, { prefix: "/api/v1/sla-policies" });
  await fastify.register(articleRoutes, { prefix: "/api/v1/articles" });

  // Global error handler
  fastify.setErrorHandler((error: FastifyError, _request, reply) => {
    fastify.log.error(error);
    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode).send({
      error: error.message,
      ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
    });
  });

  return fastify;
}
