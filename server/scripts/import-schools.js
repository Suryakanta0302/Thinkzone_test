import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import School from '../src/models/School.js';

const fields = [
  'districtCode', 'districtName', 'blockCode', 'blockName', 'clusterCode',
  'clusterName', 'udiseCode', 'schoolName', 'schoolType', 'management',
  'category', 'classFrom', 'classTo', 'address',
];

function cleanRecord(source) {
  return Object.fromEntries(fields.map((field) => {
    const value = source[field];
    if (value === undefined || value === null) return [field, null];
    if (typeof value !== 'string') return [field, String(value).trim() || null];
    return [field, value.trim() || null];
  }));
}

async function importSchools() {
  const inputPath = path.resolve(process.argv[2] ?? 'data/schools.json');
  const records = JSON.parse(await readFile(inputPath, 'utf8'));
  if (!Array.isArray(records)) throw new Error('Schools file must contain a JSON array');

  await connectDatabase();
  await School.init();

  const seenCodes = new Set();
  const operations = [];
  const skippedReasons = new Map();
  const skip = (reason) => skippedReasons.set(reason, (skippedReasons.get(reason) ?? 0) + 1);

  for (const source of records) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      skip('record is not a JSON object');
      continue;
    }
    const school = cleanRecord(source);
    if (!school.udiseCode) {
      skip('missing udiseCode');
      continue;
    }
    if (!school.schoolName) {
      skip(`missing schoolName for ${school.udiseCode}`);
      continue;
    }
    if (seenCodes.has(school.udiseCode)) {
      skip(`duplicate udiseCode in input: ${school.udiseCode}`);
      continue;
    }
    seenCodes.add(school.udiseCode);
    operations.push({
      updateOne: {
        filter: { udiseCode: school.udiseCode },
        update: { $set: school },
        upsert: true,
      },
    });
  }

  let inserted = 0;
  let updated = 0;
  for (let offset = 0; offset < operations.length; offset += 1000) {
    const result = await School.bulkWrite(operations.slice(offset, offset + 1000), { ordered: false });
    inserted += result.upsertedCount;
    updated += result.matchedCount;
  }

  const skipped = [...skippedReasons.values()].reduce((total, count) => total + count, 0);
  console.log(`Schools: ${inserted} inserted, ${updated} updated, ${skipped} skipped.`);
  for (const [reason, count] of skippedReasons) console.log(`Skipped ${count}: ${reason}`);
}

try {
  await importSchools();
} catch (error) {
  console.error(`School import failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}