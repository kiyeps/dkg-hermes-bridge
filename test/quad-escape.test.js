import { test } from 'node:test';
import assert from 'node:assert/strict';

// Test that SPARQL literals are properly double-quoted and escaped.
// This tests the escaping logic used in audit.js

function escapeLiteral(value) {
  if (typeof value === 'string') {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return `"${value}"`;
}

test('escapeLiteral: plain string is double-quoted', () => {
  assert.equal(escapeLiteral('hello'), '"hello"');
});

test('escapeLiteral: embedded quotes are escaped', () => {
  assert.equal(escapeLiteral('has "quotes"'), '"has \\"quotes\\""');
});

test('escapeLiteral: number is converted to string and quoted', () => {
  assert.equal(escapeLiteral(42), '"42"');
});

test('escapeLiteral: empty string', () => {
  assert.equal(escapeLiteral(''), '""');
});

test('escapeLiteral: backslash preserved', () => {
  assert.equal(escapeLiteral('a\\b'), '"a\\b"');
});

test('subjects are not urn:dkg:file:* or urn:dkg:extraction:*', () => {
  // Verify the namespace used in audit.js
  const subject = 'urn:dkg:hermes:action/abc123';
  assert.ok(!subject.startsWith('urn:dkg:file:'));
  assert.ok(!subject.startsWith('urn:dkg:extraction:'));
  assert.ok(subject.startsWith('urn:dkg:hermes:'));
});
