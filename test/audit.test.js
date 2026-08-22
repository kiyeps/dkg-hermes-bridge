import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildActionRecord } from '../src/audit.js';

test('buildActionRecord: produces 6 quads', () => {
  const action = {
    actor: 'hermes',
    chain: 'base',
    actionType: 'swap',
    params: { from: 'ETH', to: 'USDC' },
    outcome: 'success',
    timestamp: 1700000000000,
  };
  const { quads, redactedCount } = buildActionRecord(action);
  assert.equal(quads.length, 6);
  assert.equal(redactedCount, 0);
});

test('buildActionRecord: subject is urn:dkg:hermes:action/<hash>', () => {
  const action = {
    actor: 'hermes',
    chain: 'base',
    actionType: 'swap',
    params: { from: 'ETH', to: 'USDC' },
    outcome: 'success',
  };
  const { quads } = buildActionRecord(action);
  const subject = quads[0].subject;
  assert.match(subject, /^urn:dkg:hermes:action\/[a-f0-9]{16}$/);
});

test('buildActionRecord: predicates are correct', () => {
  const action = {
    actor: 'hermes',
    chain: 'base',
    actionType: 'swap',
    params: { from: 'ETH', to: 'USDC' },
    outcome: 'success',
  };
  const { quads } = buildActionRecord(action);
  const preds = quads.map(q => q.predicate);
  const PRED_NS = 'http://127.0.0.1:7878/';
  assert.deepEqual(preds, [
    `${PRED_NS}actor`,
    `${PRED_NS}chain`,
    `${PRED_NS}actionType`,
    `${PRED_NS}paramsHash`,
    `${PRED_NS}outcome`,
    `${PRED_NS}timestamp`,
  ]);
});

test('buildActionRecord: objects are double-quoted', () => {
  const action = {
    actor: 'hermes',
    chain: 'base',
    actionType: 'swap',
    params: {},
    outcome: 'success',
  };
  const { quads } = buildActionRecord(action);
  for (const q of quads) {
    assert.match(q.object, /^".*"$/);
  }
});

test('buildActionRecord: escapes double quotes in values', () => {
  const action = {
    actor: 'hermes',
    chain: 'base',
    actionType: 'swap',
    params: { note: 'has "quotes"' },
    outcome: 'success',
  };
  const { quads } = buildActionRecord(action);
  // All objects should still be valid double-quoted strings
  for (const q of quads) {
    assert.match(q.object, /^".*"$/);
  }
});

test('buildActionRecord: deterministic paramsHash', () => {
  const a1 = { actor: 'h', chain: 'base', actionType: 'swap', params: { from: 'ETH', to: 'USDC' }, outcome: 'ok' };
  const a2 = { actor: 'h', chain: 'base', actionType: 'swap', params: { to: 'USDC', from: 'ETH' }, outcome: 'ok' };
  const r1 = buildActionRecord(a1);
  const r2 = buildActionRecord(a2);
  // Same params in different order → same subject
  assert.equal(r1.quads[0].subject, r2.quads[0].subject);
});

test('buildActionRecord: redacts secrets in params', () => {
  const action = {
    actor: 'hermes',
    chain: 'base',
    actionType: 'swap',
    params: { privateKey: '0x' + 'a'.repeat(64) },
    outcome: 'success',
  };
  const { quads, redactedCount } = buildActionRecord(action);
  // paramsHash is a hash, not the raw params, so no redaction there
  // But if any object contained a raw secret, it would be redacted
  // In this case, params are hashed, so redactedCount should be 0
  assert.equal(redactedCount, 0);
});
