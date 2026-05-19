import type { FastifyPluginAsync } from "fastify";
import { loginUser } from "../domain/auth.js";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/v1/auth/login
  fastify.post("/login", async (request, reply) => {
    const { email, password } = request.body as { email: string; password: string };

    if (!email || !password) {
      return reply.code(400).send({ error: "email and password are required" });
    }

    try {
      const user = await loginUser(email, password);
      const token = fastify.jwt.sign(
        { id: user.id, email: user.email, name: user.name, role: user.role },
        { expiresIn: "12h" }
      );
      return { token, user };
    } catch (err) {
      return reply.code(401).send({ error: err instanceof Error ? err.message : "Authentication failed" });
    }
  });

  // GET /api/v1/auth/me  (requires valid token)
  fastify.get("/me", {
    onRequest: [fastify.authenticate],
  }, async (request) => {
    return request.user;
  });
};
