import { h } from './dom.js';
import { categoryManager } from './categories.js';
import { expenseForm } from './expense-form.js';
import { money, dayLabel } from './format.js';

function expenseRow(e) {
  return h('li', {},
    h('div', { class: 'grow' },
      h('div', {}, h('strong', {}, e.categoryName), e.note ? h('span', { class: 'muted' }, ' · ', e.note) : null),
      h('div', { class: 'muted small' }, dayLabel(e.date))),
    h('span', { class: 'amount' }, money(e.amount)));
}

export async function expensesView(ctx) {
  const { categories } = await ctx.api.get('/api/categories');
  const added = h('ul', { class: 'list' });
  const addedCard = h('div', { class: 'card', hidden: true }, h('h3', {}, 'Just added'), added);

  const form = expenseForm(categories, {
    submit: async (data) => {
      const { expense } = await ctx.api.post('/api/expenses', data);
      added.prepend(expenseRow(expense));
      addedCard.hidden = false;
    },
  });

  return h('section', { class: 'stack' },
    h('h1', {}, 'This week'),
    h('div', { class: 'card' }, h('h3', {}, 'Add an expense'), form),
    addedCard,
    categoryManager(categories, (c) => form.addCategory(c)));
}
