# Linear Cache MCP

[![npm version](https://img.shields.io/npm/v/linear-cache-mcp)](https://www.npmjs.com/package/linear-cache-mcp)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

A cache-first MCP server for [Linear](https://linear.app/) that lets coding agents read from a local JSON cache instead of burning through API request budgets on every query.

## What it does

- **13 MCP tools** — search, read, create, update, and comment on Linear issues and projects
- **Local JSON cache** — fast planning reads with zero API cost
- **Request budget tracking** — prevents accidentally blowing through Linear's API rate limits
- **Write-through safety** — live-fetches entities before mutating, patches cache after writes
- **Project-first model** — issues live inside projects; projects hold durable context

## Why cache-first?

Linear's API has rate limits. Coding agents that query Linear directly for every context read can exhaust them quickly. This server maintains a local mirror of your team's issues and projects, serves reads from cache when fresh, and only hits the Linear API for writes or when the cache is stale.

## Quick start

```bash
npx linear-cache-mcp
```

Or for development:

```bash
cd packages/linear-cache-mcp
npm install
cp .env.example .env  # add your LINEAR_API_KEY
npm test
npm start
```

Full setup instructions are in the [package README](./packages/linear-cache-mcp/README.md), including [Pi coding agent integration](./packages/linear-cache-mcp/README.md#pi-coding-agent-setup).

## Structure

| Path | Purpose |
|------|---------|
| `packages/linear-cache-mcp/` | MCP server |
| `skills/linear-ops/` | Agent skill template for Linear workflows |
| `examples/pi-project/` | Ready-to-copy configs for Pi projects |
| `examples/generic-project/` | Generic MCP client config template |

## Links

- **npm:** [linear-cache-mcp](https://www.npmjs.com/package/linear-cache-mcp)
- **Linear:** [linear.app](https://linear.app/)
- **Pi:** [pi-coding-agent](https://github.com/mariozechner/pi-coding-agent)

## License

MIT
