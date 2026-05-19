import type { FastifyPluginAsync } from "fastify";
import {
  createProblem,
  listProblems,
  getProblem,
  updateProblem,
  deleteProblem,
  linkTicketToProblem,
  unlinkTicketFromProblem,
  listProblemTickets,
} from "../domain/problems.js";

export const problemRoutes: FastifyPluginAsync = async (fastify) => {
  const auth = { onRequest: [fastify.authenticate] };

  // GET /api/v1/problems
  fastify.get("/", auth, async () => {
    return listProblems();
  });

  // POST /api/v1/problems
  fastify.post("/", auth, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    const problem = await createProblem({
      title:       body.title as string,
      description: body.description as string | undefined,
    });
    return reply.code(201).send(problem);
  });

  // GET /api/v1/problems/:id
  fastify.get("/:id", auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const problem = await getProblem(id);
    if (!problem) return reply.code(404).send({ error: "Problem not found" });
    return problem;
  });

  // PATCH /api/v1/problems/:id
  fastify.patch("/:id", auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const problem = await updateProblem(id, {
      title:       body.title as string | undefined,
      description: body.description as string | undefined,
      status:      body.status as "Open" | "Under Investigation" | "Resolved" | "Closed" | undefined,
    });
    return problem;
  });

  // DELETE /api/v1/problems/:id
  fastify.delete("/:id", auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteProblem(id);
    return reply.code(204).send();
  });

  // GET /api/v1/problems/:id/tickets
  fastify.get("/:id/tickets", auth, async (request) => {
    const { id } = request.params as { id: string };
    return listProblemTickets(id);
  });

  // POST /api/v1/problems/:id/link — link a ticket to this problem
  fastify.post("/:id/link", auth, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { ticketId } = request.body as { ticketId: string };
    await linkTicketToProblem(ticketId, id);
    return reply.code(204).send();
  });

  // DELETE /api/v1/problems/:id/link/:ticketId — unlink a ticket
  fastify.delete("/:id/link/:ticketId", auth, async (request, reply) => {
    const { ticketId } = request.params as { id: string; ticketId: string };
    await unlinkTicketFromProblem(ticketId);
    return reply.code(204).send();
  });
};
