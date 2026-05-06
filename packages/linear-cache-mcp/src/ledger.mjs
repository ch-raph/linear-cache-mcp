import fs from "node:fs/promises";
import { CACHE_ROOT, LEDGER_PATH, BUDGET_THRESHOLDS } from "./config.mjs";
import { nowIso } from "./cache-store.mjs";

export async function appendLedger(entry) {
  await fs.mkdir(CACHE_ROOT, { recursive: true });
  const row = { ts: nowIso(), linearRequests: 1, ...entry };
  await fs.appendFile(LEDGER_PATH, JSON.stringify(row) + "\n", "utf8");
}

export async function budgetStatus() {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  let total = 0;
  try {
    const text = await fs.readFile(LEDGER_PATH, "utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        const ts = new Date(row.ts);
        if (ts >= start) total += Number(row.linearRequests ?? row.estimatedRequests ?? 1);
      } catch {}
    }
  } catch {}

  let mode = "normal";
  if (total >= BUDGET_THRESHOLDS.targetedOnly) mode = "confirm_nonessential";
  else if (total >= BUDGET_THRESHOLDS.constrained) mode = "targeted_only";
  else if (total >= BUDGET_THRESHOLDS.normal) mode = "avoid_broad_refreshes";

  return { hourStart: start.toISOString(), usedThisHour: total, hardLimit: BUDGET_THRESHOLDS.hard, thresholds: BUDGET_THRESHOLDS, mode };
}
