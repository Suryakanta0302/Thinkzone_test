import DemoUser from '../models/DemoUser.js';
import Questionnaire from '../models/Questionnaire.js';
import School from '../models/School.js';
import Visit from '../models/Visit.js';
import { getIndiaYearMonth } from '../utils/india-time.js';
import { validateAnswers } from './visit-validation.js';

function clientError(message, code = 'VALIDATION_ERROR', status = 422) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

async function existingVisit(clientId) {
  return Visit.findOne({ clientId }).lean();
}

export async function createVisit(request, response) {
  const payload = request.body;
  const duplicate = await existingVisit(payload.clientId);
  if (duplicate) return response.status(200).json(duplicate);

  const now = Date.now();
  if (payload.visitedAt.getTime() > now + 5 * 60_000) {
    throw clientError('visitedAt cannot be more than 5 minutes in the future');
  }

  const [user, school] = await Promise.all([
    DemoUser.findOne({ userId: payload.userId }).lean(),
    School.findOne({ udiseCode: payload.udiseCode }).lean(),
  ]);
  if (!user) throw clientError('userId is not a demo user', 'USER_NOT_FOUND', 422);
  if (!school) throw clientError('udiseCode does not exist in schools', 'SCHOOL_NOT_FOUND', 422);

  const { year, month } = getIndiaYearMonth(payload.visitedAt);
  const questionnaire = await Questionnaire.findOne({ year, month }).lean();
  if (!questionnaire) {
    throw clientError(`No questionnaire exists for the visit month ${year}-${String(month).padStart(2, '0')}`, 'QUESTIONNAIRE_NOT_FOUND');
  }
  const answerError = validateAnswers(questionnaire, payload.answers);
  if (answerError) throw clientError(answerError, 'ANSWER_VALIDATION_ERROR');

  try {
    const visit = await Visit.create({
      ...payload,
      year,
      month,
      districtCode: school.districtCode,
      blockCode: school.blockCode,
      clusterCode: school.clusterCode,
    });
    return response.status(201).json(visit.toObject());
  } catch (error) {
    if (error?.code === 11000) {
      const stored = await existingVisit(payload.clientId);
      if (stored) return response.status(200).json(stored);
    }
    throw error;
  }
}

export async function listVisits(request, response) {
  const { userId, month, year, page, limit } = request.query;
  const filter = { userId };
  if (month !== undefined) filter.month = month;
  if (year !== undefined) filter.year = year;
  const [visits, total] = await Promise.all([
    Visit.find(filter)
      .sort({ visitedAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Visit.countDocuments(filter),
  ]);
  const schools = await School.find({ udiseCode: { $in: visits.map((visit) => visit.udiseCode) } })
    .select('udiseCode schoolName')
    .lean();
  const schoolNames = new Map(schools.map((school) => [school.udiseCode, school.schoolName]));
  response.json({
    items: visits.map((visit) => ({ ...visit, schoolName: schoolNames.get(visit.udiseCode) ?? null })),
    page,
    limit,
    total,
  });
}
