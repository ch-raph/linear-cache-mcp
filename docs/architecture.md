# Architecture

## Components

```text
Agent / MCP client
        ↓
linear-cache-mcp
        ↓
local JSON cache + request ledger
        ↓
Linear GraphQL API
```

## Responsibilities

- `linear-cache-mcp`: cache-aware tools, live Linear access, write-through mutation flow.
- Local cache: fast planning reads and broad context.
- Request ledger: local-only request accounting for hourly budget guardrails.
- Project skill/extension: optional workflow guidance and UI guardrails.

## Source of truth

Linear remains canonical. Cache data can be stale and should not be used as write authority.

## Write-through flow

1. Live-fetch exact target entity.
2. Verify current state still matches intent.
3. Mutate Linear.
4. Re-fetch or use mutation response.
5. Patch local cache.
6. Append request ledger rows.
