import fs from "node:fs/promises";
import path from "node:path";
import { CACHE_ROOT, LATEST_DIR, MANIFEST_PATH } from "./config.mjs";

export function nowIso() {
  return new Date().toISOString();
}

export async function ensureDirs() {
  await fs.mkdir(LATEST_DIR, { recursive: true });
}

export async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

export async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2) + "\n", "utf8");
}

export async function readEntityFile(name) {
  return readJson(path.join(LATEST_DIR, `${name}.json`), { capturedAt: null, source: "local/missing", items: [] });
}

export async function writeEntityFile(name, data) {
  await writeJson(path.join(LATEST_DIR, `${name}.json`), data);
}

export async function readManifest() {
  return readJson(MANIFEST_PATH, {
    syncPolicyVersion: "1.0.0",
    generatedAt: null,
    freshnessTargets: {
      planningReadMaxAgeMinutes: 120,
      incrementalSyncEveryMinutes: 30,
      fullReconciliationEveryHours: 24
    },
    entityStats: {},
    syncState: {},
    writeSafety: { liveRefetchRequiredBeforeMutation: true, patchCacheAfterMutation: true }
  });
}

export async function updateManifest(patch = {}) {
  const manifest = await readManifest();
  const next = {
    ...manifest,
    ...patch,
    generatedAt: nowIso(),
    syncState: { ...(manifest.syncState || {}), ...(patch.syncState || {}) },
    entityStats: { ...(manifest.entityStats || {}), ...(patch.entityStats || {}) }
  };
  await writeJson(MANIFEST_PATH, next);
  return next;
}

function entityStatKey(name) {
  if (name === "project_updates") return "projectUpdates";
  return name;
}

export async function patchEntityById(name, item) {
  const file = await readEntityFile(name);
  const items = Array.isArray(file.items) ? file.items : [];
  const idx = items.findIndex(x => x.id === item.id || (item.linearId && x.linearId === item.linearId));
  if (idx >= 0) items[idx] = { ...items[idx], ...item };
  else items.unshift(item);
  await writeEntityFile(name, { ...file, patchedAt: nowIso(), items });
  await updateManifest({ syncState: { lastWriteBackAt: nowIso() }, entityStats: { [entityStatKey(name)]: items.length } });
}

export async function cacheStatus({ budgetStatus, ageMinutes }) {
  await ensureDirs();
  const manifest = await readManifest();
  const files = {};
  for (const name of ["teams", "users", "issue_labels", "issue_statuses", "cycles", "projects", "issues", "project_updates"]) {
    const data = await readEntityFile(name);
    files[name] = { items: data.items?.length ?? 0, capturedAt: data.capturedAt ?? null, ageMinutes: ageMinutes(data.capturedAt) };
  }
  return { cacheRoot: CACHE_ROOT, manifest, files, budget: await budgetStatus() };
}
