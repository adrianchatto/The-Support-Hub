import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { getPool } from "../db/client.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ArticleStatus = "Draft" | "Published" | "Archived";
export type ArticleAudience = "Customer" | "Internal" | "Both";

export type Article = {
  id: string;
  slug: string | null;
  title: string;
  summary: string;
  body: string;
  category: string | null;
  tags: string[];
  audience: ArticleAudience;
  status: ArticleStatus;
  author_id: string | null;
  published_at: Date | null;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

// ─── Input schemas ────────────────────────────────────────────────────────────

const CreateArticleSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().min(1),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  audience: z.enum(["Customer", "Internal", "Both"]).optional(),
});

export type CreateArticleInput = z.input<typeof CreateArticleSchema>;

const UpdateArticleSchema = CreateArticleSchema.partial();
export type UpdateArticleInput = z.input<typeof UpdateArticleSchema>;

// ─── Domain functions ─────────────────────────────────────────────────────────

export async function createArticle(input: CreateArticleInput): Promise<Article> {
  const data = CreateArticleSchema.parse(input);
  const pool = getPool();

  const result = await pool.query<Article>(
    `INSERT INTO articles (title, summary, body, category, tags, audience, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'Draft')
     RETURNING *`,
    [
      data.title,
      data.summary,
      data.body,
      data.category ?? null,
      data.tags ?? [],
      data.audience ?? "Customer",
    ]
  );

  return result.rows[0];
}

export async function getArticle(id: string): Promise<Article | null> {
  const pool = getPool();
  const result = await pool.query<Article>(`SELECT * FROM articles WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function listArticles(opts: {
  status?: ArticleStatus;
  audience?: ArticleAudience;
  search?: string;
} = {}): Promise<Article[]> {
  const pool = getPool();
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (opts.status) {
    conditions.push(`status = $${idx++}`);
    params.push(opts.status);
  }
  if (opts.audience) {
    conditions.push(`(audience = $${idx++} OR audience = 'Both')`);
    params.push(opts.audience);
  }
  if (opts.search) {
    conditions.push(`(title ILIKE $${idx} OR summary ILIKE $${idx} OR body ILIKE $${idx})`);
    params.push(`%${opts.search}%`);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query<Article>(
    `SELECT * FROM articles ${where} ORDER BY updated_at DESC LIMIT 100`,
    params
  );
  return result.rows;
}

export async function updateArticle(id: string, input: UpdateArticleInput): Promise<Article> {
  const data = UpdateArticleSchema.parse(input);
  const pool = getPool();

  const sets: string[] = ["updated_at = NOW()"];
  const params: unknown[] = [id];
  let idx = 2;

  if (data.title !== undefined)    { sets.push(`title = $${idx++}`);    params.push(data.title); }
  if (data.summary !== undefined)  { sets.push(`summary = $${idx++}`);  params.push(data.summary); }
  if (data.body !== undefined)     { sets.push(`body = $${idx++}`);     params.push(data.body); }
  if (data.category !== undefined) { sets.push(`category = $${idx++}`); params.push(data.category); }
  if (data.tags !== undefined)     { sets.push(`tags = $${idx++}`);     params.push(data.tags); }
  if (data.audience !== undefined) { sets.push(`audience = $${idx++}`); params.push(data.audience); }

  const result = await pool.query<Article>(
    `UPDATE articles SET ${sets.join(", ")} WHERE id = $1 RETURNING *`,
    params
  );

  if (!result.rows[0]) throw new Error(`Article ${id} not found`);
  return result.rows[0];
}

export async function publishArticle(id: string): Promise<Article> {
  const pool = getPool();
  const result = await pool.query<Article>(
    `UPDATE articles
     SET status = 'Published', published_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  if (!result.rows[0]) throw new Error(`Article ${id} not found`);
  return result.rows[0];
}

export async function archiveArticle(id: string): Promise<Article> {
  const pool = getPool();
  const result = await pool.query<Article>(
    `UPDATE articles
     SET status = 'Archived', archived_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id]
  );
  if (!result.rows[0]) throw new Error(`Article ${id} not found`);
  return result.rows[0];
}

export async function deleteArticle(id: string): Promise<void> {
  const pool = getPool();
  await pool.query(`DELETE FROM articles WHERE id = $1`, [id]);
}

// ─── AI suggestion ────────────────────────────────────────────────────────────

export type ArticleSuggestion = {
  title: string;
  summary: string;
  body: string;
  category: string;
  tags: string[];
};

export async function suggestArticleFromChat(
  conversationSummary: string
): Promise<ArticleSuggestion> {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system: `You are a knowledge management assistant for an IT service desk.
Based on a support conversation summary, draft a knowledge base article that would help future customers self-serve this type of issue.
Return ONLY valid JSON matching this shape:
{
  "title": "string",
  "summary": "string (1-2 sentences)",
  "body": "string (markdown, 200-400 words)",
  "category": "string (e.g. Access & Accounts, Hardware, Software, Network, Security)",
  "tags": ["string"]
}`,
    messages: [
      {
        role: "user",
        content: `Support conversation summary:\n\n${conversationSummary}\n\nDraft a knowledge base article for this.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Claude did not return valid JSON");

  return JSON.parse(jsonMatch[0]) as ArticleSuggestion;
}
