import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRecallQuery } from '../src/recall.js';

test('buildRecallQuery: no filters', () => {
  const q = buildRecallQuery({});
  assert.match(q, /SELECT/);
  assert.match(q, /<http:\/\/127\.0\.0\.1:7878\/actor>/);
  assert.ok(!q.includes('FILTER'));
});

test('buildRecallQuery: chain filter', () => {
  const q = buildRecallQuery({ chain: 'base' });
  assert.match(q, /FILTER/);
  assert.match(q, /\?chain = "base"/);
  assert.match(q, /<http:\/\/127\.0\.0\.1:7878\/chain>/);
});

test('buildRecallQuery: actionType filter', () => {
  const q = buildRecallQuery({ actionType: 'swap' });
  assert.match(q, /\?actionType = "swap"/);
  assert.match(q, /<http:\/\/127\.0\.0\.1:7878\/actionType>/);
});

test('buildRecallQuery: token filter uses CONTAINS', () => {
  const q = buildRecallQuery({ token: 'USDC' });
  assert.match(q, /CONTAINS\(\?paramsHash, "USDC"\)/);
});

test('buildRecallQuery: multiple filters combined with &&', () => {
  const q = buildRecallQuery({ chain: 'base', actionType: 'swap' });
  assert.match(q, /\?chain = "base" && \?actionType = "swap"/);
});

test('buildRecallQuery: default LIMIT 10', () => {
  const q = buildRecallQuery({});
  assert.match(q, /LIMIT 10/);
});

test('buildRecallQuery: custom limit', () => {
  const q = buildRecallQuery({ limit: 5 });
  assert.match(q, /LIMIT 5/);
});

test('buildRecallQuery: ORDER BY DESC timestamp', () => {
  const q = buildRecallQuery({});
  assert.match(q, /ORDER BY DESC\(\?timestamp\)/);
});
