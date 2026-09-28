import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDatabase } from '../src/config/database.js';
import DemoUser from '../src/models/DemoUser.js';
import Questionnaire from '../src/models/Questionnaire.js';
import School from '../src/models/School.js';
import Visit from '../src/models/Visit.js';

const databaseName = new URL(process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/').pathname.slice(1);
if (!databaseName.endsWith('_test')) {
  throw new Error('Set MONGODB_URI to a disposable database whose name ends in _test');
}

let server;
try {
  await connectDatabase();
  await Promise.all([DemoUser.init(), Questionnaire.init(), School.init(), Visit.init()]);
  await Promise.all([
    DemoUser.deleteMany({}),
    Questionnaire.deleteMany({}),
    School.deleteMany({}),
    Visit.deleteMany({}),
  ]);

  await DemoUser.create([
    { userId: 'U1001', userName: 'Asha Patra', role: 'Cluster coordinator' },
    { userId: 'U1002', userName: 'Ramesh Nayak', role: 'Cluster coordinator' },
  ]);
  await Questionnaire.create({
    year: 2026,
    month: 9,
    title: 'September test',
    questions: [{ questionId: 'SEP26-Q01', text: 'Present?', type: 'yesNo' }],
  });
  await School.create({
    districtCode: 'D1', districtName: 'District',
    blockCode: 'B1', blockName: 'Block',
    clusterCode: 'C1', clusterName: 'Cluster',
    udiseCode: 'S1', schoolName: 'Test school',
  });
  await School.create({
    districtCode: 'D1', districtName: 'District',
    blockCode: 'B2', blockName: 'Empty Block',
    clusterCode: 'C2', clusterName: 'Cluster 2',
    udiseCode: 'S2', schoolName: 'Unvisited school',
  });

  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const apiUrl = `http://127.0.0.1:${server.address().port}/api`;
  const schoolListResponse = await fetch(`${apiUrl}/schools?districtCode=D1&limit=1`);
  const schoolList = await schoolListResponse.json();
  assert.deepEqual(Object.keys(schoolList.items[0]).sort(), ['blockName', 'clusterName', 'schoolName', 'udiseCode']);
  assert.equal(schoolList.total, 2);

  const offlineCacheResponse = await fetch(`${apiUrl}/schools?districtCode=D1&limit=1&includeLocationCodes=true`);
  const offlineSchool = (await offlineCacheResponse.json()).items[0];
  assert.equal(offlineSchool.districtCode, 'D1');
  assert.equal(offlineSchool.blockCode, 'B1');

  const payload = {
    clientId: '6f1c2e0a-2b7d-4c1e-9a55-0b8f3d2e7c11',
    captureMode: 'offline',
    userId: 'U1001',
    udiseCode: 'S1',
    visitedAt: new Date().toISOString(),
    answers: [{ questionId: 'SEP26-Q01', value: true }],
  };

  const postVisit = (visit) => fetch(`${apiUrl}/visits`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(visit),
  });
  const firstResponse = await postVisit(payload);
  assert.equal(firstResponse.status, 201);
  assert.equal((await firstResponse.json()).captureMode, 'offline');

  const retryResponse = await postVisit(payload);
  assert.equal(retryResponse.status, 200);
  await postVisit({ ...payload, clientId: 'b3357259-98d4-4bff-a648-074b950d371a' });
  await postVisit({
    ...payload,
    clientId: '4888d1a0-ed18-4028-928f-2dc7c1aa5d61',
    userId: 'U1002',
  });
  assert.equal(await Visit.countDocuments(), 3);
  assert.equal((await Visit.findOne().lean()).captureMode, 'offline');

  const userVisitsResponse = await fetch(`${apiUrl}/visits?userId=U1001&limit=100`);
  const userVisits = await userVisitsResponse.json();
  assert.equal(userVisits.total, 2);
  assert.ok(userVisits.items.every((visit) => visit.userId === 'U1001'));

  const reportResponse = await fetch(`${apiUrl}/reports/block-summary?districtCode=D1&month=9&year=2026`);
  const report = await reportResponse.json();
  assert.equal(reportResponse.status, 200);
  assert.equal(report.blocks.length, 2);
  assert.equal(report.blocks[0].blockCode, 'B1');
  assert.deepEqual({
    totalSchools: report.blocks[0].totalSchools,
    schoolsVisited: report.blocks[0].schoolsVisited,
    uniqueVisitors: report.blocks[0].uniqueVisitors,
    visits: report.blocks[0].visits,
    coveragePercent: report.blocks[0].coveragePercent,
  }, { totalSchools: 1, schoolsVisited: 1, uniqueVisitors: 2, visits: 2, coveragePercent: 100 });
  assert.deepEqual({
    schoolsVisited: report.blocks[1].schoolsVisited,
    uniqueVisitors: report.blocks[1].uniqueVisitors,
    visits: report.blocks[1].visits,
    coveragePercent: report.blocks[1].coveragePercent,
  }, { schoolsVisited: 0, uniqueVisitors: 0, visits: 0, coveragePercent: 0 });
  assert.deepEqual(report.districtTotal, {
    totalSchools: 2,
    schoolsVisited: 1,
    uniqueVisitors: 2,
    visits: 2,
    coveragePercent: 50,
  });
  console.log('API integration passed: field projection, offline metadata, user isolation, idempotency, distinct report pairs, and zero-visit blocks.');
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
}