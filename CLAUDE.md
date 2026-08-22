# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hermes DKG Memory Bridge — gives the Hermes crypto agent a DKG V10 memory layer. Records on-chain actions (swap, bridge, mint, deploy) as provenance-tagged Knowledge Assets in DKG Working/Shared Memory. Enables decision recall via SPARQL queries.

Third submission to the DKG v10 Call for Integrations (Round 1: Working + Shared Memory).

## Commands

```bash
# Run all tests
npm test

# Run CLI
node src/cli.js status
node src/cli.js audit '<action-json>'
node src/cli.js recall '<sparql-query>'
node src/cli.js promote <ka-name>
```

## Architecture

- **src/dkg-client.js** — Minimal DKG HTTP client (built-in fetch, zero deps). Auth token from `~/.dkg/auth.token` (line 2, strip `#` comments).
- **src/redaction.js** — Secret redaction gate. Ported from openclaw-memory-curator.
- **src/audit.js** — Action audit trail: `buildActionRecord(action)` converts Hermes actions to provenance quads. `writeAuditTrail(client, action)` persists to DKG WM.
- **src/recall.js** — Decision recall: `buildRecallQuery(filters)` builds SPARQL queries. `recallActions(client, filters, view)` queries DKG WM/SWM.
- **src/cli.js** — CLI entry point with subcommands: status, audit, recall, promote, daemon.

## Key Constraints

- **Quads format**: `{subject, predicate, object}` — NO per-quad graph field
- **Subjects**: Must not be `urn:dkg:file:*` or `urn:dkg:extraction:*`
- **SPARQL literals**: Must be double-quoted (`"value"`)
- **Round 1 scope**: WM + SWM only. NO vm/publish. NO endorsement/voting.
- **Secret redaction**: All secrets redacted before leaving the process
- **Zero or minimal deps**: Built-in fetch, node:test for tests

## DKG Node Facts (verified 2026-08-22)

- **URL**: `http://127.0.0.1:9200` (v10.0.13, testnet Base Sepolia)
- **Auth token**: Line 2 of `~/.dkg/auth.token` (line 1 is a `#` comment)
- **Context graph**: `openclaw-curator`
- **WM SPARQL view**: Requires `agentAddress`
- **SWM/VM views**: Do not require `agentAddress`
- **Reserved subject IRIs**: `urn:dkg:file:*` and `urn:dkg:extraction:*` are REJECTED
- **KA name reuse**: Reusing a KA name with different data → "partition differs" seal error; use timestamp suffix

## Security Model

- **No auto-sign**: Hermes's Spend Governor boundaries are respected
- **No auto-publish**: SWM promotion is explicit via `promote` subcommand
- **User-funds-only**: Never auto-signs transactions
- **Confirm before signing**: User confirmation required for all signing operations

## Distinct From

- **OpenClaw Memory Curator** (PR #26): OpenClaw-specific memory-file curator daemon
- **DKG Memory MCP Server** (PR #27): transport-agnostic MCP tooling layer

This is Hermes-agent-specific: plugs into Hermes's action dispatch so crypto operations are memory-backed by default.

## Testing

All tests use `node:test` (zero deps). Run with `npm test`.

Test files:
- `test/redaction.test.js` — Secret redaction
- `test/audit.test.js` — Action record building
- `test/quad-escape.test.js` — SPARQL literal escaping
- `test/recall.test.js` — Recall query building

## Integration Registry

Registry entry: `integrations/dkg-hermes-bridge.json`

Validate with:
```bash
cd /home/chovy/.openclaw/workspace/scripts/dkg-integration/dkg-integrations
node scripts/validate.mjs /home/chovy/.openclaw/workspace/scripts/dkg-hermes-bridge/integrations/dkg-hermes-bridge.json
```
