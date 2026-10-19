# Decisions

Numbered, so issues can reference them ("decisions.md item 2").

1. **Tech stack: Node.js 22 with zero npm dependencies.**
   Options considered: (A) Node built-ins + vanilla JS + SQLite, (B) React/Vite +
   Express, (C) Django. Chosen: A. Everything the app needs is built into Node 22:
   `node:http` (server), `node:sqlite` (database), `node:crypto` (password hashing),
   `node:test` (tests). No install step, nothing to keep up to date.
2. **Frontend: vanilla HTML, CSS and JavaScript (ES modules)** served as static
   files from `public/`. No build step, no framework.
3. **API: JSON over HTTP** under `/api/...`. The frontend talks to the server
   only through this API.
4. **Auth: email + password**, hashed with `crypto.scrypt` and a per-user salt.
   Sessions are random tokens stored in the database, sent as an `HttpOnly`,
   `SameSite=Lax` cookie.
5. **Money is stored as whole tenge (integer).** Currency is ₸ only (plan.md, out of scope).
6. **A week is Monday 00:00 – Sunday 23:59**, identified by the date of its Monday
   (`YYYY-MM-DD`). Dates are stored as `YYYY-MM-DD` strings.
7. **Expenses belong to users, not to challenges.** A challenge only reads its
   participants' expenses for the challenge weeks; nothing is copied.
