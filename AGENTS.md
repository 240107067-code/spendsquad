# AGENTS.md

SpendSquad — weekly expense tracking and budget challenges for students.
The product specification is in `_docs/plan.md`.

## Commands

- `npm start` - start the app on http://localhost:3000 (data in `data/spendsquad.db`)
- `npm test` - run the whole test suite (`node --test`)
- `node --test test/auth.test.js` - run one test file
- No install step: the project has zero npm dependencies (Node.js 22+)

## Rules

- Do not add any npm dependency. Use Node built-ins only (`_docs/decisions.md` item 1)
- Server code lives in `src/`, frontend in `public/`, tests in `test/`
- Tests use an in-memory database (`openDb(':memory:')`), never `data/`
- Never commit `data/`, secrets or `.env` files
- Stay inside the files and constraints the issue names
- Commit after every meaningful step; reference the issue, e.g. `Add login (#3)`

## Documents

- `_docs/plan.md` - product specification, the source of truth for scope
- `_docs/decisions.md` - numbered technical decisions; issues reference them
- `_docs/process.md` - how work is organized. Read it at the start of every session
- `_docs/task-template.md` - the format every groomed issue follows
- `_docs/team/pm.md`, `_docs/team/software-engineer.md`, `_docs/team/qa-engineer.md` - roles
- Before writing tests, read `_docs/testing-guidelines.md`
- For anything touching the UI, read `_docs/design-system.md`
