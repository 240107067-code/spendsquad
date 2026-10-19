import { h, formHandler } from './dom.js';
import { api } from './api.js';

function authCard(title, subtitle, form, footer) {
  return h('div', { class: 'container' },
    h('div', { class: 'card auth-card stack' },
      h('div', { class: 'center' }, h('div', { class: 'big' }, '💸'), h('h1', {}, title), h('p', { class: 'muted' }, subtitle)),
      form,
      h('p', { class: 'center small muted' }, footer)));
}

const keepNext = (ctx, hash) => (ctx.route.query.next ? `${hash}?next=${encodeURIComponent(ctx.route.query.next)}` : hash);

export function loginView(ctx) {
  const form = h('form', { class: 'stack', novalidate: true },
    h('label', { class: 'field' }, h('span', {}, 'Email'), h('input', { class: 'input', name: 'email', type: 'email', autocomplete: 'email', required: true })),
    h('label', { class: 'field' }, h('span', {}, 'Password'), h('input', { class: 'input', name: 'password', type: 'password', autocomplete: 'current-password', required: true })),
    h('p', { class: 'error', role: 'alert' }),
    h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Log in'));
  formHandler(form, async (data) => ctx.signedIn((await api.post('/api/login', data)).user));
  return authCard('Welcome back', 'Track your week. Beat your friends.', form,
    ['No account yet? ', h('a', { href: keepNext(ctx, '#/register') }, 'Create one')]);
}

export function registerView(ctx) {
  const form = h('form', { class: 'stack', novalidate: true },
    h('label', { class: 'field' }, h('span', {}, 'Your name (friends will see it)'), h('input', { class: 'input', name: 'name', autocomplete: 'nickname', maxlength: 40, required: true })),
    h('label', { class: 'field' }, h('span', {}, 'Email'), h('input', { class: 'input', name: 'email', type: 'email', autocomplete: 'email', required: true })),
    h('label', { class: 'field' }, h('span', {}, 'Password (8+ characters)'), h('input', { class: 'input', name: 'password', type: 'password', autocomplete: 'new-password', minlength: 8, required: true })),
    h('p', { class: 'error', role: 'alert' }),
    h('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Create account'));
  formHandler(form, async (data) => ctx.signedIn((await api.post('/api/register', data)).user));
  return authCard('Join SpendSquad', 'Weekly budgets are easier with friends.', form,
    ['Already have an account? ', h('a', { href: keepNext(ctx, '#/login') }, 'Log in')]);
}
