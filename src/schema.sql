-- SpendSquad schema. Applied on every start; every statement is idempotent.

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- user_id IS NULL means a default category shared by everyone
CREATE TABLE IF NOT EXISTS categories (
  id      INTEGER PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name    TEXT NOT NULL COLLATE NOCASE
);
CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name ON categories (ifnull(user_id, 0), name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS expenses (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  amount      INTEGER NOT NULL CHECK (amount > 0),
  note        TEXT NOT NULL DEFAULT '',
  date        TEXT NOT NULL,
  edited      INTEGER NOT NULL DEFAULT 0 CHECK (edited IN (0, 1)),
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS expenses_user_date ON expenses (user_id, date);

CREATE TABLE IF NOT EXISTS challenges (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  creator_id   INTEGER NOT NULL REFERENCES users(id),
  start_week   TEXT NOT NULL,
  weeks        INTEGER NOT NULL CHECK (weeks BETWEEN 1 AND 4),
  invite_token TEXT NOT NULL UNIQUE,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS participants (
  challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  budget       INTEGER NOT NULL CHECK (budget > 0),
  joined_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (challenge_id, user_id)
);
