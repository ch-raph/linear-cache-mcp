# Linear Cache MCP

Cache-first MCP server for Linear access. It reduces broad Linear reads, tracks local request budget, and provides write-through mutation tools for agent workflows.

## Status

V1 is JSON-cache based and uses `.agent/linear-cache/latest/*.json`. SQLite can be added later if querying/merging becomes complex.

## Setup

```bash
cd packages/linear-cache-mcp
npm install
```

Set Linear auth and team info using one of these methods.

### Option A: local `.env` file

```bash
cp .env.example .env
$EDITOR .env
```

`.env` is gitignored. Do not commit real API keys.

### Option B: shell environment

```bash
export LINEAR_API_KEY="lin_api_..."
export LINEAR_TEAM_ID="your-linear-team-id"
# optional; defaults to repo root auto-detection
export LINEAR_CACHE_ROOT="/path/to/project/.agent/linear-cache"
```

### Option C: MCP client config

Put secrets in the MCP host's env/secret config, not in tracked source. Conceptual example:

```json
{
  "mcpServers": {
    "linear-cache": {
      "command": "node",
      "args": ["/absolute/path/to/linear-cache-mcp/packages/linear-cache-mcp/src/server.mjs"],
      "env": {
        "LINEAR_API_KEY": "lin_api_...",
        "LINEAR_TEAM_ID": "your-linear-team-id"
      }
    }
  }
}
```

Run locally:

```bash
npm start
```

Run tests:

```bash
npm test
```

## MCP command

Use this command from MCP-compatible clients:

```bash
node /absolute/path/to/linear-cache-mcp/packages/linear-cache-mcp/src/server.mjs
```

## Tools

Tool names use underscores for MCP compatibility:

- `linear_cache_status`
- `linear_cache_budget_status`
- `linear_cache_search_issues`
- `linear_cache_get_issue`
- `linear_cache_list_projects`
- `linear_cache_sync_incremental`
- `linear_cache_sync_full`
- `linear_cache_create_issue`
- `linear_cache_update_issue`
- `linear_cache_comment_issue`
- `linear_cache_move_issue`

## Source layout

- `src/server.mjs` — thin executable entrypoint and compatibility exports for tests/tools.
- `src/config.mjs` — paths, Linear endpoint, defaults, and budget thresholds.
- `src/cache-store.mjs` — JSON cache files, manifest handling, and entity patching.
- `src/ledger.mjs` — request ledger and hourly budget status.
- `src/linear-client.mjs` — Linear GraphQL wrapper and request logging.
- `src/normalizers.mjs` — Linear issue/project normalization.
- `src/issue-service.mjs` — issue cache search, live fetch, sync, and write-through mutations.
- `src/project-service.mjs` — project cache search and sync.
- `src/tools.mjs` — MCP tool registration.

## Local state

- `.agent/linear-cache/manifest.json`
- `.agent/linear-cache/latest/issues.json`
- `.agent/linear-cache/latest/projects.json`
- `.agent/linear-cache/request-ledger.jsonl`

## Write safety

Write tools live-fetch relevant entities, perform the mutation, then refresh/patch the cache and append request ledger entries.

If `LINEAR_API_KEY` is missing, read-only cache tools still work; live sync and writes return clear errors.

## Publishing notes

- Keep API keys, team IDs, and cache roots in environment/config only.
- Keep project-specific workflow rules in project skills/docs, not MCP core logic.
- Keep `.env.example` generic and safe; never commit `.env`.
- Prefer env names that are useful across projects: `LINEAR_API_KEY`, `LINEAR_TEAM_ID`, `LINEAR_CACHE_ROOT`.
