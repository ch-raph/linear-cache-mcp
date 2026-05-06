import { DEFAULT_LIMIT } from "./config.mjs";
import { linearGraphql } from "./linear-client.mjs";
import { normalizeProject } from "./normalizers.mjs";
import { readEntityFile, writeEntityFile, updateManifest, nowIso } from "./cache-store.mjs";

export async function listCachedProjects({ query, status, limit = 25 } = {}) {
  const data = await readEntityFile("projects");
  let items = data.items || [];
  if (query) items = items.filter(p => `${p.name} ${(p.labels || []).join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  if (status) items = items.filter(p => String(p.status || "").toLowerCase() === status.toLowerCase());
  return { source: "cache", capturedAt: data.capturedAt, count: items.length, items: items.slice(0, limit) };
}

export async function syncProjects(updatedAfter = null, limit = DEFAULT_LIMIT) {
  const filter = {};
  if (updatedAfter) filter.updatedAt = { gt: updatedAfter };
  const query = `query Projects($first: Int!, $filter: ProjectFilter) { projects(first: $first, filter: $filter, orderBy: updatedAt) { nodes { id name priority updatedAt url status { id name type } lead { id name displayName } labels { nodes { id name } } } } }`;
  const data = await linearGraphql(query, { first: limit, filter }, "projects_sync");
  const changed = data.projects.nodes.map(normalizeProject);
  const existing = await readEntityFile("projects");
  const byId = new Map((existing.items || []).map(i => [i.id, i]));
  for (const project of changed) byId.set(project.id, { ...(byId.get(project.id) || {}), ...project });
  const items = [...byId.values()].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  await writeEntityFile("projects", { capturedAt: nowIso(), source: "linear-cache-mcp/projects_sync", items });
  await updateManifest({ syncState: { lastIncrementalSyncAt: nowIso() }, entityStats: { projects: items.length } });
  return { changed: changed.length, total: items.length };
}
