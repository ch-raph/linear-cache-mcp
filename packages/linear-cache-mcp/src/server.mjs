#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

export { BUDGET_THRESHOLDS, CACHE_ROOT, LATEST_DIR, MANIFEST_PATH, LEDGER_PATH } from "./config.mjs";
export { ensureDirs, readEntityFile, writeEntityFile, readManifest, updateManifest, patchEntityById } from "./cache-store.mjs";
export { appendLedger, budgetStatus } from "./ledger.mjs";
export { normalizeIssue, normalizeProject, normalizeProjectUpdate } from "./normalizers.mjs";
export { searchCachedIssues, getCachedIssue, liveIssue, getIssue, syncIssues, updateIssue, moveIssue, commentIssue, createIssue } from "./issue-service.mjs";
export { listCachedProjects, syncProjects } from "./project-service.mjs";
export { PROJECT_UPDATE_HEALTH_VALUES, resolveCachedProject, liveProject, listCachedProjectUpdates, listProjectUpdates, fetchProjectUpdates, createProjectUpdate } from "./project-update-service.mjs";
export { createServer } from "./tools.mjs";

import { CACHE_ROOT } from "./config.mjs";
import { ensureDirs, cacheStatus as buildCacheStatus } from "./cache-store.mjs";
import { budgetStatus } from "./ledger.mjs";
import { createServer } from "./tools.mjs";

function ageMinutes(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.round((Date.now() - t) / 60000));
}

export async function cacheStatus() {
  return buildCacheStatus({ budgetStatus, ageMinutes });
}

export async function runStdioServer() {
  await ensureDirs();
  const transport = new StdioServerTransport();
  await createServer().connect(transport);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain && process.argv.includes("--stdio-smoke")) {
  await ensureDirs();
  console.log(JSON.stringify({ ok: true, cacheRoot: CACHE_ROOT, budget: await budgetStatus() }, null, 2));
  process.exit(0);
}

if (isMain) {
  await runStdioServer();
}
