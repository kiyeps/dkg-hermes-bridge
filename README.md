# Hermes DKG Memory Bridge

Hermes crypto agent action audit trail + decision recall on DKG V10 memory.

Every on-chain action Hermes executes (swap, bridge, mint, deploy) can be recorded as a provenance-tagged Knowledge Asset in DKG Working/Shared Memory, forming an immutable, queryable audit trail. Hermes can also recall prior decisions from DKG memory to inform future trades.

## Install

```bash
npm install -g dkg-hermes-bridge
```

## Prerequisites

- Node.js v24+
- DKG node running at `http://127.0.0.1:9200`
- Auth token at `~/.dkg/auth.token` (line 2, after `#` comment line)

## Usage

```bash
# Check DKG node status
hermes-dkg status

# Record a Hermes action to DKG Working Memory
hermes-dkg audit '{"actor":"hermes","chain":"base","actionType":"swap","params":{"from":"ETH","to":"USDC"},"outcome":"success"}'

# Query prior actions via SPARQL
hermes-dkg recall 'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 5'

# Promote a KA to Shared Working Memory
hermes-dkg promote hermes-audit-1700000000000
```

## Architecture

- **src/dkg-client.js** — Minimal DKG HTTP client (built-in fetch, zero deps)
- **src/redaction.js** — Secret redaction gate (hex keys, API tokens, Solana keys)
- **src/audit.js** — Action audit trail: provenance quads for Hermes actions
- **src/recall.js** — Decision recall: SPARQL queries for prior actions
- **src/cli.js** — CLI entry point with subcommands

## Security

- **No auto-sign**: Hermes's Spend Governor boundaries are respected
- **No auto-publish**: SWM promotion is explicit via `promote` subcommand
- **Secret redaction**: All secrets redacted before leaving the process
- **No vm/publish**: Round 1 scope is WM + SWM only

## Testing

```bash
npm test
```

## License

Apache-2.0

## Verified example (2026-08-22)

Real audit + recall against the local DKG node (v10.0.19, testnet):

```bash
hermes-dkg audit '{"actor":"hermes","chain":"solana","actionType":"deposit","params":{"from":"0xA953...","to":"J5ZcFx...","amount":"2","asset":"USDC"},"outcome":"success"}'
# Audit recorded: hermes-audit-1787396870466 (6 quads, 0 redacted)

hermes-dkg recall 'SELECT ?s ?p ?o WHERE { ?s <http://127.0.0.1:7878/actionType> "deposit" . ?s ?p ?o }'
# -> 6 quads: actionType=deposit, actor=hermes, chain=solana, outcome=success, ...
```

The action was recorded as provenance-tagged quads in Working Memory and
recalled via SPARQL. Note: recall previously failed out-of-the-box because the
view was sent as `wm` (DKG API rejects it); fixed by mapping shorthand views to
canonical names (`working-memory` / `shared-working-memory` / `verifiable-memory`).
