import { fail } from './http.js';

const pad = (n) => String(n).padStart(2, '0');

// Today's date as YYYY-MM-DD in the server's local time zone.
export function today(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// True only for a real calendar date written as YYYY-MM-DD (2026-02-30 is false).
export function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// A whole number in [min, max]; numeric strings like "1500" are accepted from forms.
export function wholeNumber(value, min, max) {
  const n = typeof value === 'string' && /^\s*\d+\s*$/.test(value) ? Number(value) : value;
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
}

export const MAX_AMOUNT = 10_000_000;

// Validates an expense body for create/update. Returns clean values or throws 400.
export function expenseInput(db, userId, body, todayStr = today()) {
  const amount = wholeNumber(body.amount, 1, MAX_AMOUNT);
  if (amount === null) fail(400, 'Amount must be a whole number from 1 to 10 000 000 ₸');

  const categoryId = wholeNumber(body.categoryId, 1, Number.MAX_SAFE_INTEGER);
  const category = categoryId && db.prepare(
    'SELECT id FROM categories WHERE id = ? AND (user_id IS NULL OR user_id = ?)',
  ).get(categoryId, userId);
  if (!category) fail(400, 'Please choose one of your categories');

  const note = body.note == null ? '' : String(body.note).trim();
  if (note.length > 200) fail(400, 'Note must be at most 200 characters');

  const date = body.date == null || body.date === '' ? todayStr : body.date;
  if (!isIsoDate(date)) fail(400, 'Date must be a real date (YYYY-MM-DD)');
  if (date > todayStr) fail(400, 'Date cannot be in the future');

  return { amount, categoryId, note, date };
}
