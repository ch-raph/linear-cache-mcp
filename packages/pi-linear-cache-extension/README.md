# Pi Extension: Linear Cache

Optional Pi coding agent extension that adds UX and guardrails for the Linear cache workflow.

## Features

- `/linear-status` — show cache freshness/entity counts/budget.
- `/linear-budget` — show current-hour tracked Linear usage.
- `/linear-sync` — remind agents to use cache MCP sync tools.
- `/linear-cache-help` — quick protocol summary.
- Injects concise cache guidance on prompts mentioning Linear/issues/backlog.
- Warns on direct broad Linear tool calls and blocks broad direct Linear calls above the constrained budget threshold.

## Install locally in Pi

Copy or symlink `src/index.ts` into a Pi extension directory, for example:

```bash
mkdir -p .pi/extensions/linear-cache
cp packages/pi-linear-cache-extension/src/index.ts .pi/extensions/linear-cache/index.ts
```

Then run `/reload` in Pi.

## Notes

This extension reads local files only. It does not call Linear itself. Request counts come from `.agent/linear-cache/request-ledger.jsonl`.
