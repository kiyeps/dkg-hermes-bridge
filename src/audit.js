// Action audit trail: build provenance quads for Hermes actions.

import { createHash } from 'node:crypto';
import { redactQuads } from './redaction.js';

const HERMES_NS = 'urn:dkg:hermes:';
// DKG node resolves bare predicates to its store base URL.
// We use full IRIs so SPARQL queries match what's stored.
const PRED_NS = 'http://127.0.0.1:7878/';

// Deterministic canonical serialization for structured params.
// Recursively sorts object keys and encodes scalars unambiguously so that
// distinct param structures always produce distinct hashes.
function canonicalize(value) {
  if (value === null || typeof value !== 'object') {
    // Tag scalars by type to avoid cross-type collisions ("1" vs 1 vs true).
    if (typeof value === 'string') return `s:${JSON.stringify(value)}`;
    if (typeof value === 'number') return `n:${JSON.stringify(value)}`;
    if (typeof value === 'boolean') return `b:${value}`;
    return `z:${String(value)}`;
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  const parts = keys.map(k => `${JSON.stringify(k)}:${canonicalize(value[k])}`);
  return '{' + parts.join(',') + '}';
}

function paramsHash(params) {
  return createHash('sha256').update(canonicalize(params ?? {})).digest('hex').slice(0, 16);
}

function escapeLiteral(value) {
  // SPARQL literals must be double-quoted; escape backslash first, then quote.
  if (typeof value === 'string') {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return `"${value}"`;
}

export function buildActionRecord(action) {
  // action: { actor, chain, actionType, params, outcome, timestamp }
  const { actor, chain, actionType, params = {}, outcome, timestamp = Date.now() } = action;
  const ph = paramsHash(params);
  const subject = `${HERMES_NS}action/${ph}`;

  const quads = [
    { subject, predicate: `${PRED_NS}actor`, object: escapeLiteral(actor) },
    { subject, predicate: `${PRED_NS}chain`, object: escapeLiteral(chain) },
    { subject, predicate: `${PRED_NS}actionType`, object: escapeLiteral(actionType) },
    { subject, predicate: `${PRED_NS}paramsHash`, object: escapeLiteral(ph) },
    { subject, predicate: `${PRED_NS}outcome`, object: escapeLiteral(outcome) },
    { subject, predicate: `${PRED_NS}timestamp`, object: escapeLiteral(String(timestamp)) },
  ];

  // Redact secrets before returning
  return redactQuads(quads);
}

export async function writeAuditTrail(client, action) {
  const kaName = client.freshKAName('hermes-audit');
  await client.createKnowledgeAsset(kaName);

  const { quads, redactedCount } = buildActionRecord(action);
  await client.writeQuads(kaName, quads);

  return { kaName, quads, redactedCount };
}
