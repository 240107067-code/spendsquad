import { h, mount } from './dom.js';
import { api } from './api.js';
import { parseRoute, PUBLIC_ROUTES, safeNext, loginRedirect } from './router.js';
import { loginView, registerView } from './auth.js';
import { expensesView } from './expenses.js';
import { challengesView, challengeView, inviteView } from './challenges.js';

const VIEWS = {
  login: loginView,
  register: registerView,
  expenses: expensesView,
  challenges: challengesView,
  challenge: challengeView,
  invite: inviteView,
};

const app = document.getElementById('app');
let user; // undefined = not checked yet, null = logged out

function topbar() {
  return h('header', { class: 'topbar' },
    h('div', { class: 'container' },
      h('a', { class: 'brand', href: '#/expenses' }, '💸 SpendSquad'),
      h('span', { class: 'grow' }),
      h('span', { class: 'muted small' }, user.name),
      h('button', { class: 'btn btn-ghost btn-sm', onclick: logout }, 'Log out')));
}

function nav(route) {
  const tab = (name, label) => h('a', { href: `#/${name}`, class: route.name.startsWith(name.slice(0, -1)) ? 'active' : '' }, label);
  return h('nav', { class: 'nav' }, h('div', { class: 'container' }, tab('expenses', 'Expenses'), tab('challenges', 'Challenges')));
}

async function logout() {
  await api.post('/api/logout');
  user = null;
  location.hash = '#/login';
}

async function render() {
  const route = parseRoute(location.hash);
  if (user === undefined) user = await api.get('/api/me').then((r) => r.user, () => null);

  if (!user && !PUBLIC_ROUTES.has(route.name)) return void (location.hash = loginRedirect(location.hash));
  if (user && PUBLIC_ROUTES.has(route.name)) return void (location.hash = safeNext(route.query.next));

  const ctx = {
    route,
    user,
    api,
    rerender: render,
    signedIn(u) { user = u; location.hash = safeNext(route.query.next); },
  };
  let view;
  try {
    view = await VIEWS[route.name](ctx);
  } catch (err) {
    if (err.status === 401) { user = null; return void (location.hash = loginRedirect(location.hash)); }
    view = h('div', { class: 'card error' }, err.message);
  }
  if (PUBLIC_ROUTES.has(route.name)) mount(app, view);
  else mount(app, topbar(), nav(route), h('main', { class: 'container' }, view));
}

window.addEventListener('hashchange', render);
render();
