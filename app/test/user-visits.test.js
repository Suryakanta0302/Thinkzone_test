import assert from 'node:assert/strict';
import test from 'node:test';
import { filterVisitsForUser } from '../src/lib/user-visits.js';

test('shows only visits belonging to the selected demo user', () => {
  const visits = [
    { clientId: 'asha-visit', userId: 'U1001' },
    { clientId: 'ramesh-visit', userId: 'U1002' },
    { clientId: 'sunita-visit', userId: 'U1003' },
  ];

  assert.deepEqual(filterVisitsForUser(visits, 'U1002'), [visits[1]]);
});