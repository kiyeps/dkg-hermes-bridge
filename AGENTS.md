# AGENTS.md

This project is part of the DKG V10 Call for Integrations (Round 1: Working + Shared Memory).

## What this agent does

The Hermes DKG Memory Bridge gives the Hermes crypto agent a DKG V10 memory layer. It records on-chain actions (swap, bridge, mint, deploy) as provenance-tagged Knowledge Assets in DKG Working/Shared Memory, forming an immutable audit trail. It also enables decision recall via SPARQL queries.

## Integration points

- **Hermes crypto agent**: `~/.openclaw/workspace/skills/hermes/`
- **DKG node**: `http://127.0.0.1:9200` (v10.0.19, testnet Base Sepolia)
- **Auth token**: `~/.dkg/auth.token` (line 2, after `#` comment line)
- **Context graph**: `openclaw-curator`

## Constraints

- **Round 1 scope**: WM + SWM only. NO vm/publish. NO endorsement/voting.
- **Quads format**: `{subject, predicate, object}` — NO per-quad graph field
- **Subjects**: Must not be `urn:dkg:file:*` or `urn:dkg:extraction:*`
- **SPARQL literals**: Must be double-quoted
- **Secret redaction**: All secrets redacted before leaving the process
- **Zero or minimal deps**: Built-in fetch, node:test for tests

## Distinct from

- **OpenClaw Memory Curator** (PR #26): OpenClaw-specific memory-file curator daemon
- **DKG Memory MCP Server** (PR #27): transport-agnostic MCP tooling layer

This is Hermes-agent-specific: designed as a post-execution recorder invoked by an action dispatcher, so executed actions gain an auditable, recallable trail (governance-aware: no signing, no publishing).

## Security model

- **No auto-sign**: Hermes's Spend Governor boundaries are respected
- **No auto-publish**: SWM promotion is explicit via `promote` subcommand
- **User-funds-only**: Never auto-signs transactions
- **Confirm before signing**: User confirmation required for all signing operations

## Testing

```bash
npm test
```

All tests use `node:test` (zero deps).

## Smoke test

```bash
# Against live DKG node at http://127.0.0.1:9200
node src/cli.js status
node src/cli.js audit '{"actor":"hermes","chain":"base","actionType":"swap","params":{"from":"ETH","to":"USDC"},"outcome":"success"}'
```
