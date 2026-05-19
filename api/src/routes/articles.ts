import type { FastifyInstance } from "fastify";
import {
  createArticle,
  getArticle,
  listArticles,
  updateArticle,
  publishArticle,
  archiveArticle,
  deleteArticle,
  submitArticleForReview,
  rejectArticle,
  suggestArticleFromChat,
  type ArticleStatus,
} from "../domain/articles.js";

export async function articleRoutes(fastify: FastifyInstance) {
  // All article routes require authentication
  const auth = { onRequest: [fastify.authenticate] };

  // GET /api/v1/articles?status=&audience=&search=
  fastify.get("/", { ...auth }, async (request) => {
    const { status, audience, search } = request.query as {
      status?: ArticleStatus;
      audience?: "Customer" | "Internal" | "Both";
      search?: string;
    };
    return listArticles({ status, audience, search });
  });

  // GET /api/v1/articles/:id
  fastify.get("/:id", { ...auth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const article = await getArticle(id);
    if (!article) return reply.notFound(`Article ${id} not found`);
    return article;
  });

  // POST /api/v1/articles
  fastify.post("/", { ...auth }, async (request, reply) => {
    const article = await createArticle(request.body as never);
    return reply.code(201).send(article);
  });

  // PATCH /api/v1/articles/:id
  fastify.patch("/:id", { ...auth }, async (request) => {
    const { id } = request.params as { id: string };
    return updateArticle(id, request.body as never);
  });

  // POST /api/v1/articles/:id/submit-for-review — agent submits a draft for approval
  fastify.post("/:id/submit-for-review", { ...auth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const article = await submitArticleForReview(id);
    return reply.code(200).send(article);
  });

  // POST /api/v1/articles/:id/publish — supervisor/admin approves and publishes
  fastify.post("/:id/publish", { ...auth }, async (request, reply) => {
    const actor = request.user;
    if (actor.role === "agent") {
      return reply.code(403).send({ error: "Only supervisors and admins can publish articles" });
    }
    const { id } = request.params as { id: string };
    const article = await publishArticle(id);
    return reply.code(200).send(article);
  });

  // POST /api/v1/articles/:id/reject — supervisor/admin rejects, sends back to Draft
  fastify.post("/:id/reject", { ...auth }, async (request, reply) => {
    const actor = request.user;
    if (actor.role === "agent") {
      return reply.code(403).send({ error: "Only supervisors and admins can reject articles" });
    }
    const { id } = request.params as { id: string };
    const article = await rejectArticle(id);
    return reply.code(200).send(article);
  });

  // POST /api/v1/articles/:id/archive
  fastify.post("/:id/archive", { ...auth }, async (request, reply) => {
    const actor = request.user;
    if (actor.role === "agent") {
      return reply.code(403).send({ error: "Only supervisors and admins can archive articles" });
    }
    const { id } = request.params as { id: string };
    const article = await archiveArticle(id);
    return reply.code(200).send(article);
  });

  // DELETE /api/v1/articles/:id
  fastify.delete("/:id", { ...auth }, async (request, reply) => {
    const actor = request.user;
    if (actor.role === "agent") {
      return reply.code(403).send({ error: "Only supervisors and admins can delete articles" });
    }
    const { id } = request.params as { id: string };
    await deleteArticle(id);
    return reply.code(204).send();
  });

  // POST /api/v1/articles/suggest  — Claude drafts an article from a chat summary
  fastify.post("/suggest", { ...auth }, async (request, reply) => {
    const { conversationSummary } = request.body as { conversationSummary: string };
    if (!conversationSummary) return reply.badRequest("conversationSummary is required");
    const suggestion = await suggestArticleFromChat(conversationSummary);
    return reply.code(200).send(suggestion);
  });
}
