# Security

## Secrets

Never commit:

- `LINEAR_API_KEY`
- `.env`
- Linear cache snapshots
- request ledgers
- private issue descriptions/comments unless intentionally exported

Use one of:

- environment variables
- local `.env`
- MCP host secret/env config
- a password manager/secret manager

## Cache data

The cache can contain private Linear metadata. Keep `.agent/linear-cache/` local unless you explicitly sanitize it.

## Published examples

Examples should use placeholder issue IDs, placeholder team IDs, and generic user/project names.
