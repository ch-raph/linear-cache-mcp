import "dotenv/config";
import fssync from "node:fs";
import path from "node:path";
import process from "node:process";

export const LINEAR_API_URL = "https://api.linear.app/graphql";
export const DEFAULT_LIMIT = 50;
export const BUDGET_THRESHOLDS = { normal: 900, constrained: 1200, targetedOnly: 1400, hard: 1500 };

export function findRepoRoot(start = process.cwd()) {
  let current = path.resolve(start);
  while (true) {
    if (fssync.existsSync(path.join(current, ".git")) || fssync.existsSync(path.join(current, "AGENTS.md"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return process.cwd();
    current = parent;
  }
}

export const REPO_ROOT = findRepoRoot();
export const CACHE_ROOT = path.resolve(process.env.LINEAR_CACHE_ROOT || path.join(REPO_ROOT, ".agent", "linear-cache"));
export const LATEST_DIR = path.join(CACHE_ROOT, "latest");
export const MANIFEST_PATH = path.join(CACHE_ROOT, "manifest.json");
export const LEDGER_PATH = path.join(CACHE_ROOT, "request-ledger.jsonl");
