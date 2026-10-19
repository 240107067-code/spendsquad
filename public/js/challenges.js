import { h } from './dom.js';

export function challengesView() {
  return h('section', { class: 'stack' },
    h('h1', {}, 'Challenges'),
    h('div', { class: 'card empty' }, 'No challenges yet.'));
}

export function challengeView() {
  return h('section', { class: 'stack' }, h('h1', {}, 'Challenge'));
}

export function inviteView() {
  return h('section', { class: 'stack' }, h('h1', {}, 'Invite'));
}
