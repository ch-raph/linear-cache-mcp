# Linear MCP + Local Cache Protocol

When working with Linear, agents should use the local cache/access layer to reduce API usage and preserve consistent project memory.

1. Cache-first for broad reads: inspect `.agent/linear-cache/manifest.json` and prefer `linear_cache_*` tools before broad Linear MCP reads.
2. Freshness check: planning reads may use cache within the manifest freshness target; stale/missing data should use targeted incremental sync.
3. Live-fetch before writes: before creating/updating/commenting/moving Linear entities, live-fetch exact target entities and verify state still matches intent.
4. Write-through cache: after mutations, patch local cache and update the request ledger when tooling is available.
5. Request ledger: compute hourly budget from `.agent/linear-cache/request-ledger.jsonl`, not from Linear API calls.
6. Source of truth: Linear remains canonical. If cache conflicts with live Linear, trust live state.
7. Skill: for Linear tasks, load/use the `linear-ops` skill when available.
