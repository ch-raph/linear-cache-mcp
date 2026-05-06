import { promises as fs } from "node:fs";
import path from "node:path";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const CACHE_ROOT = path.join(".agent", "linear-cache");
const MANIFEST = path.join(CACHE_ROOT, "manifest.json");
const LEDGER = path.join(CACHE_ROOT, "request-ledger.jsonl");

const THRESHOLDS = {
  normal: 900,
  constrained: 1200,
  targetedOnly: 1400,
  hard: 1500,
};

interface BudgetStatus {
  hourStart: string;
  usedThisHour: number;
  hardLimit: number;
  mode: "normal" | "avoid_broad_refreshes" | "targeted_only" | "confirm_nonessential";
}

async function readJsonSafe(filePath: string): Promise<any | undefined> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return undefined;
  }
}

function ageMinutes(iso?: string): number | undefined {
  if (!iso) return undefined;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return undefined;
  return Math.max(0, Math.round((Date.now() - t) / 60000));
}

async function budgetStatus(cwd: string): Promise<BudgetStatus> {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  let usedThisHour = 0;

  try {
    const text = await fs.readFile(path.join(cwd, LEDGER), "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        const ts = new Date(row.ts);
        if (ts >= start) usedThisHour += Number(row.linearRequests ?? row.estimatedRequests ?? 1);
      } catch {
        // Ignore malformed ledger rows.
      }
    }
  } catch {
    // Missing ledger means zero tracked requests.
  }

  let mode: BudgetStatus["mode"] = "normal";
  if (usedThisHour >= THRESHOLDS.targetedOnly) mode = "confirm_nonessential";
  else if (usedThisHour >= THRESHOLDS.constrained) mode = "targeted_only";
  else if (usedThisHour >= THRESHOLDS.normal) mode = "avoid_broad_refreshes";

  return { hourStart: start.toISOString(), usedThisHour, hardLimit: THRESHOLDS.hard, mode };
}

async function cacheSummary(cwd: string): Promise<string> {
  const manifest = await readJsonSafe(path.join(cwd, MANIFEST));
  const budget = await budgetStatus(cwd);
  const lastIncremental = manifest?.syncState?.lastIncrementalSyncAt;
  const lastFull = manifest?.syncState?.lastFullSyncAt;
  const generated = manifest?.generatedAt;
  const issueCount = manifest?.entityStats?.issues ?? "?";
  const projectCount = manifest?.entityStats?.projects ?? "?";

  return [
    `Linear cache: ${manifest ? "present" : "missing"}`,
    `generated: ${generated ?? "unknown"}${generated ? ` (${ageMinutes(generated)}m ago)` : ""}`,
    `last incremental: ${lastIncremental ?? "unknown"}${lastIncremental ? ` (${ageMinutes(lastIncremental)}m ago)` : ""}`,
    `last full: ${lastFull ?? "unknown"}${lastFull ? ` (${ageMinutes(lastFull)}m ago)` : ""}`,
    `entities: ${issueCount} issues, ${projectCount} projects`,
    `budget: ${budget.usedThisHour}/${budget.hardLimit} this hour (${budget.mode})`,
  ].join("\n");
}

function isDirectLinearTool(toolName: string): boolean {
  const name = toolName.toLowerCase();
  return name.includes("linear") && !name.startsWith("linear_cache");
}

function isBroadLinearTool(toolName: string, input: unknown): boolean {
  const name = toolName.toLowerCase();
  const inputText = JSON.stringify(input ?? {}).toLowerCase();
  return (
    name.includes("list") ||
    name.includes("search") ||
    name.includes("sync") ||
    inputText.includes("first") ||
    inputText.includes("limit") ||
    inputText.includes("query")
  );
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    const budget = await budgetStatus(ctx.cwd);
    ctx.ui.setStatus("linear-cache", `Linear ${budget.usedThisHour}/${budget.hardLimit}`);
    ctx.ui.setWidget("linear-cache", [await cacheSummary(ctx.cwd)]);
  });

  pi.on("before_agent_start", async (event, ctx) => {
    const prompt = event.prompt.toLowerCase();
    if (!prompt.includes("linear") && !prompt.includes("issue") && !prompt.includes("backlog") && !prompt.includes("discord")) {
      return;
    }

    const summary = await cacheSummary(ctx.cwd);
    return {
      message: {
        customType: "linear-cache-status",
        content: `Linear cache guardrail active. Use /skill:linear-ops and cache-aware MCP tools before broad Linear calls.\n${summary}`,
        display: true,
      },
    };
  });

  pi.on("tool_call", async (event, ctx) => {
    if (!isDirectLinearTool(event.toolName)) return;

    const budget = await budgetStatus(ctx.cwd);
    const broad = isBroadLinearTool(event.toolName, event.input);

    if (broad && budget.usedThisHour >= THRESHOLDS.constrained) {
      return {
        block: true,
        reason: `Blocked broad direct Linear tool call (${event.toolName}) because tracked budget is ${budget.usedThisHour}/${budget.hardLimit}. Use linear_cache_* tools or ask the user to override.`,
      };
    }

    if (broad && ctx.hasUI) {
      ctx.ui.notify(
        `Direct broad Linear call detected (${event.toolName}). Prefer linear_cache_* tools to preserve request budget.`,
        "warning",
      );
    }
  });

  pi.registerCommand("linear-status", {
    description: "Show local Linear cache status and hourly request budget.",
    handler: async (_args, ctx) => {
      ctx.ui.notify(await cacheSummary(ctx.cwd), "info");
      ctx.ui.setWidget("linear-cache", [await cacheSummary(ctx.cwd)]);
    },
  });

  pi.registerCommand("linear-budget", {
    description: "Show current-hour Linear request budget from local ledger.",
    handler: async (_args, ctx) => {
      const budget = await budgetStatus(ctx.cwd);
      ctx.ui.notify(JSON.stringify(budget, null, 2), "info");
      ctx.ui.setStatus("linear-cache", `Linear ${budget.usedThisHour}/${budget.hardLimit}`);
    },
  });

  pi.registerCommand("linear-sync", {
    description: "Instructions for syncing through the Linear cache MCP server.",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        "Use MCP tool linear_cache_sync_incremental for normal refreshes. Use linear_cache_sync_full only for daily reconciliation or suspected drift.",
        "info",
      );
    },
  });

  pi.registerCommand("linear-cache-help", {
    description: "Show Linear cache protocol quick help.",
    handler: async (_args, ctx) => {
      ctx.ui.notify(
        [
          "Linear cache protocol:",
          "1. /skill:linear-ops for workflow guidance.",
          "2. Use linear_cache_status and linear_cache_budget_status first.",
          "3. Use cache-first read tools for broad context.",
          "4. Live-fetch before every write.",
          "5. Write-through patch cache after mutations.",
        ].join("\n"),
        "info",
      );
    },
  });
}
