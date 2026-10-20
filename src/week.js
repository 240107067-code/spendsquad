// Week math on YYYY-MM-DD strings. A week is Monday–Sunday (decisions.md item 6).
// All calculations use UTC midnight so time zones and DST never shift a date.

const toDate = (iso) => new Date(iso + 'T00:00:00Z');
const toIso = (d) => d.toISOString().slice(0, 10);

export function addDays(iso, n) {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

// The Monday of the week containing `iso`.
export function weekStart(iso) {
  const day = toDate(iso).getUTCDay(); // 0 = Sunday
  return addDays(iso, day === 0 ? -6 : 1 - day);
}

export const weekEnd = (iso) => addDays(weekStart(iso), 6);

export const isMonday = (iso) => toDate(iso).getUTCDay() === 1;
