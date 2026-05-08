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

Put secrets in the MCP host's env/secret config, not in tracked source. See `examples/` for ready-to-copy templates.

Generic MCP client example:

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

### 1. Install the adapter (once per machine)

```bash
pi extensions install pi-mcp-adapter
```

### 2. Create `.mcp.json` in your project root

Copy the template from [examples/pi-project/](../../../examples/pi-project/.mcp.json.example)
or use one of the patterns below.

**If published to npm** (recommended for multi-device use):

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

**If running from a local checkout** (development, sibling repo):

```json
{
  "settings": { "toolPrefix": "none" },
  "mcpServers": {
    "linear-cache": {
      "command": "node",
      "args": ["../linear-cache-mcp/packages/linear-cache-mcp/src/server.mjs"],
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

> **Important:** Add `.mcp.json` to your project's `.gitignore` — it contains your API key.
> Commit `.mcp.json.example` (without the key) instead as a template.

### 3. Set your API key

Export it in your shell profile (`.zshrc`, `.bashrc`, etc.):

```bash
export LINEAR_API_KEY="lin_api_..."
```

Or create a `.env` file in the project root (also gitignored):

```bash
LINEAR_API_KEY=lin_api_...
LINEAR_TEAM_ID=your-linear-team-id
```

### 4. Add the skill (optional but recommended)

Copy `skills/linear-ops/` into your project's `.agents/skills/linear-ops/`.
Agents will load it automatically for Linear tasks.

### 5. Verify

Open Pi in your project. The 13 `linear_cache_*` tools should appear.
Run `linear_cache_status` to confirm the server is connected and cache is initialized.

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
      ...
    request-ledger.jsonl
  .agents/skills/linear-ops/ ← optional skill
    SKILL.md
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
- `linear_cache_list_project_updates`
- `linear_cache_sync_incremental`
- `linear_cache_sync_full`
- `linear_cache_create_issue`
- `linear_cache_update_issue`
- `linear_cache_comment_issue`
- `linear_cache_move_issue`
- `linear_cache_create_project_update`

## Source layout

- `src/server.mjs` — thin executable entrypoint and compatibility exports for tests/tools.
- `src/config.mjs` — paths, Linear endpoint, defaults, and budget thresholds.
- `src/cache-store.mjs` — JSON cache files, manifest handling, and entity patching.
- `src/ledger.mjs` — request ledger and hourly budget status.
- `src/linear-client.mjs` — Linear GraphQL wrapper and request logging.
- `src/normalizers.mjs` — Linear issue/project/project-update normalization.
- `src/issue-service.mjs` — issue cache search, live fetch, sync, and write-through mutations.
- `src/project-service.mjs` — project cache search and sync.
- `src/project-update-service.mjs` — Project Update cache listing, targeted refresh, and write-through creation.
- `src/tools.mjs` — MCP tool registration.

## Local state

- `.agent/linear-cache/manifest.json`
- `.agent/linear-cache/latest/issues.json`
- `.agent/linear-cache/latest/projects.json`
- `.agent/linear-cache/latest/project_updates.json`
- `.agent/linear-cache/request-ledger.jsonl`

## Write safety

Write tools live-fetch relevant entities, perform the mutation, then refresh/patch the cache and append request ledger entries.

Project Update tools accept either `projectId` or exact `projectName`. Exact-name lookup uses cached projects and rejects missing or ambiguous names; live refresh/create then fetches the resolved project before calling Linear. Optional Project Update `health` values are `onTrack`, `atRisk`, or `offTrack`.

If `LINEAR_API_KEY` is missing, read-only cache tools still work; live sync, live Project Update refresh, and writes return clear errors.

## Publishing notes

- Keep API keys, team IDs, and cache roots in environment/config only.
- Keep project-specific workflow rules in project skills/docs, not MCP core logic.
- Keep `.env.example` generic and safe; never commit `.env`.
- Prefer env names that are useful across projects: `LINEAR_API_KEY`, `LINEAR_TEAM_ID`, `LINEAR_CACHE_ROOT`.
