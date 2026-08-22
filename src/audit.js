// Action audit trail: build provenance quads for Hermes actions.

import { createHash } from 'node:crypto';
import { redactQuads } from './redaction.js';

const HERMES_NS = 'urn:dkg:hermes:';
// DKG node resolves bare predicates to its store base URL.
// We use full IRIs so SPARQL queries match what's stored.
const PRED_NS = 'http://127.0.0.1:7878/';

function paramsHash(params) {
  const sorted = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
  return createHash('sha256').update(sorted).digest('hex').slice(0, 16);
}

function escapeLiteral(value) {
  // SPARQL literals must be double-quoted
  if (typeof value === 'string') {
    return `"${value.replace(/"/g, '\\"')}"`;
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
