import { h, formHandler } from './dom.js';
import { api } from './api.js';

// Chips for every category + a small form to add your own.
// onAdded(category) lets other parts of the page (the expense form) refresh their picker.
export function categoryManager(categories, onAdded) {
  const chips = h('div', { class: 'row' },
    categories.map((c) => h('span', { class: c.isDefault ? 'badge' : 'badge badge-success' }, c.name)));
  const form = h('form', { class: 'row', novalidate: true },
    h('input', { class: 'input grow', name: 'name', placeholder: 'New category, e.g. Coffee', maxlength: 30, 'aria-label': 'New category name' }),
    h('button', { class: 'btn', type: 'submit' }, 'Add'),
    h('p', { class: 'error', role: 'alert', style: 'flex-basis:100%' }));
  formHandler(form, async ({ name }) => {
    const { category } = await api.post('/api/categories', { name });
    categories.push(category);
    chips.append(h('span', { class: 'badge badge-success' }, category.name));
    form.reset();
    onAdded?.(category);
  });
  return h('details', { class: 'card' },
    h('summary', { class: 'muted small' }, 'Categories'),
    h('div', { class: 'stack', style: 'margin-top:12px' }, chips, form));
}
