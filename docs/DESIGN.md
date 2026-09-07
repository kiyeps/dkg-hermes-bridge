# Design Brief — DKG Hermes Bridge

DKG V10 Round 1 submission (`cfi-dkgv10-r1`). Companion to `integrations/dkg-hermes-bridge.json`.

## Problem

Autonomous agents act continuously (trades, publishes, transfers) but their action
history lives in ephemeral logs. There is no tamper-evident, queryable provenance
layer for agent actions. DKG V10 Working Memory is the right substrate: local-first,
sealable, promotable to Shared Working Memory with Merkle-sealed assertions.

## Design

`hermes-dkg` is a CLI + daemon bridge that records every Hermes agent action as a
set of provenance quads in a DKG V10 Context Graph:

- **Subject**: `urn:dkg:hermes:action/<paramsHash>` — deterministic, content-derived.
- **Quads**: actor, chain, actionType, outcome, timestamp, paramsHash.
- **Canonical hashing**: structured `params` are serialized with a recursive
  canonical form (sorted keys, type-tagged scalars) before SHA-256. Distinct
  actions always produce distinct subjects (collision fix, 2026-09-08).
- **Redaction**: secret-shaped values (API keys, private keys, mnemonics) are
  redacted before any literal leaves the process.
- **Lifecyle**: WM write → (optional) SWM share via `POST /swm/share`, which
  seals the assertion and marks it publish-ready.

## What it demonstrates

- A real agent-memory primitive on WM/SWM (no VM writes in Round 1).
- Deterministic, collision-free action identity — auditable trails.
- Zero dependencies beyond Node.js built-ins.

## Demo

`docs/demo-transcript.txt` — recorded against a live local DKG V10 node
(v10.0.15, Base Sepolia testnet, context graph `openclaw-curator`):
status → audit → SPARQL recall returning the persisted action quads.

## Maintenance

Maintained by @kiyeps. Support window: 6 months post-merge minimum.
