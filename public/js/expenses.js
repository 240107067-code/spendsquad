import { h } from './dom.js';
import { categoryManager } from './categories.js';
import { expenseForm } from './expense-form.js';
import { money, dayLabel, shortDate } from './format.js';

export function expenseRow(e, actions = null) {
  return h('li', {},
    h('div', { class: 'grow' },
      h('div', {}, h('strong', {}, e.categoryName), e.note ? h('span', { class: 'muted' }, ' · ', e.note) : null,
        e.edited ? h('span', {}, ' ', h('span', { class: 'badge badge-warn' }, 'edited')) : null),
      h('div', { class: 'muted small' }, dayLabel(e.date))),
    h('span', { class: 'amount' }, money(e.amount)),
    actions);
}

function weekHeader(week) {
  const link = (target, label, aria) => (target
    ? h('a', { class: 'btn btn-sm', href: `#/expenses?week=${target}`, 'aria-label': aria }, label)
    : h('button', { class: 'btn btn-sm', disabled: true, 'aria-label': aria }, label));
  return h('div', { class: 'row spread' },
    link(week.prevWeek, '‹', 'Previous week'),
    h('div', { class: 'center' },
      h('h1', { style: 'margin:0' }, week.isCurrent ? 'This week' : 'Week'),
      h('div', { class: 'muted small' }, `${shortDate(week.weekStart)} – ${shortDate(week.weekEnd)}`)),
    link(week.nextWeek, '›', 'Next week'));
}

function summaryCard(week) {
  const max = Math.max(1, ...week.byCategory.map((c) => c.total));
  return h('div', { class: 'card stack' },
    h('div', { class: 'row spread' }, h('span', { class: 'muted' }, 'Spent'), h('span', { class: 'big amount' }, money(week.total))),
    week.byCategory.length
      ? h('div', { class: 'stack' }, week.byCategory.map((c) => h('div', {},
        h('div', { class: 'row spread small' }, h('span', {}, c.name), h('span', { class: 'amount' }, money(c.total))),
        h('div', { class: 'bar' }, h('i', { style: `width:${(c.total / max) * 100}%` })))))
      : null);
}

export async function expensesView(ctx) {
  const [{ categories }, week] = await Promise.all([
    ctx.api.get('/api/categories'),
    ctx.api.get('/api/expenses' + (ctx.route.query.week ? `?week=${encodeURIComponent(ctx.route.query.week)}` : '')),
  ]);

  // Each row has Edit (swaps the row for a pre-filled form) and Delete (asks first).
  const editableRow = (e) => {
    const row = expenseRow(e, h('div', { class: 'row' },
      h('button', { class: 'btn btn-sm', 'aria-label': `Edit ${e.categoryName} ${e.amount}`, onclick: () => {
        const edit = expenseForm(categories, {
          initial: e,
          submitLabel: 'Save',
          submit: async (data) => { await ctx.api.put(`/api/expenses/${e.id}`, data); await ctx.rerender(); },
          onCancel: () => editRow.replaceWith(row),
        });
        const editRow = h('li', { class: 'stack', style: 'display:block' }, edit);
        row.replaceWith(editRow);
      } }, 'Edit'),
      h('button', { class: 'btn btn-sm btn-danger', 'aria-label': `Delete ${e.categoryName} ${e.amount}`, onclick: async () => {
        if (!confirm(`Delete ${e.categoryName} — ${e.amount} ₸?`)) return;
        await ctx.api.del(`/api/expenses/${e.id}`);
        await ctx.rerender();
      } }, 'Delete')));
    return row;
  };

  const list = week.expenses.length
    ? h('ul', { class: 'list' }, week.expenses.map(editableRow))
    : h('div', { class: 'empty' }, week.isCurrent ? 'Nothing spent this week yet — nice! Add your first expense above.' : 'No expenses this week.');

  const form = expenseForm(categories, {
    submit: async (data) => {
      await ctx.api.post('/api/expenses', data);
      await ctx.rerender();
    },
  });

  return h('section', { class: 'stack' },
    weekHeader(week),
    summaryCard(week),
    h('details', { class: 'card', open: week.isCurrent }, h('summary', {}, h('strong', {}, 'Add an expense')), h('div', { style: 'margin-top:12px' }, form)),
    h('div', { class: 'card' }, h('h3', {}, 'Expenses'), list),
    categoryManager(categories, (c) => form.addCategory(c)));
}
