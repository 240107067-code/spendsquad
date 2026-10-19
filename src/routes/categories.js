import { fail, readJson, requireUser } from '../http.js';

const toApi = (c) => ({ id: c.id, name: c.name, isDefault: c.user_id === null });

// Default categories first (in seed order), then the user's own, A–Z.
export function categoriesFor(db, userId) {
  return db.prepare(
    'SELECT id, user_id, name FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY user_id IS NOT NULL, CASE WHEN user_id IS NULL THEN id END, name COLLATE NOCASE',
  ).all(userId).map(toApi);
}

export default function categoryRoutes(db) {
  return [
    ['GET', '/api/categories', async ({ req }) => {
      const user = requireUser(req, db);
      return [200, { categories: categoriesFor(db, user.id) }];
    }],

    ['POST', '/api/categories', async ({ req }) => {
      const user = requireUser(req, db);
      const body = await readJson(req);
      const name = String(body.name ?? '').trim().replace(/\s+/g, ' ');
      if (!name || name.length > 30) fail(400, 'Category name must be 1–30 characters');
      const taken = db.prepare(
        'SELECT 1 FROM categories WHERE (user_id IS NULL OR user_id = ?) AND name = ? COLLATE NOCASE',
      ).get(user.id, name);
      if (taken) fail(409, 'You already have a category with this name');
      const { lastInsertRowid } = db.prepare('INSERT INTO categories (user_id, name) VALUES (?, ?)').run(user.id, name);
      return [201, { category: { id: Number(lastInsertRowid), name, isDefault: false } }];
    }],
  ];
}
