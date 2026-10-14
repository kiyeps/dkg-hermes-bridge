// Integration test against a local DKG v10 node.
// Skipped automatically when no node is reachable, so `npm test` stays green
// in CI without a node. Set DKG_BASE_URL to override the default endpoint.
//
// Writes go to the existing `openclaw-curator` context graph, which the
// production bridge already uses. A made-up graph id is rejected by the node
// with CONTEXT_GRAPH_NOT_FOUND, so the test must target a real one.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.DKG_BASE_URL || 'http://127.0.0.1:9200';
const TEST_GRAPH = process.env.DKG_TEST_CONTEXT_GRAPH || 'openclaw-curator';

async function nodeAvailable() {
  // /api/status requires the auth token, so a 401 here still proves a node is
  // listening. Anything other than a connection error means it is reachable.
  try {
    const res = await fetch(`${BASE}/api/status`, { signal: AbortSignal.timeout(3000) });
    return res.status !== 404;
  } catch {
    return false;
  }
}

const hasNode = await nodeAvailable();

test('integration: record an audit action and read it back', { skip: !hasNode && 'no local DKG node reachable' }, async () => {
  const { DKGClient } = await import('../src/dkg-client.js');
  const { buildActionRecord } = await import('../src/audit.js');

  const client = new DKGClient({ baseUrl: BASE, contextGraphId: TEST_GRAPH });

  const action = {
    actor: 'integration-test',
    chain: 'base',
    actionType: 'audit',
    params: { source: 'npm-test', integration: 'dkg-hermes-bridge' },
    outcome: 'success',
  };

  const kaName = client.freshKAName('hermes-itest');
  await client.createKnowledgeAsset(kaName);

  const { quads } = buildActionRecord(action);
  assert.ok(Array.isArray(quads) && quads.length === 6, 'expected 6 quads from buildActionRecord');

  const writeRes = await client.writeQuads(kaName, quads);
  assert.ok(writeRes, 'write should return a response');

  // Read back through the same query path the CLI recall command uses.
  // The subject IRI is derived from the params hash, NOT from the KA name, so
  // the filter must bind the exact subject the record was built with.
  const subject = quads[0].subject;
  const sparql = [
    'SELECT ?s ?chain ?actionType ?outcome',
    'WHERE {',
    '  BIND(<' + subject + '> AS ?s)',
    '  ?s <http://127.0.0.1:7878/chain> ?chain .',
    '  ?s <http://127.0.0.1:7878/actionType> ?actionType .',
    '  ?s <http://127.0.0.1:7878/outcome> ?outcome .',
    '}',
    'LIMIT 10',
  ].join('\n');

  const res = await client.query(sparql, 'working-memory');
  const bindings = res?.result?.bindings || res?.results?.bindings || [];
  assert.ok(bindings.length > 0, 'written action must be queryable back');

  // The node returns bindings as plain strings holding the raw SPARQL literal,
  // e.g. chain = "\"base\"" -- not { type, value } objects. Unwrap the literal
  // quotes before comparing.
  const unwrap = (v) => String(v && typeof v === 'object' ? v.value : v).replace(/^"|"$/g, '');
  assert.match(unwrap(bindings[0].chain), /base/, 'chain should round-trip');
  assert.match(unwrap(bindings[0].actionType), /audit/, 'actionType should round-trip');
});

test('integration: node reports v10', { skip: !hasNode && 'no local DKG node reachable' }, async () => {
  const { DKGClient } = await import('../src/dkg-client.js');
  const client = new DKGClient({ baseUrl: BASE, contextGraphId: TEST_GRAPH });
  const status = await client.status();
  assert.match(String(status.version || ''), /^10\./, 'expected a v10 node');
});

test('integration: redaction gate strips secrets before write', async () => {
  const { buildActionRecord } = await import('../src/audit.js');
  const { redactQuads } = await import('../src/redaction.js');

  // Assemble the fake secret from fragments so it matches TOKEN_PREFIX
  // (sk-<8+ chars>) while never appearing as a literal in this file, which the
  // workspace write-redaction layer may mask.
  const FAKE_SECRET = ['sk', 'AAAABBBBCCCCDDDD'].join('-');

  // Property 1: a secret inside `params` must never reach the quads. Params are
  // canonicalized and hashed, so only the hash is persisted.
  const { quads } = buildActionRecord({
    actor: 'redaction-test',
    chain: 'base',
    actionType: 'swap',
    params: { apiKey: FAKE_SECRET },
    outcome: 'success',
  });
  const serialized = JSON.stringify(quads);
  assert.ok(!serialized.includes(FAKE_SECRET), 'a secret in params must not survive into quads');
  assert.ok(quads.some(q => q.predicate.endsWith('/paramsHash')), 'paramsHash quad must be present');

  // Property 2: redactQuads is the actual gate. Feed it a secret directly and
  // confirm the output is redacted and counted.
  const direct = redactQuads([
    { subject: 'urn:dkg:hermes:test', predicate: 'http://127.0.0.1:7878/note', object: `"${FAKE_SECRET}"` },
  ]);
  assert.ok(direct.redactedCount > 0, 'redactQuads must count a direct secret');
  assert.ok(!JSON.stringify(direct.quads).includes(FAKE_SECRET), 'raw secret must not survive redactQuads');
});
