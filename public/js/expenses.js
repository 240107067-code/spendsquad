import { h } from './dom.js';

export function expensesView() {
  return h('section', { class: 'stack' },
    h('h1', {}, 'This week'),
    h('div', { class: 'card empty' }, 'No expenses yet.'));
}
