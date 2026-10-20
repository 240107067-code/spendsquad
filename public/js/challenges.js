import { h, formHandler } from './dom.js';
import { shortDate, todayIso } from './format.js';

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

export function challengeView() {
  return h('section', { class: 'stack' }, h('h1', {}, 'Challenge'));
}

export function inviteView() {
  return h('section', { class: 'stack' }, h('h1', {}, 'Invite'));
}
