# Linear MCP + Local Cache Protocol

When working with Linear, agents must use the local cache/access layer to reduce API usage and preserve a consistent project memory.

1. **Cache-first for broad reads**: use `linear_cache_search_issues`, `linear_cache_get_issue`, `linear_cache_list_projects` (0 API cost) before direct Linear calls.
2. **Freshness check**: if cache manifest is >2 hours old for planning reads, run `linear_cache_sync_incremental` first.
3. **Live-fetch before writes**: use `liveRefresh: true` on `linear_cache_get_issue` before creating/updating/commenting/moving any Linear entity.
4. **Budget awareness**: run `linear_cache_budget_status` before broad operations. <900/hr normal; 900-1200 avoid broad refreshes; 1200-1400 targeted only; >1400 ask first.
5. **Source of truth**: Linear remains canonical. If cache conflicts with live Linear, trust live state and patch or flag the cache.

## Available tools (13)

**Read (cache-only, 0 API cost):**
- `linear_cache_status` — cache freshness, file counts, budget mode
- `linear_cache_budget_status` — current-hour request usage
- `linear_cache_search_issues` — search by text/status/label/assignee/project
- `linear_cache_get_issue` — get by ID (optionally `liveRefresh: true`)
- `linear_cache_list_projects` — list/search projects
- `linear_cache_list_project_updates` — list project updates

**Write/Sync (calls Linear API):**
- `linear_cache_sync_incremental` — sync since last update
- `linear_cache_sync_full` — full reconciliation
- `linear_cache_create_issue`
- `linear_cache_update_issue`
- `linear_cache_move_issue`
- `linear_cache_comment_issue`
- `linear_cache_create_project_update`

## Skill

For Linear tasks, load the project skill at `.agents/skills/linear-ops/SKILL.md`.
