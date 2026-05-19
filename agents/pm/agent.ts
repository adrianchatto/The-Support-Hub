#!/usr/bin/env tsx
/**
 * PM Agent — Claude-powered product manager
 *
 * Interactive CLI you talk to for product decisions.
 * Knows the product vision, roadmap, and ITIL model.
 * Can write user stories, prioritise, clarify scope, and draft specs.
 *
 * Usage:
 *   cd agents/pm && npx tsx agent.ts
 *
 * Or pipe a question:
 *   echo "What should we build next?" | npx tsx agent.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { createInterface } from "readline";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Load product context from docs ──────────────────────────────────────────

function loadDoc(filename: string): string {
  const path = join(REPO_ROOT, "docs", filename);
  if (!existsSync(path)) return "";
  return `\n--- ${filename} ---\n${readFileSync(path, "utf8")}`;
}

const PRODUCT_CONTEXT = [
  loadDoc("product-vision.md"),
  loadDoc("support-hub-prd.md"),
  loadDoc("roadmap.md"),
  loadDoc("itil-operating-model.md"),
  loadDoc("architecture-direction.md"),
  loadDoc("reporting-model.md"),
  loadDoc("knowledge-base-strategy.md"),
].join("\n\n");

const SYSTEM_PROMPT = `You are the product manager for The Support Hub — an enterprise service management platform.

Your role:
- Help the delivery lead (Ch@o) make product decisions and plan work
- Write clear user stories in the format: "As a [role], I want [feature] so that [benefit]"
- Define acceptance criteria for features
- Prioritise backlog items using value vs effort
- Spot scope creep and flag it directly
- Raise risks and dependencies without being asked
- Keep scope tight and delivery realistic

Communication style:
- Direct and concise — no filler, no cheerleading
- British English spelling
- Flag problems plainly; don't bury bad news
- Always finish with concrete next steps or a clear question

The product context you must work within:

${PRODUCT_CONTEXT}

Current tech stack:
- Frontend: React + TypeScript + Vite
- Backend: Fastify + PostgreSQL (being built with TDD)
- Hosting: Coolify (dev), Azure (target)
- Reporting: Microsoft Fabric + Power BI (future)
- AI: Claude API (Anthropic)

Current status: Backend API scaffold is underway with TDD. Frontend is a prototype.
The four-hub vision: Support Hub → Reporting Hub → Customer Hub → Project Hub.`;

// ─── Conversation loop ────────────────────────────────────────────────────────

type Message = Anthropic.MessageParam;

async function chat(
  history: Message[],
  userMessage: string
): Promise<{ response: string; history: Message[] }> {
  const updatedHistory: Message[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: updatedHistory,
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  return {
    response: text,
    history: [...updatedHistory, { role: "assistant", content: text }],
  };
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

async function main() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: process.stdin.isTTY,
  });

  let history: Message[] = [];

  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  Support Hub — PM Agent                ║");
  console.log("║  Type your question. Ctrl+C to exit.   ║");
  console.log("╚════════════════════════════════════════╝\n");

  const ask = () => {
    if (process.stdin.isTTY) {
      process.stdout.write("You: ");
    }

    rl.once("line", async (input) => {
      const message = input.trim();
      if (!message) {
        ask();
        return;
      }

      try {
        const { response, history: next } = await chat(history, message);
        history = next;
        console.log(`\nPM: ${response}\n`);
      } catch (err) {
        console.error("PM Agent error:", err);
      }

      if (process.stdin.isTTY) {
        ask();
      }
    });
  };

  ask();

  rl.on("close", () => {
    console.log("\nSession ended.");
    process.exit(0);
  });
}

main().catch(console.error);
