import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redact, redactQuads } from '../src/redaction.js';

test('redact: empty string', () => {
  const r = redact('');
  assert.equal(r.text, '');
  assert.equal(r.count, 0);
});

test('redact: no secrets', () => {
  const r = redact('hello world');
  assert.equal(r.text, 'hello world');
  assert.equal(r.count, 0);
});

test('redact: hex private key', () => {
  const input = 'key=0x' + 'a'.repeat(64);
  const r = redact(input);
  assert.match(r.text, /\[REDACTED:hex-private-key\]/);
  assert.ok(r.count >= 1);
});

test('redact: API token prefix', () => {
  const r = redact('my key sk-abcdefgh12345678 here');
  assert.match(r.text, /\[REDACTED:api-token\]/);
});

test('redact: GitHub PAT', () => {
  const r = redact('ghp_' + 'a'.repeat(20));
  assert.match(r.text, /\[REDACTED:api-token\]/);
});

test('redact: secret line flag', () => {
  const r = redact('private_key=abc123secret');
  assert.match(r.text, /\[REDACTED:secret-line\]/);
});

test('redact: Solana high-entropy key', () => {
  // Mixed case + digits, 32+ chars
  const solanaKey = 'AbCdEfGhJkLmNpQrStUvWxYz123456789';
  const r = redact(solanaKey);
  assert.match(r.text, /\[REDACTED:solana-key\]/);
});

test('redactQuads: redacts object field', () => {
  const quads = [
    { subject: 'urn:test:s1', predicate: 'key', object: '0x' + 'b'.repeat(64) },
    { subject: 'urn:test:s2', predicate: 'name', object: 'safe-value' },
  ];
  const r = redactQuads(quads);
  assert.equal(r.quads.length, 2);
  assert.match(r.quads[0].object, /\[REDACTED:hex-private-key\]/);
  assert.equal(r.quads[1].object, 'safe-value');
  assert.equal(r.redactedCount, 1);
});
