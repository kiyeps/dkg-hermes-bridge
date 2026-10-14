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
- @origintrail-official/dkg-adapter-hermes (first-party): general Hermes
  chat-memory provider; this bridge is the narrower action-audit recorder

This one is Hermes-agent-specific: designed as a post-execution recorder: an
action dispatcher invokes `hermes-dkg audit` after each executed action, so
crypto operations gain an auditable, recallable memory trail. The bridge itself never signs and never
publishes - it writes only what it is given, after redaction.

## What it does

1. **Action audit trail** — each executed action (swap/bridge/mint/deploy) is
   recorded via `hermes-dkg audit` as a provenance KA in DKG WM: actor, chain,
   action type, params hash, outcome, timestamp.
2. **Decision recall** — Hermes can SPARQL-query prior actions from DKG WM/SWM
   before proposing a trade (e.g. "what did I pay in gas on Base last week?").
3. **Promotion (explicit only)** — `hermes-dkg promote <ka>` shares an action
   record to SWM (sealed, publish-ready). There is no automatic promotion and no
   daemon; VM publish is not implemented in this round.

## Runtime facts (live local node, Base Sepolia testnet)

- DKG daemon: http://127.0.0.1:9200 (v10.0.19, testnet Base Sepolia)
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