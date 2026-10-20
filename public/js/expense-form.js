import { h, formHandler } from './dom.js';
import { todayIso } from './format.js';

// Form for creating (and later editing) an expense.
// submit(data) does the API call; the form shows its error inline.
export function expenseForm(categories, { initial = {}, submitLabel = 'Add expense', submit, onCancel } = {}) {
  const picker = h('select', { class: 'input', name: 'categoryId', required: true, 'aria-label': 'Category' });
  const fillPicker = (selected) => {
    picker.replaceChildren(...categories.map((c) => h('option', { value: c.id, selected: String(c.id) === String(selected) }, c.name)));
  };
  fillPicker(initial.categoryId ?? categories[0]?.id);

  const date = h('input', { class: 'input', name: 'date', type: 'date', max: todayIso(), value: initial.date || todayIso(), required: true });
  const form = h('form', { class: 'stack', novalidate: true },
    h('div', { class: 'row' },
      h('label', { class: 'field grow' }, h('span', {}, 'Amount, ₸'),
        h('input', { class: 'input', name: 'amount', type: 'number', inputmode: 'numeric', min: 1, step: 1, placeholder: '1500', value: initial.amount ?? '', required: true })),
      h('label', { class: 'field grow' }, h('span', {}, 'Category'), picker)),
    h('label', { class: 'field' }, h('span', {}, 'Note (optional)'),
      h('input', { class: 'input', name: 'note', maxlength: 200, placeholder: 'e.g. lunch with Dana', value: initial.note ?? '' })),
    h('label', { class: 'field' }, h('span', {}, 'Date'), date),
    h('p', { class: 'error', role: 'alert' }),
    h('div', { class: 'row' },
      h('button', { class: 'btn btn-primary grow', type: 'submit' }, submitLabel),
      onCancel && h('button', { class: 'btn', type: 'button', onclick: onCancel }, 'Cancel')));

  formHandler(form, async (data) => {
    await submit({ ...data, amount: Number(data.amount), categoryId: Number(data.categoryId) });
    if (!initial.id) {
      const keep = picker.value;
      form.reset();
      date.value = todayIso();
      picker.value = keep;
    }
  });

  form.addCategory = (category) => fillPicker(category.id);
  return form;
}
