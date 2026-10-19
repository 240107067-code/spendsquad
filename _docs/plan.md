# SpendSquad — Project Plan

A web app where students track their weekly spending and run budget challenges
with friends. Source: `_docs/chat-brainstorm.md`.

## Problem

Students lose track of small daily expenses and overspend by the end of the week.
Tracking alone is boring; doing it together with friends as a friendly
competition makes it stick.

## Users

- **Student** — tracks their own expenses (the main, everyday use)
- **Challenge participant** — a student who joined a friend's budget challenge

Every user has an account (email + password).

## Core concepts

| Concept      | Meaning |
|--------------|---------|
| Expense      | amount (₸), category, note, date; belongs to one user |
| Category     | fixed defaults + custom categories a user creates for themselves |
| Week         | Monday 00:00 – Sunday 23:59 |
| Challenge    | name, creator, start week (a Monday), length 1–4 weeks, invite link |
| Participant  | a user in a challenge with their own weekly budget (₸) |

## Features (MVP)

### 1. Accounts
- Register with email + password, log in, log out
- Each user only manages their own data

### 2. Expenses
- Add an expense: amount (> 0, whole tenge), category, optional note, date (default today)
- Default categories: Food, Transport, Study, Entertainment, Other
- A user can add their own categories (visible only to them)
- Edit and delete an expense **at any time**
- An edited expense is marked **"edited"**; friends in a shared challenge see the mark
- Weekly view: the current week's expenses, total, and breakdown by category;
  navigate to previous/next weeks

### 3. Challenges
- Create a challenge: name, start week (current or a future Monday), 1–4 weeks
- The creator gets an **invite link**; anyone with an account who opens it can join
- **Unlimited** participants
- Each participant sets **their own** weekly budget (> 0) when joining
- **Full transparency:** every participant sees every expense (amount, category,
  note, date, "edited" mark) of every other participant for the challenge weeks

### 4. Scoring
- Weekly result per participant = spent ÷ own weekly budget × 100 %
- **Weekly winner:** lowest % that week (ties → shared win)
- **Overall winner:** most weeks won at the end of the challenge (ties → shared)
- Challenge page: leaderboard for the current week, list of past weekly winners,
  and the overall winner once the last week has ended

## Out of scope (MVP)

- Bank / Kaspi integration
- Receipt photo upload
- Email or push notifications
- Multiple currencies (tenge ₸ only)

## Assumptions (decided by the assistant during planning — open to change)

- A participant may join until the challenge ends; joining late still counts
  only weeks with their budget set
- A participant with zero expenses in a week has 0 % (they can win that week)
- Leaving a challenge and deleting a challenge are not in the MVP
- Mobile-first responsive UI (students mostly use phones)
