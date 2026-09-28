export function filterVisitsForUser(visits, userId) {
  return visits.filter((visit) => visit.userId === userId);
}