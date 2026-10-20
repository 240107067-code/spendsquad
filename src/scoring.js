// Challenge scoring (plan.md "Scoring", brainstorm answers 5 and 10). Pure — no database.
import { addDays } from './week.js';

// a/b < c/d without floating point: a*d < c*b (budgets are positive integers).
const compare = (x, y) => x.spent * y.budget - y.spent * x.budget;

export function weekStatus(weekStart, today) {
  if (today < weekStart) return 'upcoming';
  if (today > addDays(weekStart, 6)) return 'finished';
  return 'current';
}

// participants: [{ userId, name, budget, weeks: [{ weekStart, total }] }]
export function score(challenge, participants, today) {
  const weekStarts = Array.from({ length: challenge.weeks }, (_, i) => addDays(challenge.start_week, i * 7));
  const wins = Object.fromEntries(participants.map((p) => [p.userId, 0]));

  const weeks = weekStarts.map((weekStart, i) => {
    const status = weekStatus(weekStart, today);
    const results = participants
      .map((p) => {
        const spent = p.weeks[i]?.total ?? 0;
        return { userId: p.userId, name: p.name, spent, budget: p.budget, percent: Math.round((spent / p.budget) * 1000) / 10 };
      })
      .sort((a, b) => compare(a, b) || a.name.localeCompare(b.name));
    // Lowest share of the own budget wins; everyone tied with the best shares the win.
    const winners = status === 'finished' && results.length
      ? results.filter((r) => compare(r, results[0]) === 0).map((r) => r.userId)
      : [];
    for (const id of winners) wins[id] += 1;
    return { weekStart, status, results, winners };
  });

  const decided = weeks.every((w) => w.status === 'finished');
  const best = Math.max(0, ...Object.values(wins));
  const winners = decided && best > 0 ? participants.filter((p) => wins[p.userId] === best).map((p) => p.userId) : [];
  return { weeks, overall: { decided, winners, wins } };
}
