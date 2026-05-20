import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  createApplication,
  createTicketCategory,
  deleteApplication,
  deleteTicketCategory,
  listApplications,
  listTicketCategories,
  updateApplication,
  updateTicketCategory,
} from "../domain/serviceCatalog.js";

function requireSupervisor(request: FastifyRequest, reply: FastifyReply): boolean {
  const role = request.user.role;
  if (role === "agent") {
    reply.code(403).send({ error: "Supervisor access required" });
    return false;
  }
  return true;
}

export async function serviceCatalogRoutes(fastify: FastifyInstance) {
  const auth = { onRequest: [fastify.authenticate] };

  fastify.get("/applications", auth, async () => listApplications());

  fastify.post("/applications", auth, async (request, reply) => {
    if (!requireSupervisor(request, reply)) return;
    const application = await createApplication(request.body as never);
    return reply.code(201).send(application);
  });

  fastify.patch("/applications/:id", auth, async (request, reply) => {
    if (!requireSupervisor(request, reply)) return;
    const { id } = request.params as { id: string };
    return updateApplication(id, request.body as never);
  });

  fastify.delete("/applications/:id", auth, async (request, reply) => {
    if (!requireSupervisor(request, reply)) return;
    const { id } = request.params as { id: string };
    await deleteApplication(id);
    return reply.code(204).send();
  });

  fastify.get("/ticket-categories", auth, async () => listTicketCategories());

  fastify.post("/ticket-categories", auth, async (request, reply) => {
    if (!requireSupervisor(request, reply)) return;
    const category = await createTicketCategory(request.body as never);
    return reply.code(201).send(category);
  });

  fastify.patch("/ticket-categories/:id", auth, async (request, reply) => {
    if (!requireSupervisor(request, reply)) return;
    const { id } = request.params as { id: string };
    return updateTicketCategory(id, request.body as never);
  });

  fastify.delete("/ticket-categories/:id", auth, async (request, reply) => {
    if (!requireSupervisor(request, reply)) return;
    const { id } = request.params as { id: string };
    await deleteTicketCategory(id);
    return reply.code(204).send();
  });
}
