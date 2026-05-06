import process from "node:process";
import { DEFAULT_LIMIT } from "./config.mjs";
import { linearGraphql } from "./linear-client.mjs";
import { normalizeIssue } from "./normalizers.mjs";
import { readEntityFile, writeEntityFile, updateManifest, patchEntityById, nowIso } from "./cache-store.mjs";

export async function searchCachedIssues({ query, status, label, assignee, project, limit = 25 } = {}) {
  const data = await readEntityFile("issues");
  let items = data.items || [];
  const q = query?.toLowerCase();
  if (q) items = items.filter(i => `${i.id} ${i.title} ${i.project} ${(i.labels || []).join(" ")}`.toLowerCase().includes(q));
  if (status) items = items.filter(i => String(i.status || "").toLowerCase() === status.toLowerCase());
  if (label) items = items.filter(i => (i.labels || []).some(l => l.toLowerCase() === label.toLowerCase()));
  if (assignee) items = items.filter(i => String(i.assignee || "").toLowerCase().includes(assignee.toLowerCase()));
  if (project) items = items.filter(i => String(i.project || "").toLowerCase().includes(project.toLowerCase()));
  return { source: "cache", capturedAt: data.capturedAt, count: items.length, items: items.slice(0, limit) };
}

export async function getCachedIssue(id) {
  const data = await readEntityFile("issues");
  const issue = (data.items || []).find(i => i.id?.toLowerCase() === id.toLowerCase() || i.linearId === id);
  return { source: "cache", found: Boolean(issue), issue: issue || null, capturedAt: data.capturedAt };
}

export async function liveIssue(identifier) {
  const query = `query Issue($id: String!) { issue(id: $id) { id identifier title priority priorityLabel updatedAt url state { id name type } assignee { id name displayName } project { id name } labels { nodes { id name } } } }`;
  const data = await linearGraphql(query, { id: identifier }, "issue_live_fetch");
  if (!data.issue) throw new Error(`Issue not found: ${identifier}`);
  return normalizeIssue(data.issue);
}

export async function getIssue(id, liveRefresh = false) {
  if (!liveRefresh) return getCachedIssue(id);
  const issue = await liveIssue(id);
  await patchEntityById("issues", issue);
  return { source: "live", issue };
}

export async function syncIssues(updatedAfter = null, limit = DEFAULT_LIMIT) {
  const filter = { team: process.env.LINEAR_TEAM_ID ? { id: { eq: process.env.LINEAR_TEAM_ID } } : undefined };
  if (updatedAfter) filter.updatedAt = { gt: updatedAfter };
  const query = `query Issues($first: Int!, $filter: IssueFilter) { issues(first: $first, filter: $filter, orderBy: updatedAt) { nodes { id identifier title priority priorityLabel updatedAt url state { id name type } assignee { id name displayName } project { id name } labels { nodes { id name } } } } }`;
  const data = await linearGraphql(query, { first: limit, filter }, "issues_sync");
  const changed = data.issues.nodes.map(normalizeIssue);
  const existing = await readEntityFile("issues");
  const byId = new Map((existing.items || []).map(i => [i.id, i]));
  for (const issue of changed) byId.set(issue.id, { ...(byId.get(issue.id) || {}), ...issue });
  const items = [...byId.values()].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  await writeEntityFile("issues", { capturedAt: nowIso(), source: "linear-cache-mcp/issues_sync", items });
  await updateManifest({ syncState: { lastIncrementalSyncAt: nowIso() }, entityStats: { issues: items.length } });
  return { changed: changed.length, total: items.length };
}

export async function updateIssue(id, fields) {
  const before = await liveIssue(id);
  const input = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
  if (Object.keys(input).length === 0) return { skipped: true, reason: "No update fields supplied.", before };
  const data = await linearGraphql(`mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success issue { id identifier title priority priorityLabel updatedAt url state { id name type } assignee { id name displayName } project { id name } labels { nodes { id name } } } } }`, { id, input }, "issue_update");
  const issue = normalizeIssue(data.issueUpdate.issue);
  await patchEntityById("issues", issue);
  return { success: data.issueUpdate.success, before, issue };
}

export async function moveIssue(id, stateId) {
  const before = await liveIssue(id);
  const data = await linearGraphql(`mutation MoveIssue($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success issue { id identifier title priority priorityLabel updatedAt url state { id name type } assignee { id name displayName } project { id name } labels { nodes { id name } } } } }`, { id, input: { stateId } }, "issue_move");
  const issue = normalizeIssue(data.issueUpdate.issue);
  await patchEntityById("issues", issue);
  return { success: data.issueUpdate.success, before, issue };
}

export async function commentIssue(issueId, body) {
  const before = await liveIssue(issueId);
  const data = await linearGraphql(`mutation Comment($input: CommentCreateInput!) { commentCreate(input: $input) { success comment { id createdAt url body } } }`, { input: { issueId: before.linearId, body } }, "issue_comment");
  const after = await liveIssue(issueId);
  await patchEntityById("issues", after);
  return { success: data.commentCreate.success, before, after, comment: data.commentCreate.comment };
}

export async function createIssue({ teamId, ...fields }) {
  const input = { teamId: teamId || process.env.LINEAR_TEAM_ID, ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)) };
  if (!input.teamId) throw new Error("teamId or LINEAR_TEAM_ID is required to create issues.");
  const data = await linearGraphql(`mutation CreateIssue($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { id identifier title priority priorityLabel updatedAt url state { id name type } assignee { id name displayName } project { id name } labels { nodes { id name } } } } }`, { input }, "issue_create");
  const issue = normalizeIssue(data.issueCreate.issue);
  await patchEntityById("issues", issue);
  return { success: data.issueCreate.success, issue };
}
