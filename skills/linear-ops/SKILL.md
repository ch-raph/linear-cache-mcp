---
name: linear-ops
description: Use when reading, triaging, syncing, creating, or updating Linear data. Enforces cache-first reads, live-fetch-before-write, request-budget discipline, and project-specific Linear workflow rules.
---

# Linear Ops Skill

## Purpose
Use this skill whenever a task mentions Linear, issues, projects, backlog, meeting-note triage, labels, statuses, or MCP/API rate limits.

## Mandatory protocol
1. **Check local cache status first.** Read `.agent/linear-cache/manifest.json` or use `linear_cache_status` when available.
2. **Use cache-first tools for broad reads.** Prefer `linear_cache_search_issues`, `linear_cache_list_projects`, and local `.agent/linear-cache/latest/*.json` over direct broad Linear MCP calls.
3. **Never write from cache alone.** Before creating/updating/commenting/moving Linear entities, live-fetch exact target entities through the cache MCP write tool or direct Linear tool if the cache MCP is unavailable.
4. **Patch/write through after mutations.** After Linear writes, update local cache and request ledger, or note explicitly if this was not possible.
5. **Check budget before broad syncs.** Use `linear_cache_budget_status` or local request ledger counts. If above soft budget, avoid nonessential broad scans.
6. **Linear remains source of truth.** If live state conflicts with cache, trust live state and patch/flag the cache.

## Request budget discipline
Cache MCP tool names use underscores for MCP client compatibility, for example `linear_cache_status` rather than `linear_cache.status`.

Suggested hourly thresholds:
- `< 900/hour`: normal mode.
- `900-1200/hour`: avoid broad refreshes; prefer targeted fetches.
- `1200-1400/hour`: targeted reads/writes only.
- `> 1400/hour`: ask user before nonessential Linear calls.

Budget checks should use local ledger data, not Linear API calls.

## Project workflow template
Customize this section per project.

Recommended defaults:
- Use projects/docs for durable context, research, commitments, decision logs, and broad themes.
- Create issues only for bounded executable work with a clear owner/success condition.
- Use a decision-needed label/status for ambiguous or decision-bound work.
- Moving an issue to active work should require an owner and a one-sentence success condition.
- Avoid creating issues for pure context if a project update/document is more appropriate.

## Label taxonomy template
Customize labels per project. Suggested groups:
- Workflow: `Needs Decision`, `Blocked`, `Unknown Scope`, `Research/Discovery`, `Prototype`
- Work Type: `Operations`, `Feature`, `Bug`, `Tech Debt`
- Discipline: project-specific functional areas
- Release Scope: project-specific release/milestone labels

## Meeting notes triage
Sort notes into:
1. **Created** — new bounded execution issues.
2. **Updated** — existing projects/issues enriched with context.
3. **Deferred** — unclear, duplicate, or decision-bound items.

Prefer updating existing projects and linking existing issues before creating new issues.

## Write safety checklist
Before any Linear mutation:
1. Identify exact target issue/project and intended change.
2. Live-fetch the target.
3. Verify status, owner, labels, and project still match intent.
4. Apply mutation.
5. Re-fetch or verify mutation response.
6. Patch local cache and append request ledger.
7. Include changed Linear IDs in final response.

## Reporting after Linear work
Final response must include:
- Cache status/freshness used.
- Linear entities read or changed.
- Whether direct Linear calls were used and why.
- Request budget status if broad sync/read was performed.
- Any cache patching that could not be completed.
