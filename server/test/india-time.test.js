import test from 'node:test';
import assert from 'node:assert/strict';
import { getIndiaYearMonth } from '../src/utils/india-time.js';

test('uses the India month across a UTC month boundary', () => {
  assert.deepEqual(getIndiaYearMonth(new Date('2026-09-30T18:29:59.999Z')), {
    year: 2026,
    month: 9,
  });
  assert.deepEqual(getIndiaYearMonth(new Date('2026-09-30T18:30:00.000Z')), {
    year: 2026,
    month: 10,
  });
});
