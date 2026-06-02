const YEAR_MONTH_PATTERN = /^\d{4}-\d{2}$/;

export function isValidYearMonth(yearMonth: string): boolean {
  return YEAR_MONTH_PATTERN.test(yearMonth);
}
