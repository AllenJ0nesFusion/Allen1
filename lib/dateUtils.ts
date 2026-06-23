export const HOURS_PER_DAY = 8;

/** Advance a date by N working days (skipping Sat/Sun). */
export function addWorkingDays(start: Date, days: number): Date {
  const d = new Date(start);
  let remaining = days;
  while (remaining > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) remaining--;
  }
  return d;
}

/** Count working days between two dates, exclusive of the start (Mon–Fri only). */
export function workingDaysBetween(start: Date, end: Date): number {
  const d = new Date(start);
  let count = 0;
  while (d < end) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) count++;
  }
  return count;
}

/**
 * Compute finish date from a start date + effort hours.
 * Duration = ceil(effort / HOURS_PER_DAY) working days, inclusive of start.
 * Returns null if inputs are missing/invalid.
 */
export function calcFinish(startDate: string | null | undefined, effortHrs: number): string | null {
  if (!startDate || !effortHrs || effortHrs <= 0) return null;
  const workDays = Math.ceil(effortHrs / HOURS_PER_DAY);
  const start = new Date(startDate);
  // 1 working day = finishes on start day; >1 = advance (workDays - 1) more days
  const finish = workDays <= 1 ? start : addWorkingDays(start, workDays - 1);
  return finish.toISOString().split('T')[0];
}
