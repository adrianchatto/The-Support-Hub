import type { FastifyInstance } from "fastify";
import {
  createArticle,
  getArticle,
  listArticles,
  updateArticle,
  publishArticle,
  archiveArticle,
  deleteArticle,
  suggestArticleFromChat,
} from "../domain/articles.js";

export async function articleRoutes(fastify: FastifyInstance) {
  // GET /api/v1/articles?status=&audience=&search=
  fastify.get("/", async (request) => {
    const { status, audience, search } = request.query as {
      status?: "Draft" | "Published" | "Archived";
      audience?: "Customer" | "Internal" | "Both";
      search?: string;
    };
    return listArticles({ status, audience, search });
  });

  // GET /api/v1/articles/:id
  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const article = await getArticle(id);
    if (!article) return reply.notFound(`Article ${id} not found`);
    return article;
  });

  // POST /api/v1/articles
  fastify.post("/", async (request, reply) => {
    const article = await createArticle(request.body as never);
    return reply.code(201).send(article);
  });

  // PATCH /api/v1/articles/:id
  fastify.patch("/:id", async (request) => {
    const { id } = request.params as { id: string };
    return updateArticle(id, request.body as never);
  });

  // POST /api/v1/articles/:id/publish
  fastify.post("/:id/publish", async (request, reply) => {
    const { id } = request.params as { id: string };
    const article = await publishArticle(id);
    return reply.code(200).send(article);
  });

  // POST /api/v1/articles/:id/archive
  fastify.post("/:id/archive", async (request, reply) => {
    const { id } = request.params as { id: string };
    const article = await archiveArticle(id);
    return reply.code(200).send(article);
  });

  // DELETE /api/v1/articles/:id
  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteArticle(id);
    return reply.code(204).send();
  });

  // POST /api/v1/articles/suggest  — Claude drafts an article from a chat summary
  fastify.post("/suggest", async (request, reply) => {
    const { conversationSummary } = request.body as { conversationSummary: string };
    if (!conversationSummary) return reply.badRequest("conversationSummary is required");
    const suggestion = await suggestArticleFromChat(conversationSummary);
    return reply.code(200).send(suggestion);
  });
}
