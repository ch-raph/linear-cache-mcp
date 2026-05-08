# Pi Project Setup

This directory contains the files you need in your Pi-based project to use linear-cache-mcp.

## Files to copy into your project

| File | Destination | Purpose |
|------|-------------|---------|
| `.mcp.json.example` | `.mcp.json` (then edit) | MCP server config for pi-mcp-adapter |
| `AGENTS-snippet.md` | Merge into `AGENTS.md` | Agent workflow rules for Linear |

## Quick setup

```bash
# 1. Install the adapter (once per machine)
pi extensions install pi-mcp-adapter

# 2. Copy and configure
cp .mcp.json.example ../.mcp.json
# Edit .mcp.json: replace "your-linear-team-id" with your actual team ID

# 3. Set your API key
export LINEAR_API_KEY="lin_api_..."

# 4. Add .mcp.json to .gitignore (it contains secrets)
echo ".mcp.json" >> ../.gitignore

# 5. Copy the skill
cp -r ../../skills/linear-ops ../.agents/skills/linear-ops/

# 6. Merge AGENTS-snippet.md into your project's AGENTS.md
```

## After npm publish

Once `linear-cache-mcp` is published to npm, the `.mcp.json.example` uses `npx -y linear-cache-mcp`
which auto-installs on first run. No local path dependencies.
