import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import apiRouter from './routes/api.js';
import { errorHandler, notFound } from './middleware/error-handler.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') ?? true }));
app.use(express.json({ limit: '1mb' }));
app.get('/health', (_request, response) => response.json({ status: 'ok' }));
app.use('/api', apiRouter);
app.use(notFound);
app.use(errorHandler);

export default app;