export function toVisitApiPayload(visit) {
  return {
    clientId: visit.clientId,
    captureMode: visit.captureMode,
    userId: visit.userId,
    udiseCode: visit.udiseCode,
    visitedAt: visit.visitedAt,
    answers: visit.answers,
  };
}