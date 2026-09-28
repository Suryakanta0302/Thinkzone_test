export function validateAnswers(questionnaire, answers) {
  const questions = new Map(questionnaire.questions.map((question) => [question.questionId, question]));
  const received = new Map();

  for (const answer of answers) {
    if (received.has(answer.questionId)) {
      return `Question ${answer.questionId} was answered more than once`;
    }
    const question = questions.get(answer.questionId);
    if (!question) {
      return `Question ${answer.questionId} does not belong to the questionnaire for this visit month`;
    }
    received.set(answer.questionId, answer.value);

    const value = answer.value;
    let valid = false;
    switch (question.type) {
      case 'yesNo':
        valid = typeof value === 'boolean';
        break;
      case 'number':
        valid = Number.isInteger(value) && value >= question.min && value <= question.max;
        break;
      case 'singleChoice':
        valid = typeof value === 'string' && question.options.includes(value);
        break;
      case 'text':
        valid = typeof value === 'string' && value.length <= question.maxLength;
        break;
      default:
        return `Question ${question.questionId} has an unsupported type`;
    }
    if (!valid) return `Answer for question ${question.questionId} is invalid`;
  }

  for (const question of questionnaire.questions) {
    if (!question.optional && !received.has(question.questionId)) {
      return `Required question ${question.questionId} is missing`;
    }
  }
  return null;
}
