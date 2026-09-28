import Questionnaire from '../models/Questionnaire.js';
import { getIndiaYearMonth } from '../utils/india-time.js';

export async function getCurrentQuestionnaire(_request, response) {
  const { year, month } = getIndiaYearMonth();
  const questionnaire = await Questionnaire.findOne({ year, month }).lean();
  if (!questionnaire) {
    const error = new Error(`No questionnaire is available for ${year}-${String(month).padStart(2, '0')}`);
    error.status = 404;
    error.code = 'QUESTIONNAIRE_NOT_FOUND';
    throw error;
  }
  response.json(questionnaire);
}
