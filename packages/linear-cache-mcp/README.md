# Linear Cache MCP

[![npm version](https://img.shields.io/npm/v/linear-cache-mcp)](https://www.npmjs.com/package/linear-cache-mcp)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](https://github.com/ch-raph/linear-cache-mcp/blob/main/LICENSE)

Cache-first MCP server for [Linear](https://linear.app/). Reduces API usage by serving reads from a local JSON cache, tracks a request budget, and provides write-through mutation tools for coding agent workflows.

## Why this exists

Linear's API has rate limits. Coding agents that query Linear for every read can exhaust them quickly. This server keeps a local mirror of your team's issues and projects, serves reads from cache when fresh, and only calls the Linear API for writes or when the cache is stale.

## Setup

```bash
cd packages/linear-cache-mcp
npm install
```

Set Linear auth using one of these methods.

### Option A: `.env` file

```bash
cp .env.example .env
# Edit .env — add your LINEAR_API_KEY and LINEAR_TEAM_ID
```

`.env` is gitignored. Do not commit real API keys.

### Option B: Environment variables

```bash
export LINEAR_API_KEY="lin_api_..."
export LINEAR_TEAM_ID="your-linear-team-id"
```

### Option C: MCP client config

Pass secrets through your MCP host's env config. See [`examples/`](https://github.com/ch-raph/linear-cache-mcp/tree/main/examples) for ready-to-copy templates.

```json
{
  "mcpServers": {
    "linear-cache": {
      "command": "npx",
      "args": ["-y", "linear-cache-mcp"],
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY}",
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

## Pi Coding Agent Setup

[Pi](https://github.com/mariozechner/pi-coding-agent) is a terminal-based coding agent.
This server integrates via [`pi-mcp-adapter`](https://www.npmjs.com/package/pi-mcp-adapter),
which reads a `.mcp.json` file in the project root and bridges MCP servers into Pi's tool system.

### 1. Install the adapter (once)

```bash
pi extensions install pi-mcp-adapter
```

### 2. Create `.mcp.json` in your project root

Copy the template from [`examples/pi-project/`](https://github.com/ch-raph/linear-cache-mcp/tree/main/examples/pi-project) or use:

```json
{
  "settings": { "toolPrefix": "none" },
  "mcpServers": {
    "linear-cache": {
      "command": "npx",
      "args": ["-y", "linear-cache-mcp"],
      "env": {
        "LINEAR_API_KEY": "${LINEAR_API_KEY}",
        "LINEAR_TEAM_ID": "your-linear-team-id"
      },
      "directTools": true,
      "lifecycle": "lazy"
    }
  }
}
```

### 3. Set your API key

Export it in your shell profile (`.zshrc`, `.bashrc`, etc.):

```bash
export LINEAR_API_KEY="lin_api_..."
```

Or use a `.env` file in the project root (also gitignored).

### 4. Add the skill (optional)

Copy `skills/linear-ops/` into your project's `.agents/skills/linear-ops/`.
Agents will load it automatically for Linear tasks.

### 5. Verify

Open Pi in your project. The 13 `linear_cache_*` tools should appear.
Run `linear_cache_status` to confirm the server is connected and the cache is initialized.

### Project structure after setup

```
your-project/
  .mcp.json                  ← gitignored (has API key)
  .mcp.json.example          ← tracked template
  .agent/linear-cache/       ← auto-created by server
    manifest.json
    latest/
      issues.json
      projects.json
    request-ledger.jsonl
  .agents/skills/linear-ops/ ← optional skill
    SKILL.md
```

## Tools

All 13 tools use underscore naming for MCP compatibility:

### Read (cache-only, 0 API cost)
- `linear_cache_status` — cache freshness, file counts, budget mode
- `linear_cache_budget_status` — current-hour request usage
- `linear_cache_search_issues` — search by text, status, label, assignee, project
- `linear_cache_get_issue` — get by ID (optionally `liveRefresh: true`)
- `linear_cache_list_projects` — list/search projects
- `linear_cache_list_project_updates` — list project updates

### Write / Sync (calls Linear API)
- `linear_cache_sync_incremental` — sync since last update (budget-gated)
- `linear_cache_sync_full` — full reconciliation (budget-gated)
- `linear_cache_create_issue`
- `linear_cache_update_issue`
- `linear_cache_move_issue`
- `linear_cache_comment_issue`
- `linear_cache_create_project_update`

## Workflow

1. **Cache-first reads** — `linear_cache_search_issues`, `linear_cache_get_issue`, etc. cost nothing
2. **Check budget** before live operations — `linear_cache_budget_status`
3. **Live-fetch before writes** — use `liveRefresh: true` on get before mutating
4. **Sync when stale** — `linear_cache_sync_incremental` if the cache is >2 hours old
5. **Write-through** — after any mutation, the cache is automatically patched

### Budget thresholds

| Requests/hour | Mode |
|---|---|
| <900 | Normal |
| 900–1200 | Avoid broad refreshes |
| 1200–1400 | Targeted reads/writes only |
| >1400 | Ask before any Linear call |

## Write safety

Write tools live-fetch relevant entities, perform the mutation, then refresh/patch the cache and append request ledger entries.

Project Update tools accept either `projectId` or exact `projectName`. Exact-name lookup uses cached projects and rejects missing or ambiguous names. Optional Project Update `health` values are `onTrack`, `atRisk`, or `offTrack`.

If `LINEAR_API_KEY` is missing, read-only cache tools still work; live sync and writes return clear errors.

## Local state

The server stores cache data in `.agent/linear-cache/` (auto-created, gitignored):

- `manifest.json` — sync metadata and freshness tracking
- `latest/issues.json` — cached issues
- `latest/projects.json` — cached projects
- `latest/project_updates.json` — cached project updates
- `request-ledger.jsonl` — local API request accounting

## Source layout

- `src/server.mjs` — executable entrypoint
- `src/config.mjs` — paths, Linear endpoint, defaults, budget thresholds
- `src/cache-store.mjs` — JSON cache files, manifest, entity patching
- `src/ledger.mjs` — request ledger and hourly budget
- `src/linear-client.mjs` — Linear GraphQL wrapper
- `src/normalizers.mjs` — issue/project/project-update normalization
- `src/issue-service.mjs` — issue cache search, live fetch, sync, write-through
- `src/project-service.mjs` — project cache search and sync
- `src/project-update-service.mjs` — Project Update cache, refresh, creation
- `src/tools.mjs` — MCP tool registration

## Links

- [GitHub](https://github.com/ch-raph/linear-cache-mcp)
- [npm](https://www.npmjs.com/package/linear-cache-mcp)
- [Linear](https://linear.app/)
- [Pi coding agent](https://github.com/mariozechner/pi-coding-agent)
