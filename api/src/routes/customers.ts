import type { FastifyInstance } from "fastify";
import {
  createCustomer,
  getCustomer,
  listCustomers,
  updateCustomer,
  deleteCustomer,
} from "../domain/customers.js";

export async function customerRoutes(fastify: FastifyInstance) {
  // GET /api/v1/customers?search=
  fastify.get("/", async (request) => {
    const { search } = request.query as { search?: string };
    return listCustomers(search);
  });

  // GET /api/v1/customers/:id
  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const customer = await getCustomer(id);
    if (!customer) return reply.notFound(`Customer ${id} not found`);
    return customer;
  });

  // POST /api/v1/customers
  fastify.post("/", async (request, reply) => {
    const customer = await createCustomer(request.body as never);
    return reply.code(201).send(customer);
  });

  // PATCH /api/v1/customers/:id
  fastify.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const customer = await updateCustomer(id, request.body as never);
    return customer;
  });

  // DELETE /api/v1/customers/:id
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteCustomer(id);
    return reply.code(204).send();
  });
}
