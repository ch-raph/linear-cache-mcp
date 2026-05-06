import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BUDGET_THRESHOLDS } from "./config.mjs";
import { cacheStatus, readManifest, nowIso, updateManifest } from "./cache-store.mjs";
import { budgetStatus } from "./ledger.mjs";
import { searchCachedIssues, getIssue, syncIssues, updateIssue, moveIssue, commentIssue, createIssue } from "./issue-service.mjs";
import { listCachedProjects, syncProjects } from "./project-service.mjs";

function ageMinutes(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 60000));
}

function textResult(value) {
  return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] };
}

export function createServer() {
  const server = new McpServer({ name: "dor-linear-cache", version: "0.1.0" });

  server.tool("linear_cache_status", "Show Linear cache freshness, counts, and budget mode.", {}, async () => textResult(await cacheStatus({ budgetStatus, ageMinutes })));

  server.tool("linear_cache_budget_status", "Show current-hour Linear request usage from local ledger only.", {}, async () => textResult(await budgetStatus()));

  server.tool("linear_cache_search_issues", "Search cached issues by text, status, label, assignee, or project.", {
    query: z.string().optional(),
    status: z.string().optional(),
    label: z.string().optional(),
    assignee: z.string().optional(),
    project: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(25)
  }, async ({ query, status, label, assignee, project, limit }) => textResult(await searchCachedIssues({ query, status, label, assignee, project, limit })));

  server.tool("linear_cache_get_issue", "Get an issue from cache; optionally live-refresh it from Linear and patch cache.", {
    id: z.string(),
    liveRefresh: z.boolean().default(false)
  }, async ({ id, liveRefresh }) => textResult({ ...(await getIssue(id, liveRefresh)), ...(liveRefresh ? { budget: await budgetStatus() } : {}) }));

  server.tool("linear_cache_list_projects", "List/search cached Linear projects.", {
    query: z.string().optional(),
    status: z.string().optional(),
    limit: z.number().int().min(1).max(100).default(25)
  }, async ({ query, status, limit }) => textResult(await listCachedProjects({ query, status, limit })));

  server.tool("linear_cache_sync_incremental", "Sync issues/projects updated since manifest last incremental sync, budget-gated.", {
    since: z.string().datetime().optional(),
    limit: z.number().int().min(1).max(100).default(50)
  }, async ({ since, limit }) => {
    const budget = await budgetStatus();
    if (budget.usedThisHour >= BUDGET_THRESHOLDS.targetedOnly) return textResult({ blocked: true, reason: "Budget is in confirm_nonessential mode; ask user before broad sync.", budget });
    const manifest = await readManifest();
    const updatedAfter = since || manifest.syncState?.lastIncrementalSyncAt || manifest.syncState?.lastFullSyncAt || null;
    const [issues, projects] = await Promise.all([syncIssues(updatedAfter, limit), syncProjects(updatedAfter, limit)]);
    return textResult({ updatedAfter, issues, projects, budget: await budgetStatus() });
  });

  server.tool("linear_cache_sync_full", "Full issues/projects reconciliation, budget-gated.", {
    limit: z.number().int().min(1).max(250).default(100),
    confirm: z.boolean().default(false)
  }, async ({ limit, confirm }) => {
    const budget = await budgetStatus();
    if (!confirm && budget.usedThisHour >= BUDGET_THRESHOLDS.normal) return textResult({ blocked: true, reason: "Full sync above soft budget requires confirm=true.", budget });
    const [issues, projects] = await Promise.all([syncIssues(null, limit), syncProjects(null, limit)]);
    await updateManifest({ syncState: { lastFullSyncAt: nowIso() } });
    return textResult({ issues, projects, budget: await budgetStatus() });
  });

  server.tool("linear_cache_update_issue", "Live-fetch and update a Linear issue, then patch cache.", {
    id: z.string(),
    title: z.string().optional(),
    description: z.string().optional(),
    priority: z.number().int().min(0).max(4).optional(),
    assigneeId: z.string().optional(),
    stateId: z.string().optional(),
    projectId: z.string().optional()
  }, async ({ id, ...fields }) => textResult({ ...(await updateIssue(id, fields)), budget: await budgetStatus() }));

  server.tool("linear_cache_move_issue", "Move an issue to a Linear state by stateId, with live-fetch and cache patch.", {
    id: z.string(),
    stateId: z.string()
  }, async ({ id, stateId }) => textResult({ ...(await moveIssue(id, stateId)), budget: await budgetStatus() }));

  server.tool("linear_cache_comment_issue", "Live-fetch issue, create comment, then patch issue cache metadata.", {
    issueId: z.string(),
    body: z.string()
  }, async ({ issueId, body }) => textResult({ ...(await commentIssue(issueId, body)), budget: await budgetStatus() }));

  server.tool("linear_cache_create_issue", "Create a Linear issue, then patch cache.", {
    teamId: z.string().optional(),
    title: z.string(),
    description: z.string().optional(),
    priority: z.number().int().min(0).max(4).optional(),
    assigneeId: z.string().optional(),
    projectId: z.string().optional(),
    stateId: z.string().optional(),
    labelIds: z.array(z.string()).optional()
  }, async (params) => textResult({ ...(await createIssue(params)), budget: await budgetStatus() }));

  return server;
}
