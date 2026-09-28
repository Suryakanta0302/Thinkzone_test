import { Router } from 'express';
import { getBlockSummary } from '../controllers/reports.js';
import { getCurrentQuestionnaire } from '../controllers/questionnaires.js';
import { listSchools } from '../controllers/schools.js';
import { createVisit, listVisits } from '../controllers/visits.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../middleware/async-handler.js';
import {
  createVisitSchema,
  reportQuerySchema,
  schoolQuerySchema,
  visitsQuerySchema,
} from './schemas.js';

const router = Router();

router.get('/schools', validate(schoolQuerySchema), asyncHandler(listSchools));
router.get('/questionnaires/current', asyncHandler(getCurrentQuestionnaire));
router.post('/visits', validate(createVisitSchema, 'body'), asyncHandler(createVisit));
router.get('/visits', validate(visitsQuerySchema), asyncHandler(listVisits));
router.get('/reports/block-summary', validate(reportQuerySchema), asyncHandler(getBlockSummary));

export default router;
