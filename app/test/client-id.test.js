import assert from 'node:assert/strict';
import test from 'node:test';
import { createClientId } from '../src/lib/client-id.js';

test('creates a UUID v4 client id', () => {
  assert.match(createClientId(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});