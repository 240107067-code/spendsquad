# Testing guidelines

- Runner: `node:test` + `node:assert/strict`. Files: `test/*.test.js`
- Every test builds its own app with `createApp(openDb(':memory:'))` and starts
  it on a random port (`listen(0)`); helpers live in `test/helpers.js`
- Test through HTTP (the same API the frontend uses), not by calling route functions
- One behaviour per test, named as a sentence: `test('login with a wrong password returns 401')`
- Every acceptance criterion of an issue has at least one test, including the
  error cases (400 / 401 / 403 / 404)
- Pure logic (week math, scoring) also gets direct unit tests
