const INDIA_OFFSET_MINUTES = 330;

export function getIndiaYearMonth(date = new Date()) {
  const indiaDate = new Date(date.getTime() + INDIA_OFFSET_MINUTES * 60_000);
  return {
    year: indiaDate.getUTCFullYear(),
    month: indiaDate.getUTCMonth() + 1,
  };
}
