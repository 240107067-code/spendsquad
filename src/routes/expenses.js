import { fail, readJson, requireUser } from '../http.js';
import { expenseInput, isIsoDate, today } from '../validate.js';
import { weekStart, weekEnd, addDays } from '../week.js';

export const EXPENSE_SELECT =
  'SELECT e.id, e.amount, e.category_id, c.name AS category_name, e.note, e.date, e.edited, e.user_id FROM expenses e JOIN categories c ON c.id = e.category_id';

export const expenseToApi = (e) => ({
  id: e.id,
  amount: e.amount,
  categoryId: e.category_id,
  categoryName: e.category_name,
  note: e.note,
  date: e.date,
  edited: e.edited === 1,
});

export const getExpense = (db, id) => db.prepare(`${EXPENSE_SELECT} WHERE e.id = ?`).get(id);

// One user's expenses between two dates (inclusive), newest first.
export function expensesBetween(db, userId, from, to) {
  return db.prepare(`${EXPENSE_SELECT} WHERE e.user_id = ? AND e.date BETWEEN ? AND ? ORDER BY e.date DESC, e.id DESC`)
    .all(userId, from, to).map(expenseToApi);
}

export function weekSummary(expenses) {
  const byCat = new Map();
  for (const e of expenses) {
    const c = byCat.get(e.categoryId) || { categoryId: e.categoryId, name: e.categoryName, total: 0 };
    c.total += e.amount;
    byCat.set(e.categoryId, c);
  }
  return {
    total: expenses.reduce((sum, e) => sum + e.amount, 0),
    byCategory: [...byCat.values()].sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)),
  };
}

// The user's own expense, or 404 — never reveals that another user's id exists.
function ownExpense(db, userId, id) {
  const row = /^\d+$/.test(id) ? getExpense(db, Number(id)) : null;
  if (!row || row.user_id !== userId) fail(404, 'Expense not found');
  return row;
}

export default function expenseRoutes(db) {
  return [
    ['GET', '/api/expenses', async ({ req, query }) => {
      const user = requireUser(req, db);
      const asked = query.get('week') || today();
      if (!isIsoDate(asked)) fail(400, 'week must be a date (YYYY-MM-DD)');
      const start = weekStart(asked);
      const current = weekStart(today());
      const expenses = expensesBetween(db, user.id, start, weekEnd(start));
      return [200, {
        weekStart: start,
        weekEnd: weekEnd(start),
        prevWeek: addDays(start, -7),
        nextWeek: start < current ? addDays(start, 7) : null,
        isCurrent: start === current,
        expenses,
        ...weekSummary(expenses),
      }];
    }],

    ['POST', '/api/expenses', async ({ req }) => {
      const user = requireUser(req, db);
      const e = expenseInput(db, user.id, await readJson(req));
      const { lastInsertRowid } = db.prepare(
        'INSERT INTO expenses (user_id, category_id, amount, note, date) VALUES (?, ?, ?, ?, ?)',
      ).run(user.id, e.categoryId, e.amount, e.note, e.date);
      return [201, { expense: expenseToApi(getExpense(db, lastInsertRowid)) }];
    }],

    // Editing is allowed at any time (plan.md); every edit is marked so friends can see it.
    ['PUT', '/api/expenses/:id', async ({ req, params }) => {
      const user = requireUser(req, db);
      const row = ownExpense(db, user.id, params.id);
      const e = expenseInput(db, user.id, await readJson(req));
      db.prepare(
        "UPDATE expenses SET category_id = ?, amount = ?, note = ?, date = ?, edited = 1, updated_at = strftime('%Y-%m-%d %H:%M:%f', 'now') WHERE id = ?",
      ).run(e.categoryId, e.amount, e.note, e.date, row.id);
      return [200, { expense: expenseToApi(getExpense(db, row.id)) }];
    }],

    ['DELETE', '/api/expenses/:id', async ({ req, params }) => {
      const user = requireUser(req, db);
      const row = ownExpense(db, user.id, params.id);
      db.prepare('DELETE FROM expenses WHERE id = ?').run(row.id);
      return [204, null];
    }],
  ];
}
