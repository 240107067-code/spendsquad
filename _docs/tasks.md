# Backlog

## 1. Empty project with a passing test
Goal: The project runs with `npm start` and `npm test` passes.
Description: Create `package.json` with start/test scripts, a Node `http` server that serves `public/index.html` and `GET /api/health`, and one passing test using `node:test`. No dependencies.

## 2. Database layer
Goal: The app has a SQLite database with a schema for users, sessions, categories, expenses, challenges and participants.
Description: Use `node:sqlite` with a schema file that is applied on start. Tests must run against an in-memory database so they never touch real data.

## 3. Registration, login and logout
Goal: A student can create an account and log in and out.
Description: API endpoints for register, login, logout and "who am I", with scrypt password hashing and cookie sessions. Validation of email and password.

## 4. App shell and auth screens
Goal: A student sees a mobile-first page with register/login forms and, once logged in, the app navigation.
Description: Vanilla JS frontend with a small router (Expenses, Challenges), shared styles in one CSS file, and a design-system document so the UI stays consistent.

## 5. Categories
Goal: A student can pick from default categories and add their own.
Description: Five default categories exist for everyone; a user can add custom categories visible only to them. API and a small UI to add a category.

## 6. Add an expense
Goal: A student can record an expense in a few taps.
Description: API endpoint and form for amount (₸), category, optional note and date (default today), with validation.

## 7. Weekly expenses view
Goal: A student sees what they spent this week and can look at other weeks.
Description: List of the week's expenses, the week total and a breakdown by category, with previous/next week navigation (Monday–Sunday).

## 8. Edit and delete expenses
Goal: A student can fix or remove an expense at any time, and edits are visible.
Description: Edit and delete endpoints and UI. An edited expense gets an "edited" mark that is shown wherever the expense appears.

## 9. Create a challenge with an invite link
Goal: A student can start a 1–4 week budget challenge and get a link to share.
Description: Create a challenge with a name, a start Monday and a number of weeks. The creator joins automatically with their own weekly budget and receives an invite link.

## 10. Join a challenge from the invite link
Goal: A friend opens the link, sets their own weekly budget and is in.
Description: Invite page that shows the challenge and asks for a budget; a logged-out visitor is sent to log in first and comes back. Unlimited participants, no double joining.

## 11. Challenge page with everyone's expenses
Goal: Participants see every expense of every other participant for the challenge weeks.
Description: Challenge page listing participants and their expenses per week (amount, category, note, date, "edited" mark). Only participants can see it.

## 12. Weekly winners and overall winner
Goal: The challenge page shows who is winning this week, past weekly winners and the overall winner.
Description: Score = spent / own budget. Lowest percentage wins the week, ties share the win; the overall winner has the most weekly wins once the last week ends.
