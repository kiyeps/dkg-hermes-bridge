# Design Brief - dkg-hermes-bridge

DKG V10 Call for Integrations, Round 1 submission (`cfi-dkgv10-r1`). Human-readable
companion to `integrations/dkg-hermes-bridge.json`.

## Problem

Agents built on Hermes execute consequential actions - especially on-chain crypto
operations (transfers, swaps, governance calls). Today those actions leave no
durable, tamper-evident record anywhere: logs are local, mutable, and unauditable
after the fact. This bridge writes every executed action into DKG Working Memory as
a Knowledge Asset carrying canonical parameters, a params hash, and the actor, so
the trail survives the process that produced it and can be recalled later,
including by other agents and future runs.

Target users: Hermes-based crypto agents (the operator's own agent fleet) and any
CLI workflow that wants an auditable action ledger.

## Layers touched

- Working Memory (WM): primary. One KA per recorded action (plus optional detail
  quads), written draft-open into the context graph.
- Shared Working Memory (SWM): explicit promotion only. `hermes-dkg promote <ka>`
  performs the DKG SHARE operation, sealing the assertion (publish-ready).
- Verifiable Memory (VM): NOT used in Round 1. No vm/publish code path.

## DKG V10 interfaces and primitives used

- Context Graph: `openclaw-curator` (configurable; the operator's agent context
  graph).
- Knowledge Asset: one per action record; created and written via
  `POST /api/knowledge-assets` and `POST /api/knowledge-assets/{name}/wm/write`.
- Assertion: sealed on SHARE; the bridge reads the node-issued identifiers from
  the node responses rather than constructing any locally.
- SubGraph: not used; no subgraph admin operations.
- Recall: `POST /api/query` (SPARQL) over the WM view, filtered by the action
  predicate namespace.
- Operations used: create KA, wm/write, swm/share, shared query. No publish, no
  endorse/verify/update.

## How this advances LLM-Wiki and autoresearch

Action memory is exactly the category an LLM-Wiki wants to cite and an autoresearch
loop wants to mine: "which swaps did we execute on Base last week, with what
slippage?" becomes a SPARQL query whose hits are KAs with canonical params, not
scraped prose. Because each record is a first-class KA, wiki pages can link the
action's URI as provenance, and autoresearch agents can treat the ledger as
ground truth when evaluating their own past decisions. The bridge is deliberately
narrow: an action ledger plus recall, not a general chat-memory system.

## How this differs from the official Hermes adapter

`@origintrail-official/dkg-adapter-hermes` is a general Hermes memory provider: it
persists conversation turns and exposes the full DKG tool surface inside chat. This
submission is complementary and narrower - a tamper-evident audit trail for
executed actions with canonical parameter hashing and a recall query aimed at
decision review. It does not manage chat memory and does not replace the official
adapter; both can be installed side by side.

## Terminology (v10 vocabulary)

- "Audit" = record an executed action as a WM KA (no share).
- "Promote" = the DKG SHARE operation
  (`POST /api/knowledge-assets/{name}/swm/share`; seals by default). The CLI verb
  is "promote" because the bridge promotes an action record; it always maps to
  SHARE, never to PUBLISH.
- PUBLISH (vm/publish) is not implemented in this round.

## Promotion path (current behavior)

1. `hermes-dkg audit '<json>'` writes the action KA in WM (draft).
2. The operator explicitly runs `hermes-dkg promote <ka>` to SHARE it to SWM
   (sealed, publish-ready).
3. There is no automatic promotion and no daemon: promotion is a manual,
   human-gated action. VM promotion (vm/publish) is out of Round 1 scope and is
   not implemented.

## Provenance, identifiers, and oracle input

- Each record stores: actionType, actor, timestamp, canonical parameters, and a
  paramsHash computed over the canonical form (secrets redacted before hashing).
- Records live under a stable predicate namespace so recall can filter precisely;
  the KA name and node response identifiers are surfaced to the caller.
- Context oracles: a sealed action record is a candidate oracle input (owner-held,
  publish-ready). The bridge itself does not call oracles or VM operations; it is
  the writer of the evidence an oracle would consume.

## Security posture

- Credentials: DKG auth token from `DKG_AUTH_TOKEN` or `~/.dkg/auth.token`
  (comment lines stripped; token on line 2). Never logged; only sent to the
  configured DKG node.
- Egress: the local DKG node only (`http://127.0.0.1:9200` by default). No other
  network I/O. https is enforced for any non-loopback DKG API URL.
- Redaction: every payload is passed through the secret redaction gate before it
  is written; only redacted text is hashed or stored.
- Write authority: wm/write + swm/share only. No VM writes.
- Surface: a CLI, not a network service - it opens no listening socket.

## Round 1 checklist

- Demo: docs/demo-transcript.txt (live node, Base Sepolia testnet; shows audit ->
  recall -> promote).
- Tests: node --test test/*.test.js.

## Maintainer

@kiyeps (https://github.com/kiyeps) - 6 months post-merge support minimum.
