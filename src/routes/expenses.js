import { readJson, requireUser } from '../http.js';
import { expenseInput } from '../validate.js';

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

export default function expenseRoutes(db) {
  return [
    ['POST', '/api/expenses', async ({ req }) => {
      const user = requireUser(req, db);
      const e = expenseInput(db, user.id, await readJson(req));
      const { lastInsertRowid } = db.prepare(
        'INSERT INTO expenses (user_id, category_id, amount, note, date) VALUES (?, ?, ?, ?, ?)',
      ).run(user.id, e.categoryId, e.amount, e.note, e.date);
      return [201, { expense: expenseToApi(getExpense(db, lastInsertRowid)) }];
    }],
  ];
}
