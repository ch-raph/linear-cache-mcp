# Linear Cache MCP

A cache-first Model Context Protocol (MCP) server for Linear, designed for coding agents that need fast Linear context without burning through API request budgets.

## Packages

- `packages/linear-cache-mcp` — the main MCP server.
- `packages/pi-linear-cache-extension` — optional Pi coding agent extension for UX/guardrails.
- `skills/linear-ops` — generic Agent Skill template for Linear workflows.

## Core ideas

- Serve broad reads from a local cache when fresh.
- Keep Linear as the source of truth.
- Live-fetch before every mutation.
- Patch the local cache after writes.
- Track Linear request usage in a local JSONL ledger.

## Quick start

```bash
cd packages/linear-cache-mcp
npm install
cp .env.example .env
# edit .env and add LINEAR_API_KEY
npm test
npm run smoke
npm start
```

## Security

Never commit `.env`, API keys, cache snapshots, or request ledgers. This repo includes `.env.example` only.

## License

MIT
