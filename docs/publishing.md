# Publishing

## Before publishing

- Confirm `npm test` passes.
- Confirm no real API keys are present.
- Confirm fixtures use generic names and IDs.
- Confirm `.env` and `.agent/` are ignored.
- Decide package scope/name.

## Package

The main publishable package is:

```text
packages/linear-cache-mcp
```

Suggested first publish flow:

```bash
cd packages/linear-cache-mcp
npm ci
npm test
npm publish --dry-run
```

When ready:

```bash
npm publish
```

## Optional companion packages

The Pi extension can be published later or distributed as a copy/symlink template until the API stabilizes.
