#!/usr/bin/env tsx
/**
 * QA Agent — test runner + coverage reporter + Claude-powered code review
 *
 * Runs the full test suite, captures output, then uses Claude to:
 *  - Summarise what passed and what failed
 *  - Identify missing test coverage for implemented features
 *  - Flag any code that was shipped without corresponding tests
 *  - Block handoff if tests are red
 *
 * Usage:
 *   cd agents/qa && npx tsx agent.ts
 *   cd agents/qa && npx tsx agent.ts --check    # exits 1 if any test fails
 */
import Anthropic from "@anthropic-ai/sdk";
import { execSync, spawnSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readdirSync, readFileSync, existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");
const API_DIR = join(REPO_ROOT, "api");

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Run tests ────────────────────────────────────────────────────────────────

type TestRunResult = {
  passed: boolean;
  output: string;
  exitCode: number;
};

function runTests(): TestRunResult {
  const result = spawnSync("npm", ["test"], {
    cwd: API_DIR,
    encoding: "utf8",
    timeout: 60_000,
  });

  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
  const exitCode = result.status ?? 1;

  return {
    passed: exitCode === 0,
    output,
    exitCode,
  };
}

// ─── Collect source & test files ──────────────────────────────────────────────

function findFiles(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !["node_modules", "dist", ".git"].includes(entry.name)) {
      results.push(...findFiles(full, ext));
    } else if (entry.isFile() && entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

function readSourceContext(): string {
  const srcDir = join(API_DIR, "src");
  const sourceFiles = findFiles(srcDir, ".ts");

  return sourceFiles
    .map((f) => {
      const relative = f.replace(REPO_ROOT + "/", "");
      const content = readFileSync(f, "utf8");
      return `// File: ${relative}\n${content}`;
    })
    .join("\n\n---\n\n");
}

// ─── Claude analysis ──────────────────────────────────────────────────────────

async function analyseWithClaude(
  testOutput: string,
  sourceContext: string,
  passed: boolean
): Promise<string> {
  const prompt = `You are a QA lead reviewing test results and source code for The Support Hub.

TEST RUN OUTPUT:
${testOutput}

SOURCE CODE:
${sourceContext}

STATUS: Tests ${passed ? "PASSED ✓" : "FAILED ✗"}

Provide a QA report covering:

1. **Test result summary** — what passed, what failed, file-by-file
2. **Coverage gaps** — implemented code that has no corresponding test. Be specific about which functions/branches are untested.
3. **TDD compliance** — flag any implementation that appears to have been written without a corresponding test being written first (heuristic: test files that feel retrofitted rather than driving the design)
4. **Handoff verdict** — PASS or BLOCK. If BLOCK, list exactly what must be fixed before handoff.
5. **Next tests to write** — suggest the most important missing tests for features already implemented

Be direct. No padding. British English.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  });

  return response.content[0].type === "text" ? response.content[0].text : "";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const checkMode = process.argv.includes("--check");

  console.log("\n╔════════════════════════════════════════╗");
  console.log("║  Support Hub — QA Agent                ║");
  console.log("╚════════════════════════════════════════╝\n");

  console.log("Running test suite...\n");
  const { passed, output, exitCode } = runTests();

  console.log(output);
  console.log("\n────────────────────────────────────────");
  console.log("Analysing with Claude...\n");

  const sourceContext = readSourceContext();
  const analysis = await analyseWithClaude(output, sourceContext, passed);

  console.log(analysis);

  if (checkMode && !passed) {
    console.error("\n⛔ QA Agent: BLOCK — tests are red. Handoff rejected.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("QA Agent error:", err);
  process.exit(1);
});
