import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { newId, newReference } from '../src/domain/ids.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REFERENCE_RE = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/;

describe('ids', () => {
  it('newId returns a UUID string', () => {
    const id = newId();
    assert.equal(typeof id, 'string');
    assert.match(id, UUID_RE);
  });

  it('newId returns unique values', () => {
    const a = newId();
    const b = newId();
    assert.notEqual(a, b);
  });

  it('newReference returns a readable XXXX-XXXX code without ambiguous characters', () => {
    const reference = newReference();
    assert.match(reference, REFERENCE_RE);
    assert.doesNotMatch(reference, /[IO01]/);
  });

  it('newReference returns unique values across many calls', () => {
    const seen = new Set();
    for (let i = 0; i < 200; i += 1) {
      const reference = newReference();
      assert.equal(seen.has(reference), false);
      seen.add(reference);
    }
  });
});
