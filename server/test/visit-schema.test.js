import assert from 'node:assert/strict';
import test from 'node:test';
import { createVisitSchema } from '../src/routes/schemas.js';

const baseVisit = {
  clientId: '6f1c2e0a-2b7d-4c1e-9a55-0b8f3d2e7c11',
  userId: 'U1001',
  udiseCode: '21010100101',
  visitedAt: '2026-09-28T05:32:10.000Z',
  answers: [],
};

test('accepts capture mode and defaults older clients to online', () => {
  const legacy = createVisitSchema.validate(baseVisit);
  const offline = createVisitSchema.validate({ ...baseVisit, captureMode: 'offline' });

  assert.equal(legacy.error, undefined);
  assert.equal(legacy.value.captureMode, 'online');
  assert.equal(offline.error, undefined);
  assert.equal(offline.value.captureMode, 'offline');
});

test('rejects unsupported capture modes', () => {
  const { error } = createVisitSchema.validate({ ...baseVisit, captureMode: 'queued' });
  assert.ok(error);
});