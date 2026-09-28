import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDatabase } from '../src/config/database.js';
import DemoUser from '../src/models/DemoUser.js';
import Questionnaire from '../src/models/Questionnaire.js';
import School from '../src/models/School.js';
import Visit from '../src/models/Visit.js';

const demoUsers = [
  { userId: 'U1001', userName: 'Asha Patra', role: 'Cluster coordinator' },
  { userId: 'U1002', userName: 'Ramesh Nayak', role: 'Cluster coordinator' },
  { userId: 'U1003', userName: 'Sunita Das', role: 'Block officer' },
];

async function seed() {
  const questionnairePath = process.argv[2]
    ? fileURLToPath(new URL(process.argv[2], `file://${process.cwd()}/`))
    : fileURLToPath(new URL('../../questionnaires.json', import.meta.url));
  const questionnaires = JSON.parse(await readFile(questionnairePath, 'utf8'));
  if (!Array.isArray(questionnaires)) throw new Error('Questionnaire file must contain a JSON array');

  await connectDatabase();
  await Promise.all([Questionnaire.init(), DemoUser.init(), School.init(), Visit.init()]);

  const questionnaireResult = questionnaires.length
    ? await Questionnaire.bulkWrite(questionnaires.map((questionnaire) => ({
      updateOne: {
        filter: { year: questionnaire.year, month: questionnaire.month },
        update: { $set: questionnaire },
        upsert: true,
      },
    })))
    : { upsertedCount: 0, modifiedCount: 0 };
  const userResult = await DemoUser.bulkWrite(demoUsers.map((user) => ({
    updateOne: {
      filter: { userId: user.userId },
      update: { $set: user },
      upsert: true,
    },
  })));

  console.log(`Questionnaires: ${questionnaireResult.upsertedCount} inserted, ${questionnaireResult.modifiedCount} updated.`);
  console.log(`Demo users: ${userResult.upsertedCount} inserted, ${userResult.modifiedCount} updated.`);
}

try {
  await seed();
} catch (error) {
  console.error(`Seed failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}