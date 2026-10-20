// Shared formatting helpers (pure, unit-tested in Node).
const pad = (n) => String(n).padStart(2, '0');

export function todayIso(now = new Date()) {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// 12500 -> "12 500 ₸"
export function money(n) {
  return `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₸`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// "2026-10-20" -> "20 Oct"
export function shortDate(iso) {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

// "2026-10-20" -> "Tue, 20 Oct"
export function dayLabel(iso) {
  const day = new Date(iso + 'T00:00:00Z').getUTCDay();
  return `${DAYS[day]}, ${shortDate(iso)}`;
}
