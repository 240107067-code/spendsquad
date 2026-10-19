// h('div', { class: 'card', onclick }, 'text', child) — builds elements safely.
// Strings always become text nodes, so user content is never parsed as HTML.
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v == null) continue;
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else if (k in el && typeof v !== 'string') el[k] = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function mount(parent, ...nodes) {
  parent.replaceChildren(...nodes.flat());
}

// Wire a form: disables the submit button while the request runs and shows API errors inline.
export function formHandler(form, onSubmit) {
  const error = form.querySelector('.error');
  const button = form.querySelector('button[type=submit]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (button.disabled) return;
    error.textContent = '';
    button.disabled = true;
    try {
      await onSubmit(Object.fromEntries(new FormData(form)));
    } catch (err) {
      error.textContent = err.message;
    } finally {
      button.disabled = false;
    }
  });
  return form;
}
