import type { FastifyInstance } from "fastify";
import {
  listSlaPolicies,
  upsertSlaPolicy,
  deleteSlaPolicy,
  getSlaComplianceSummary,
} from "../domain/slaPolicies.js";

export async function slaPolicyRoutes(fastify: FastifyInstance) {
  // GET /api/v1/sla-policies
  fastify.get("/", async () => listSlaPolicies());

  // GET /api/v1/sla-policies/compliance
  fastify.get("/compliance", async () => getSlaComplianceSummary());

  // POST /api/v1/sla-policies  (upsert by name)
  fastify.post("/", async (request, reply) => {
    const policy = await upsertSlaPolicy(request.body as never);
    return reply.code(201).send(policy);
  });

  // DELETE /api/v1/sla-policies/:id
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteSlaPolicy(id);
    return reply.code(204).send();
  });
}
