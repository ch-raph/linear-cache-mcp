import { DEFAULT_LIMIT } from "./config.mjs";
import { linearGraphql } from "./linear-client.mjs";
import { normalizeProject, normalizeProjectUpdate } from "./normalizers.mjs";
import { readEntityFile, writeEntityFile, updateManifest, patchEntityById, nowIso } from "./cache-store.mjs";

export const PROJECT_UPDATE_HEALTH_VALUES = ["onTrack", "atRisk", "offTrack"];

const PROJECT_FIELDS = "id name priority updatedAt url status { id name type } lead { id name displayName } labels { nodes { id name } }";
const PROJECT_UPDATE_FIELDS = "id body health createdAt updatedAt url project { id name }";

function assertProjectSelector({ projectId, projectName } = {}) {
  if (projectId && projectName) throw new Error("Supply either projectId or projectName, not both.");
  if (!projectId && !projectName) throw new Error("projectId or exact projectName is required.");
}

function exactProjectNameMatches(projects, projectName) {
  const desired = projectName.toLowerCase();
  return projects.filter(p => String(p.name || "").toLowerCase() === desired);
}

export async function resolveCachedProject({ projectId, projectName } = {}) {
  assertProjectSelector({ projectId, projectName });
  const data = await readEntityFile("projects");
  const items = data.items || [];
  if (projectId) {
    const project = items.find(p => p.id === projectId) || { id: projectId, name: null };
    return { source: project.name ? "cache" : "input", project, capturedAt: data.capturedAt };
  }
  const matches = exactProjectNameMatches(items, projectName);
  if (matches.length === 0) throw new Error(`No cached project found with exact name: ${projectName}. Run project sync or supply projectId.`);
  if (matches.length > 1) throw new Error(`Multiple cached projects found with exact name: ${projectName}. Supply projectId.`);
  return { source: "cache", project: matches[0], capturedAt: data.capturedAt };
}

export async function liveProject(projectId) {
  const data = await linearGraphql(`query Project($id: String!) { project(id: $id) { ${PROJECT_FIELDS} } }`, { id: projectId }, "project_live_fetch");
  if (!data.project) throw new Error(`Project not found: ${projectId}`);
  return normalizeProject(data.project);
}

export async function listCachedProjectUpdates({ projectId, projectName, limit = 25 } = {}) {
  const updatesData = await readEntityFile("project_updates");
  let items = updatesData.items || [];
  let resolvedProject = null;

  if (projectId || projectName) {
    const resolved = await resolveCachedProject({ projectId, projectName });
    resolvedProject = resolved.project;
    items = items.filter(u => u.projectId === resolved.project.id);
  }

  items = items.sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
  return { source: "cache", capturedAt: updatesData.capturedAt, project: resolvedProject, count: items.length, items: items.slice(0, limit) };
}

async function mergeProjectUpdates(updates, source = "linear-cache-mcp/project_updates") {
  const existing = await readEntityFile("project_updates");
  const byId = new Map((existing.items || []).map(i => [i.id, i]));
  for (const update of updates) byId.set(update.id, { ...(byId.get(update.id) || {}), ...update });
  const items = [...byId.values()].sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
  await writeEntityFile("project_updates", { capturedAt: nowIso(), source, items });
  await updateManifest({ syncState: { lastProjectUpdatesSyncAt: nowIso() }, entityStats: { projectUpdates: items.length } });
  return { changed: updates.length, total: items.length, items };
}

export async function fetchProjectUpdates({ projectId, projectName, limit = DEFAULT_LIMIT } = {}) {
  const resolved = await resolveCachedProject({ projectId, projectName });
  const project = await liveProject(resolved.project.id);
  await patchEntityById("projects", project);

  const data = await linearGraphql(`query ProjectUpdates($id: String!, $first: Int!) { project(id: $id) { id name projectUpdates(first: $first) { nodes { ${PROJECT_UPDATE_FIELDS} } } } }`, { id: project.id, first: limit }, "project_updates_live_fetch");
  if (!data.project) throw new Error(`Project not found: ${project.id}`);
  const nodes = data.project.projectUpdates?.nodes ?? [];
  const updates = nodes.map(node => normalizeProjectUpdate(node, data.project));
  const merged = await mergeProjectUpdates(updates);
  return { source: "live", project, count: updates.length, items: updates, cacheTotal: merged.total };
}

export async function listProjectUpdates({ projectId, projectName, limit = 25, liveRefresh = false } = {}) {
  if (!liveRefresh) return listCachedProjectUpdates({ projectId, projectName, limit });
  return fetchProjectUpdates({ projectId, projectName, limit });
}

export async function createProjectUpdate({ projectId, projectName, body, health } = {}) {
  assertProjectSelector({ projectId, projectName });
  if (!body || !body.trim()) throw new Error("body is required to create a project update.");

  const resolved = await resolveCachedProject({ projectId, projectName });
  const before = await liveProject(resolved.project.id);
  const input = { projectId: before.id, body };
  if (health !== undefined) {
    if (!PROJECT_UPDATE_HEALTH_VALUES.includes(health)) throw new Error(`health must be one of: ${PROJECT_UPDATE_HEALTH_VALUES.join(", ")}`);
    input.health = health;
  }

  const data = await linearGraphql(`mutation CreateProjectUpdate($input: ProjectUpdateCreateInput!) { projectUpdateCreate(input: $input) { success projectUpdate { ${PROJECT_UPDATE_FIELDS} } } }`, { input }, "project_update_create");
  const update = normalizeProjectUpdate(data.projectUpdateCreate.projectUpdate, before);
  await patchEntityById("project_updates", update);

  let after = before;
  try {
    after = await liveProject(before.id);
    await patchEntityById("projects", after);
  } catch {
    await patchEntityById("projects", { id: before.id, name: before.name, updatedAt: update.updatedAt || update.createdAt || nowIso() });
  }

  return { success: data.projectUpdateCreate.success, before, after, projectUpdate: update };
}
