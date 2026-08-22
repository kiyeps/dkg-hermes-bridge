# Hermes DKG Memory Bridge

Integration that gives the **Hermes crypto agent** (multi-chain Web3 agent
toolkit, see `~/.openclaw/workspace/skills/hermes/`) a DKG V10 memory layer.
Every on-chain action Hermes executes — swap, bridge, mint, deploy, wallet
management — can be recorded as a provenance-tagged Knowledge Asset in DKG
Working/Shared Memory, forming an immutable, queryable audit trail. Hermes can
also recall prior decisions from DKG memory to inform future trades.

Third submission to the DKG v10 Call for Integrations (Round 1: Working +
Shared Memory). Substantively distinct from:
- OpenClaw Memory Curator (PR #26): OpenClaw-specific memory-file curator daemon
- DKG Memory MCP Server (PR #27): transport-agnostic MCP tooling layer

This one is Hermes-agent-specific: it plugs into Hermes's action dispatch so
crypto operations are memory-backed by default, with a governance-aware write
path (respects Hermes's Spend Governor boundaries — never auto-signs, never
auto-publishes).

## What it does

1. **Action audit trail** — wrap Hermes tool dispatch (swap/bridge/mint/deploy)
   so each executed action writes a provenance KA to DKG WM: actor, chain,
   action type, params hash, outcome, timestamp.
2. **Decision recall** — Hermes can SPARQL-query prior actions from DKG WM/SWM
   before proposing a trade (e.g. "what did I pay in gas on Base last week?").
3. **Maturity promotion** — actions referenced repeatedly (e.g. same token
   traded N times) auto-promote to SWM (sealed). VM publish stays explicit-gated.

## Runtime facts (verified 2026-08-22)

- DKG daemon: http://127.0.0.1:9200 (v10.0.13, testnet Base Sepolia)
- Auth token: line 2 of ~/.dkg/auth.token (line 1 is a comment — strip `#` lines)
- Default context graph: openclaw-curator
- Quads format: JSON array of {subject, predicate, object} — NO per-quad graph field
- WM SPARQL view requires agentAddress; SWM/VM views do not
- Reserved subject IRIs urn:dkg:file:* and urn:dkg:extraction:* are REJECTED
- Full swm/share (entities:"all") seals by default => publish-ready
- SPARQL object literals must be double-quoted ("value")
- Reusing a KA name with different data → "partition differs" seal error; use timestamp suffix

## Hermes integration points

- `~/.openclaw/workspace/skills/hermes/` — the Hermes crypto agent skill
- `~/.openclaw/workspace/hermes-bridge/adapter.py` — existing SUPERAGENT↔Hermes bridge
- This project adds a `dkg` subcommand + a memory-recording hook, NOT a rewrite
  of Hermes. Keep Hermes's security model intact (user-funds-only, confirm
  before signing, Spend Governor).

## Constraints

- All file contents, comments, logs in English.
- Secret redaction before any literal leaves the process (reuse redaction regex
  set from openclaw-memory-curator).
- Round 1 scope: WM + SWM only. NO vm/publish. NO endorsement/voting tools.
- Zero or minimal deps. node:test for tests.