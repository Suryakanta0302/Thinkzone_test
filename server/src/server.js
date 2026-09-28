import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import DemoUser from './models/DemoUser.js';
import Questionnaire from './models/Questionnaire.js';
import School from './models/School.js';
import Visit from './models/Visit.js';

const port = Number(process.env.PORT ?? 4000);

try {
  await connectDatabase();
  await Promise.all([DemoUser.init(), Questionnaire.init(), School.init(), Visit.init()]);
  const server = app.listen(port, () => console.log(`API listening on port ${port}`));

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
      server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
    });
  }
} catch (error) {
  console.error('Failed to start API:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
}