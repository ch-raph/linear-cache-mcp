import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "linear-cache-mcp-"));
process.env.LINEAR_CACHE_ROOT = tempRoot;
// Keep tests cache-only even when a developer has a real .env file.
// dotenv does not override an already-defined environment variable by default.
process.env.LINEAR_API_KEY = "";

const mod = await import(`../src/server.mjs?test=${Date.now()}`);

async function writeJson(relativePath, value) {
  const fullPath = path.join(tempRoot, relativePath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

async function readJson(relativePath) {
  return JSON.parse(await fs.readFile(path.join(tempRoot, relativePath), "utf8"));
}

async function resetCache() {
  await fs.rm(tempRoot, { recursive: true, force: true });
  await fs.mkdir(path.join(tempRoot, "latest"), { recursive: true });
  await writeJson("manifest.json", {
    syncPolicyVersion: "1.0.0",
    generatedAt: "2026-05-06T18:00:00.000Z",
    freshnessTargets: { planningReadMaxAgeMinutes: 120, incrementalSyncEveryMinutes: 30, fullReconciliationEveryHours: 24 },
    entityStats: { issues: 3, projects: 2 },
    syncState: { lastFullSyncAt: "2026-05-06T17:00:00.000Z", lastIncrementalSyncAt: "2026-05-06T18:00:00.000Z" },
    writeSafety: { liveRefetchRequiredBeforeMutation: true, patchCacheAfterMutation: true }
  });
  await writeJson("latest/issues.json", {
    capturedAt: "2026-05-06T18:01:00.000Z",
    source: "test",
    items: [
      { id: "LIN-101", linearId: "uuid-101", title: "Implement knowledge base support", status: "Todo", statusType: "unstarted", priority: "High", assignee: "Alex Example", project: "Knowledge Base", labels: ["Feature", "Programming"], updatedAt: "2026-05-06T16:05:49.332Z" },
      { id: "LIN-102", linearId: "uuid-102", title: "Run design round for knowledge workflows", status: "Todo", statusType: "unstarted", priority: "Medium", assignee: "Alex Example", project: "Knowledge Base", labels: ["Operations", "Needs Decision"], updatedAt: "2026-05-06T16:05:31.285Z" },
      { id: "LIN-7", linearId: "uuid-7", title: "Set up workflow lanes", status: "Done", statusType: "completed", priority: "Low", assignee: "Jordan Example", project: "Operations", labels: ["Operations"], updatedAt: "2026-05-06T12:00:00.000Z" }
    ]
  });
  await writeJson("latest/projects.json", {
    capturedAt: "2026-05-06T18:02:00.000Z",
    source: "test",
    items: [
      { id: "proj-knowledge", name: "Knowledge Base", status: "Active", statusType: "started", labels: ["Example Commitment"], updatedAt: "2026-05-06T16:00:00.000Z" },
      { id: "proj-ops", name: "Operations", status: "Backlog", statusType: "unstarted", labels: [], updatedAt: "2026-05-06T12:00:00.000Z" }
    ]
  });
  await fs.writeFile(path.join(tempRoot, "request-ledger.jsonl"), "", "utf8");
}

test.after(async () => {
  await fs.rm(tempRoot, { recursive: true, force: true });
});

test("budgetStatus sums current-hour ledger rows and ignores stale/malformed rows", async () => {
  await resetCache();
  const now = new Date();
  const lastHour = new Date(now.getTime() - 90 * 60 * 1000);
  const rows = [
    { ts: now.toISOString(), operation: "a", linearRequests: 500 },
    { ts: now.toISOString(), operation: "b", estimatedRequests: 401 },
    { ts: lastHour.toISOString(), operation: "old", linearRequests: 999 },
    "not-json"
  ];
  await fs.writeFile(path.join(tempRoot, "request-ledger.jsonl"), rows.map(r => typeof r === "string" ? r : JSON.stringify(r)).join("\n"), "utf8");

  const budget = await mod.budgetStatus();

  assert.equal(budget.usedThisHour, 901);
  assert.equal(budget.mode, "avoid_broad_refreshes");
});

test("appendLedger writes local request accounting rows", async () => {
  await resetCache();

  await mod.appendLedger({ operation: "unit_test", cacheHit: true });

  const text = await fs.readFile(path.join(tempRoot, "request-ledger.jsonl"), "utf8");
  const row = JSON.parse(text.trim());
  assert.equal(row.operation, "unit_test");
  assert.equal(row.cacheHit, true);
  assert.equal(row.linearRequests, 1);
  assert.ok(row.ts);
});

test("searchCachedIssues filters cache by query, label, status, assignee, project, and limit", async () => {
  await resetCache();

  const byQuery = await mod.searchCachedIssues({ query: "knowledge", limit: 10 });
  assert.equal(byQuery.count, 2);
  assert.deepEqual(byQuery.items.map(i => i.id), ["LIN-101", "LIN-102"]);

  const byLabel = await mod.searchCachedIssues({ label: "Needs Decision", limit: 10 });
  assert.deepEqual(byLabel.items.map(i => i.id), ["LIN-102"]);

  const byStatus = await mod.searchCachedIssues({ status: "Done", limit: 10 });
  assert.deepEqual(byStatus.items.map(i => i.id), ["LIN-7"]);

  const byAssigneeProject = await mod.searchCachedIssues({ assignee: "alex", project: "knowledge", limit: 1 });
  assert.equal(byAssigneeProject.count, 2);
  assert.equal(byAssigneeProject.items.length, 1);
  assert.equal(byAssigneeProject.items[0].id, "LIN-101");
});

test("getCachedIssue finds by public identifier and Linear UUID", async () => {
  await resetCache();

  const byIdentifier = await mod.getCachedIssue("lin-101");
  assert.equal(byIdentifier.found, true);
  assert.equal(byIdentifier.issue.title, "Implement knowledge base support");

  const byUuid = await mod.getCachedIssue("uuid-102");
  assert.equal(byUuid.found, true);
  assert.equal(byUuid.issue.id, "LIN-102");

  const missing = await mod.getCachedIssue("LIN-999");
  assert.equal(missing.found, false);
  assert.equal(missing.issue, null);
});

test("listCachedProjects filters cached projects", async () => {
  await resetCache();

  const byQuery = await mod.listCachedProjects({ query: "knowledge", limit: 10 });
  assert.equal(byQuery.count, 1);
  assert.equal(byQuery.items[0].id, "proj-knowledge");

  const byStatus = await mod.listCachedProjects({ status: "Backlog", limit: 10 });
  assert.deepEqual(byStatus.items.map(p => p.id), ["proj-ops"]);
});

test("cacheStatus reports manifest, entity counts, and budget without live Linear calls", async () => {
  await resetCache();

  const status = await mod.cacheStatus();

  assert.equal(status.cacheRoot, tempRoot);
  assert.equal(status.manifest.entityStats.issues, 3);
  assert.equal(status.files.issues.items, 3);
  assert.equal(status.files.projects.items, 2);
  assert.equal(status.budget.usedThisHour, 0);
});

test("patchEntityById updates or inserts entities and updates manifest write-back metadata", async () => {
  await resetCache();

  await mod.patchEntityById("issues", { id: "LIN-101", title: "Updated title", linearId: "uuid-101" });
  let issues = await readJson("latest/issues.json");
  assert.equal(issues.items.length, 3);
  assert.equal(issues.items.find(i => i.id === "LIN-101").title, "Updated title");
  assert.ok(issues.patchedAt);

  await mod.patchEntityById("issues", { id: "LIN-199", title: "Inserted issue", linearId: "uuid-199" });
  issues = await readJson("latest/issues.json");
  assert.equal(issues.items.length, 4);
  assert.equal(issues.items[0].id, "LIN-199");

  const manifest = await readJson("manifest.json");
  assert.equal(manifest.entityStats.issues, 4);
  assert.ok(manifest.syncState.lastWriteBackAt);
});

test("normalizeIssue and normalizeProject tolerate missing optional nested data", async () => {
  const issue = mod.normalizeIssue({ id: "uuid", identifier: "LIN-1", title: "Title", labels: { nodes: [{ name: "Feature" }] } });
  assert.deepEqual(issue, {
    id: "LIN-1",
    linearId: "uuid",
    title: "Title",
    status: null,
    statusType: null,
    priority: null,
    assignee: null,
    project: null,
    projectId: null,
    labels: ["Feature"],
    updatedAt: undefined,
    url: undefined
  });

  const project = mod.normalizeProject({ id: "proj", name: "Project", labels: { nodes: [] } });
  assert.equal(project.status, null);
  assert.deepEqual(project.labels, []);
});

test("live sync/write path fails clearly without LINEAR_API_KEY", async () => {
  await resetCache();

  await assert.rejects(() => mod.syncIssues(null, 1), /LINEAR_API_KEY is not set/);
});
