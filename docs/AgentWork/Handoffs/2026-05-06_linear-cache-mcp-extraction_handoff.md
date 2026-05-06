# Handoff: Linear Cache MCP Extraction

## Task
Extract the Linear cache MCP work from the Dawn of Ramonda Unity repo into a standalone local repository suitable for reuse and future publishing.

## Goal / success criteria
- Standalone local repo exists and is initialized with git.
- Main MCP server code is generic and testable.
- Optional Pi extension and Agent Skill template are included.
- Tests and smoke checks pass.
- No secrets, local cache blobs, or project-private fixtures are committed.
- Future agent can resume from this handoff.

## Scope in / out
### Scope in
- Local repo setup at `/Users/raph/Repos/linear-cache-mcp`.
- Workspace layout with packages/docs/examples/skills.
- Generic cleanup of tests/docs/package names.
- Initial commit.

### Scope out
- Creating/pushing GitHub remote.
- Publishing npm package.
- Live Linear integration test suite.
- SQLite cache backend.
- Full packaging/install flow for Pi extension.

## Current repo location

```text
/Users/raph/Repos/linear-cache-mcp
```

Current branch:

```text
main
```

Initial commit:

```text
75c6626 Initial linear cache MCP workspace
```

## Files / structure

```text
linear-cache-mcp/
  README.md
  LICENSE
  package.json
  package-lock.json
  .gitignore
  .github/workflows/test.yml
  docs/
    architecture.md
    publishing.md
    security.md
  examples/generic-project/
    AGENTS-snippet.md
    mcp-config.example.json
  packages/
    linear-cache-mcp/
      README.md
      package.json
      package-lock.json
      .env.example
      .gitignore
      src/
        server.mjs
        config.mjs
        cache-store.mjs
        ledger.mjs
        linear-client.mjs
        normalizers.mjs
        issue-service.mjs
        project-service.mjs
        tools.mjs
      test/server.test.mjs
    pi-linear-cache-extension/
      README.md
      package.json
      src/index.ts
  skills/linear-ops/SKILL.md
  Docs/AgentWork/Handoffs/2026-05-06_linear-cache-mcp-extraction_handoff.md
```

## Validation performed
From `/Users/raph/Repos/linear-cache-mcp`:

```bash
npm test
npm run smoke
```

Results:
- Tests: 9 passed / 0 failed.
- Smoke: passed.

Security/generic cleanup check performed:

```bash
rg -n "Dawn|Ramonda|Raphael|Herdlicka|Firelight|DOR-|Lessa|Thali|5hic|lin_api_[A-Za-z0-9]{10,}" . --glob '!node_modules/**' --glob '!package-lock.json'
```

Result: no matches after cleanup.

## Important security notes
- The real Linear API key was **not copied** into this repo.
- `.env`, `.env.*`, `.agent/`, and `node_modules/` are ignored.
- Only `.env.example` is tracked.
- If the earlier chat transcript/log may be shared, rotate the Linear key that was pasted in chat.

## How to continue development in the extracted repo

### First commands

```bash
cd /Users/raph/Repos/linear-cache-mcp
git status
npm test
npm run smoke
```

### Create GitHub remote when ready

```bash
cd /Users/raph/Repos/linear-cache-mcp
git remote add origin git@github.com:<your-user-or-org>/linear-cache-mcp.git
git push -u origin main
```

### Suggested next tasks
1. Add optional live integration tests gated by `LINEAR_API_KEY`.
2. Add a dry-run `npm publish --dry-run` check.
3. Decide npm package name/scope (`linear-cache-mcp` vs scoped package).
4. Improve README with screenshots/examples after MCP host setup is verified.
5. Consider adding a small CLI command for `status`/`budget` outside MCP.
6. Package the Pi extension more cleanly or document copy/symlink install flow.
7. Decide whether to migrate cache storage from JSON to SQLite after real use.

## Open questions / blockers

### Q1: Where should the public remote live?
- Context: Publishing/reuse needs a canonical GitHub remote.
- Options:
  - [A] Personal GitHub account.
  - [B] Firelight/org GitHub account.
  - [C] Keep local-only until API stabilizes.
- Recommended: [A] for fastest OSS iteration, unless this should be company-owned.
- Decision needed by: before first push.

### Q2: Should the npm package be scoped?
- Context: Scoped packages avoid naming conflicts and communicate ownership.
- Options:
  - [A] `linear-cache-mcp`
  - [B] `@<user>/linear-cache-mcp`
  - [C] `@firelight/linear-cache-mcp`
- Recommended: [B] or [C] if publishing publicly; [A] only if available and intended as generic community package.
- Decision needed by: before npm publish.

### Q3: How should the Dawn repo consume the extracted package long term?
- Context: The Unity repo currently has a local copy under `Docs/AgentWork/Tools/linear-cache-mcp`.
- Options:
  - [A] Keep the local copy for now; manually sync improvements from extracted repo.
  - [B] Replace local copy with a git submodule.
  - [C] Install/use the package from npm or GitHub once published.
- Recommended: [A] until the extracted repo is pushed and stable; then [C].
- Decision needed by: after first public/private remote is created.
