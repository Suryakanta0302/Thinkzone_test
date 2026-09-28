import assert from 'node:assert/strict';
import test from 'node:test';
import { toVisitApiPayload } from '../src/lib/visit-payload.js';

test('only sends API fields and preserves offline capture mode', () => {
  const payload = toVisitApiPayload({
    clientId: 'client-1',
    captureMode: 'offline',
    userId: 'U1001',
    udiseCode: 'school-1',
    visitedAt: '2026-09-28T05:32:10.000Z',
    answers: [],
    status: 'Pending',
    failureReason: null,
  });

  assert.deepEqual(payload, {
    clientId: 'client-1',
    captureMode: 'offline',
    userId: 'U1001',
    udiseCode: 'school-1',
    visitedAt: '2026-09-28T05:32:10.000Z',
    answers: [],
  });
});