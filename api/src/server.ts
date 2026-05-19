import Fastify, { type FastifyError, type FastifyRequest, type FastifyReply } from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import jwt from "@fastify/jwt";
import { ticketRoutes } from "./routes/tickets.js";
import { emailIntakeRoutes } from "./routes/emailIntake.js";
import { chatRoutes } from "./routes/chat.js";
import { customerRoutes } from "./routes/customers.js";
import { slaPolicyRoutes } from "./routes/slaPolicies.js";
import { articleRoutes } from "./routes/articles.js";
import { authRoutes } from "./routes/auth.js";
import { userRoutes } from "./routes/users.js";
import { problemRoutes } from "./routes/problems.js";

// Augment FastifyInstance with the authenticate decorator
declare module "fastify" {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// Augment FastifyRequest with JWT user payload
declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
    };
  }
}

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

  // JWT — secret from env, warn loudly if using default
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    fastify.log.warn("JWT_SECRET not set — using insecure default. Set it in production!");
  }
  await fastify.register(jwt, {
    secret: jwtSecret ?? "support-hub-dev-secret-change-in-production",
  });

  // Reusable authenticate decorator
  fastify.decorate("authenticate", async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: "Unauthorised — please log in" });
    }
  });

  // Health check — Coolify and Azure use this
  fastify.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  // Auth routes (public — no authenticate required for login)
  await fastify.register(authRoutes, { prefix: "/api/v1/auth" });

  // API routes (auth enforced per-route inside each plugin)
  await fastify.register(ticketRoutes,      { prefix: "/api/v1/tickets" });
  await fastify.register(emailIntakeRoutes, { prefix: "/api/v1/intake" });
  await fastify.register(chatRoutes,        { prefix: "/api/v1/chat" });
  await fastify.register(customerRoutes,    { prefix: "/api/v1/customers" });
  await fastify.register(slaPolicyRoutes,   { prefix: "/api/v1/sla-policies" });
  await fastify.register(articleRoutes,     { prefix: "/api/v1/articles" });
  await fastify.register(userRoutes,        { prefix: "/api/v1/users" });
  await fastify.register(problemRoutes,     { prefix: "/api/v1/problems" });

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
