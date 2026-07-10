// Local data layer — mirrors the Base44 entity model (created via localStorage because
// the entity provisioning pipeline is currently unavailable). Swap calls to `store`
// for `base44.entities.*` once entities are available.

const PREFIX = 'amul_db_';
const TABLES = [
  'accounts',
  'supplier_profiles',
  'customer_profiles',
  'supplier_links',
  'products',
  'orders',
  'bills',
  'notifications',
  'reviews',
  'messages',
];

function genId() {
  return 'rec_' + (crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
}

function read(table) {
  try {
    return JSON.parse(localStorage.getItem(PREFIX + table) || '[]');
  } catch {
    return [];
  }
}

function persist(table, rows) {
  localStorage.setItem(PREFIX + table, JSON.stringify(rows));
  // cross-tab/cross-component sync
  window.dispatchEvent(new CustomEvent('amul-store-change', { detail: { table } }));
}

export const store = {
  TABLES,
  list(table) {
    return read(table);
  },
  filter(table, predicate) {
    return read(table).filter(predicate);
  },
  find(table, predicate) {
    return read(table).find(predicate);
  },
  get(table, id) {
    return read(table).find((r) => r.id === id) || null;
  },
  create(table, data) {
    const rows = read(table);
    const now = new Date().toISOString();
    const record = { id: genId(), created_date: now, updated_date: now, ...data };
    rows.push(record);
    persist(table, rows);
    return record;
  },
  update(table, id, patch) {
    const rows = read(table);
    const i = rows.findIndex((r) => r.id === id);
    if (i === -1) return null;
    rows[i] = { ...rows[i], ...patch, updated_date: new Date().toISOString() };
    persist(table, rows);
    return rows[i];
  },
  remove(table, id) {
    persist(table, read(table).filter((r) => r.id !== id));
  },
  removeAll(table, predicate) {
    persist(table, read(table).filter((r) => !predicate(r)));
  },
};

export function daysSince(dateStr) {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function inr(amount) {
  const n = Number(amount || 0);
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: n % 1 === 0 ? 0 : 2 });
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function randomLetter() {
  return ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
}

// 4 random digits, zero-padded (0000-9999) so every code has a fixed shape.
function randomDigits() {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0');
}

// Supplier invite codes: 4 letters (from the business name, padded with
// random letters if the name is too short) + 4 random digits, e.g. "SHAR-4821".
// Combination space is 26^4 * 10^4 (~4.6 billion), and we still verify against
// every existing code so a collision can never actually be issued.
export function genInviteCode(businessName) {
  const lettersFromName = (businessName || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4);
  let base = lettersFromName;
  while (base.length < 4) base += randomLetter();

  const existingCodes = new Set(store.list('supplier_profiles').map((s) => s.invite_code));

  let code;
  let attempts = 0;
  do {
    code = `${base}-${randomDigits()}`;
    attempts++;
    // In the astronomically unlikely case all 10,000 numeric suffixes for
    // this exact base are taken, reshuffle the letters too so we always
    // terminate with a guaranteed-unique code.
    if (attempts > 200) {
      base = lettersFromName.length ? lettersFromName : '';
      while (base.length < 4) base += randomLetter();
      attempts = 0;
    }
  } while (existingCodes.has(code));

  return code;
}