import { openDB } from 'idb';
import { apiRequest } from './api.js';
import { toVisitApiPayload } from './visit-payload.js';

const databasePromise = openDB('school-visit-log', 2, {
  upgrade(database, oldVersion, _newVersion, transaction) {
    if (oldVersion < 1) {
      database.createObjectStore('schools', { keyPath: 'udiseCode' });
      database.createObjectStore('visits', { keyPath: 'clientId' });
      database.createObjectStore('settings', { keyPath: 'key' });
    }
    if (oldVersion < 2) transaction.objectStore('visits').createIndex('userId', 'userId');
  },
});

export async function cacheSchools(schools) {
  const database = await databasePromise;
  const transaction = database.transaction('schools', 'readwrite');
  await Promise.all([...schools.map((school) => transaction.store.put(school)), transaction.done]);
}

export async function getCachedSchools() {
  return (await databasePromise).getAll('schools');
}

export async function getCachedQuestionnaire() {
  return (await databasePromise).get('settings', 'questionnaire');
}

export async function cacheQuestionnaire(questionnaire) {
  const database = await databasePromise;
  await database.put('settings', { key: 'questionnaire', ...questionnaire });
}

export async function saveQueuedVisit(visit) {
  const database = await databasePromise;
  await database.put('visits', { ...visit, status: 'Pending', failureReason: null });
}

export async function getQueuedVisits(userId) {
  const database = await databasePromise;
  return userId
    ? database.getAllFromIndex('visits', 'userId', userId)
    : database.getAll('visits');
}

async function updateQueuedVisit(clientId, update) {
  const database = await databasePromise;
  const transaction = database.transaction('visits', 'readwrite');
  const visit = await transaction.store.get(clientId);
  if (visit) await transaction.store.put({ ...visit, ...update });
  await transaction.done;
}

let syncInProgress = false;

export async function syncQueuedVisits() {
  if (syncInProgress || !navigator.onLine) return;
  syncInProgress = true;
  try {
    const visits = await getQueuedVisits();
    for (const visit of visits) {
      if (visit.status !== 'Pending') continue;
      try {
        await apiRequest('/visits', { method: 'POST', body: JSON.stringify(toVisitApiPayload(visit)) });
        await updateQueuedVisit(visit.clientId, { status: 'Synced', failureReason: null });
      } catch (error) {
        if (error.status >= 400 && error.status < 500) {
          await updateQueuedVisit(visit.clientId, { status: 'Failed', failureReason: error.message });
        }
      }
    }
  } finally {
    syncInProgress = false;
  }
}