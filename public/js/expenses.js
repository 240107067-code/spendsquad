import { h } from './dom.js';
import { categoryManager } from './categories.js';

export async function expensesView(ctx) {
  const { categories } = await ctx.api.get('/api/categories');
  return h('section', { class: 'stack' },
    h('h1', {}, 'This week'),
    h('div', { class: 'card empty' }, 'No expenses yet.'),
    categoryManager(categories));
}
