import { h, formHandler } from './dom.js';
import { shortDate, todayIso, money, dayLabel } from './format.js';

const STATUS = { upcoming: ['Starts soon', 'badge'], active: ['Active', 'badge badge-success'], finished: ['Finished', 'badge badge-warn'] };

export const inviteUrl = (token) => `${location.origin}/#/invite/${token}`;

// The next eight Mondays starting with this week's (a challenge cannot start in the past).
export function mondayOptions(fromIso = todayIso(), count = 8) {
  const d = new Date(fromIso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return Array.from({ length: count }, (_, i) => {
    const m = new Date(d);
    m.setUTCDate(d.getUTCDate() + i * 7);
    return m.toISOString().slice(0, 10);
  });
}

export function inviteBox(token) {
  const url = inviteUrl(token);
  const copy = h('button', { class: 'btn btn-sm', type: 'button', onclick: async () => {
    try { await navigator.clipboard.writeText(url); copy.textContent = 'Copied!'; } catch { input.select(); }
  } }, 'Copy');
  const input = h('input', { class: 'input grow', readonly: true, value: url, 'aria-label': 'Invite link', onfocus: (e) => e.target.select() });
  return h('div', { class: 'stack' }, h('div', { class: 'small muted' }, 'Send this link to your friends:'), h('div', { class: 'row' }, input, copy));
}

function challengeItem(c) {
  const [label, cls] = STATUS[c.status];
  return h('li', {},
    h('a', { class: 'grow', href: `#/challenges/${c.id}`, style: 'text-decoration:none;color:inherit' },
      h('div', {}, h('strong', {}, c.name), ' ', h('span', { class: cls }, label)),
      h('div', { class: 'muted small' }, `${shortDate(c.startWeek)} – ${shortDate(c.endDate)} · ${c.weeks} week${c.weeks > 1 ? 's' : ''} · ${c.participantCount} in`)),
    h('span', { class: 'muted' }, '›'));
}

function newChallengeForm(ctx, onCreated) {
  const mondays = mondayOptions();
  const form = h('form', { class: 'stack', novalidate: true },
    h('label', { class: 'field' }, h('span', {}, 'Name'), h('input', { class: 'input', name: 'name', maxlength: 60, placeholder: 'e.g. No-taxi November', required: true })),
    h('div', { class: 'row' },
      h('label', { class: 'field grow' }, h('span', {}, 'Starts on Monday'),
        h('select', { class: 'input', name: 'startWeek' }, mondays.map((m, i) => h('option', { value: m }, i === 0 ? `${shortDate(m)} (this week)` : shortDate(m))))),
      h('label', { class: 'field grow' }, h('span', {}, 'Length'),
        h('select', { class: 'input', name: 'weeks' }, [1, 2, 3, 4].map((n) => h('option', { value: n }, `${n} week${n > 1 ? 's' : ''}`))))),
    h('label', { class: 'field' }, h('span', {}, 'My weekly budget, ₸'),
      h('input', { class: 'input', name: 'budget', type: 'number', inputmode: 'numeric', min: 1, step: 1, placeholder: '20000', required: true })),
    h('p', { class: 'error', role: 'alert' }),
    h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Create challenge'));
  formHandler(form, async (data) => {
    const { challenge } = await ctx.api.post('/api/challenges', { ...data, weeks: Number(data.weeks), budget: Number(data.budget) });
    onCreated(challenge);
  });
  return form;
}

export async function challengesView(ctx) {
  const { challenges } = await ctx.api.get('/api/challenges');
  const created = h('div');
  const list = h('ul', { class: 'list' }, challenges.map(challengeItem));
  const form = newChallengeForm(ctx, (c) => {
    created.replaceChildren(h('div', { class: 'card stack' },
      h('h3', {}, `“${c.name}” is ready 🎉`), inviteBox(c.inviteToken),
      h('a', { class: 'btn btn-block', href: `#/challenges/${c.id}` }, 'Open challenge')));
    list.prepend(challengeItem(c));
    empty.hidden = true;
    form.reset();
  });
  const empty = h('div', { class: 'empty', hidden: challenges.length > 0 }, 'No challenges yet. Start one and invite your friends!');
  return h('section', { class: 'stack' },
    h('h1', {}, 'Challenges'),
    created,
    h('div', { class: 'card' }, h('h3', {}, 'My challenges'), empty, list),
    h('details', { class: 'card', open: challenges.length === 0 }, h('summary', {}, h('strong', {}, 'New challenge')), h('div', { style: 'margin-top:12px' }, form)));
}

// Which week to show first: ?week= if valid, else the current week, else the closest one.
export function pickWeek(weekStarts, asked, today = todayIso()) {
  if (weekStarts.includes(asked)) return asked;
  const current = [...weekStarts].reverse().find((w) => w <= today);
  return current ?? weekStarts[0];
}

function participantCard(p, weekIndex, me) {
  const week = p.weeks[weekIndex];
  return h('div', { class: 'card stack' },
    h('div', { class: 'row spread' },
      h('strong', {}, p.name, p.userId === me ? h('span', { class: 'muted small' }, ' (you)') : null),
      h('span', { class: 'amount' }, money(week.total), h('span', { class: 'muted small' }, ` / ${money(p.budget)}`))),
    week.expenses.length
      ? h('ul', { class: 'list' }, week.expenses.map((e) => h('li', {},
        h('div', { class: 'grow' },
          h('div', {}, h('strong', {}, e.categoryName), e.note ? h('span', { class: 'muted' }, ' · ', e.note) : null,
            e.edited ? h('span', {}, ' ', h('span', { class: 'badge badge-warn' }, 'edited')) : null),
          h('div', { class: 'muted small' }, dayLabel(e.date))),
        h('span', { class: 'amount' }, money(e.amount)))))
      : h('div', { class: 'muted small' }, 'No expenses this week.'));
}

export async function challengeView(ctx) {
  let data;
  try {
    data = await ctx.api.get(`/api/challenges/${ctx.route.params.id}`);
  } catch (err) {
    if (err.status !== 404) throw err;
    return h('section', { class: 'stack' }, h('div', { class: 'card empty' }, 'Challenge not found — or you are not part of it.'));
  }
  const { challenge: c, participants } = data;
  const weekStarts = participants[0].weeks.map((w) => w.weekStart);
  const selected = pickWeek(weekStarts, ctx.route.query.week);
  const index = weekStarts.indexOf(selected);
  const [label, cls] = STATUS[c.status];

  const tabs = h('div', { class: 'row' }, weekStarts.map((w, i) => h('a', {
    class: w === selected ? 'btn btn-sm btn-primary' : 'btn btn-sm',
    href: `#/challenges/${c.id}?week=${w}`,
  }, `Week ${i + 1}`)));

  return h('section', { class: 'stack' },
    h('div', {},
      h('h1', { style: 'margin-bottom:4px' }, c.name),
      h('div', { class: 'row muted small' }, h('span', { class: cls }, label),
        `${shortDate(c.startWeek)} – ${shortDate(c.endDate)} · ${c.participantCount} ${c.participantCount === 1 ? 'person' : 'people'}`)),
    h('details', { class: 'card' }, h('summary', { class: 'small' }, 'Invite friends'), h('div', { style: 'margin-top:12px' }, inviteBox(c.inviteToken))),
    tabs,
    h('div', { class: 'muted small' }, `${shortDate(selected)} – ${shortDate(addDaysIso(selected, 6))}`),
    participants.map((p) => participantCard(p, index, ctx.user.id)));
}

function addDaysIso(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// #/invite/:token — logged-out visitors never get here: main.js sends them to
// #/login?next=#/invite/:token first and brings them back afterwards.
export async function inviteView(ctx) {
  let invite;
  try {
    invite = await ctx.api.get(`/api/invites/${encodeURIComponent(ctx.route.params.token)}`);
  } catch (err) {
    if (err.status !== 404) throw err;
    return h('section', { class: 'stack' }, h('div', { class: 'card empty' }, '🔗 This invite link is not valid. Ask your friend to send it again.'));
  }
  const c = invite.challenge;
  const [label, cls] = STATUS[c.status];
  const info = h('div', { class: 'card stack center' },
    h('div', { class: 'big' }, '🏁'),
    h('h1', {}, c.name),
    h('div', {}, h('span', { class: cls }, label)),
    h('p', { class: 'muted' }, `${shortDate(c.startWeek)} – ${shortDate(c.endDate)} · ${c.weeks} week${c.weeks > 1 ? 's' : ''} · ${c.participantCount} ${c.participantCount === 1 ? 'person' : 'people'} in`));

  if (invite.joined) {
    return h('section', { class: 'stack' }, info,
      h('div', { class: 'card stack center' }, h('strong', {}, "You're in! 💪"), h('a', { class: 'btn btn-primary btn-block', href: `#/challenges/${c.id}` }, 'Open challenge')));
  }
  if (c.status === 'finished') {
    return h('section', { class: 'stack' }, info, h('div', { class: 'card empty' }, 'This challenge has ended — you can no longer join.'));
  }
  const form = h('form', { class: 'stack', novalidate: true },
    h('p', { class: 'muted small' }, 'Lowest % of your own budget wins each week. Your friends will see your expenses during the challenge.'),
    h('label', { class: 'field' }, h('span', {}, 'My weekly budget, ₸'),
      h('input', { class: 'input', name: 'budget', type: 'number', inputmode: 'numeric', min: 1, step: 1, placeholder: '20000', required: true })),
    h('p', { class: 'error', role: 'alert' }),
    h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Join challenge'));
  formHandler(form, async ({ budget }) => {
    const { challengeId } = await ctx.api.post(`/api/invites/${encodeURIComponent(ctx.route.params.token)}/join`, { budget: Number(budget) });
    location.hash = `#/challenges/${challengeId}`;
  });
  return h('section', { class: 'stack' }, info, h('div', { class: 'card' }, form));
}
