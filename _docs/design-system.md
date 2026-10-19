# Design system

Read this before any UI change. `public/styles.css` implements exactly these tokens
and classes — add new ones here first, then in CSS.

## Principles

- **Mobile first.** Designed at 360 px; content is centred with `max-width: 640px` on desktop
- **Calm and readable.** One accent colour, generous spacing, no decorative clutter
- **Safe by default.** Build DOM with `h()` from `public/js/dom.js`; never put user text into `innerHTML`
- Light and dark mode come from `prefers-color-scheme`; always use tokens, never raw colours

## Tokens

| Token | Light | Use |
|---|---|---|
| `--bg` | `#f5f6fb` | page background |
| `--surface` | `#ffffff` | cards, bars, inputs |
| `--text` / `--muted` | `#1c2233` / `#6b7385` | body / secondary text |
| `--border` | `#e2e5ee` | 1 px borders, bar track |
| `--primary` / `--primary-ink` / `--primary-soft` | `#4f46e5` / `#fff` / `#eceafe` | main action, active tab, badges |
| `--success` / `--warn` / `--danger` | `#15803d` / `#b45309` / `#dc2626` | under budget / edited / errors and over budget |
| `--radius` | `12px` | cards (inputs and buttons use 10px) |
| `--s1`…`--s6` | 4, 8, 12, 16, 24, 32 px | the only spacing values |

Typography: system font stack, 16 px body, `h1` 1.5rem, `h2` 1.25rem, `h3` 1.05rem.
Money uses `.amount` (tabular numbers) and is formatted like `12 500 ₸`.

## Components

| Class | What it is |
|---|---|
| `.container` | centred column, max 640 px, 16 px padding |
| `.stack` | vertical rhythm: 12 px between children |
| `.row`, `.spread`, `.grow` | flex row, space-between, flexible child |
| `.topbar`, `.brand`, `.nav` | sticky app bar with brand, user and Log out; tab nav (active tab: `.active`) |
| `.card`, `.auth-card` | white rounded panel; narrow centred card for login/register |
| `.field` + `.input` | label with a small bold caption above a full-width input/select |
| `.error` | inline red message under a form (hidden when empty). Never use `alert()` |
| `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-danger`, `.btn-block`, `.btn-sm` | buttons; one primary button per form |
| `.badge`, `.badge-warn`, `.badge-success` | small pill; `edited` uses `.badge-warn` |
| `.list` | divided list rows |
| `.bar` (`> i` width = %) and `.bar.over` | progress / category bars; red when over 100 % |
| `.amount`, `.big`, `.muted`, `.small`, `.center`, `.empty` | text helpers and the empty state |

## Patterns

- Forms: `formHandler(form, submit)` disables the submit button during the request and shows the API error in the form's `.error`
- Every list has an empty state (`.empty`) with one friendly sentence
- Destructive actions (delete) ask for confirmation
