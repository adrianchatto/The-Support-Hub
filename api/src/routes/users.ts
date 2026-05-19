import type { FastifyPluginAsync } from "fastify";
import {
  createUser,
  listUsers,
  listAgents,
  getUser,
  updateUser,
  deleteUser,
} from "../domain/users.js";

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  // All user management requires authentication
  const auth = { onRequest: [fastify.authenticate] };

  // GET /api/v1/users  (supervisor + admin)
  fastify.get("/", auth, async (_request) => {
    return listUsers();
  });

  // GET /api/v1/users/agents  (agents + supervisors — for assignment dropdowns)
  fastify.get("/agents", auth, async (_request) => {
    return listAgents();
  });

  // GET /api/v1/users/:id
  fastify.get("/:id", auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await getUser(id);
    if (!user) return reply.code(404).send({ error: "User not found" });
    return user;
  });

  // POST /api/v1/users  (admin only)
  fastify.post("/", auth, async (request, reply) => {
    const actor = request.user as { role: string };
    if (actor.role !== "admin") {
      return reply.code(403).send({ error: "Admin access required" });
    }
    const body = request.body as Record<string, unknown>;
    const user = await createUser({
      email:    body.email as string,
      name:     body.name as string,
      role:     body.role as "agent" | "supervisor" | "admin",
      password: body.password as string,
      teamId:   body.teamId as string | undefined,
    });
    return reply.code(201).send(user);
  });

  // PATCH /api/v1/users/:id  (admin only)
  fastify.patch("/:id", auth, async (request, reply) => {
    const actor = request.user as { role: string };
    if (actor.role !== "admin") {
      return reply.code(403).send({ error: "Admin access required" });
    }
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const user = await updateUser(id, {
      name:     body.name as string | undefined,
      role:     body.role as "agent" | "supervisor" | "admin" | undefined,
      password: body.password as string | undefined,
      teamId:   body.teamId as string | null | undefined,
    });
    return user;
  });

  // DELETE /api/v1/users/:id  (admin only)
  fastify.delete("/:id", auth, async (request, reply) => {
    const actor = request.user as { role: string };
    if (actor.role !== "admin") {
      return reply.code(403).send({ error: "Admin access required" });
    }
    const { id } = request.params as { id: string };
    await deleteUser(id);
    return reply.code(204).send();
  });
};
