export function toNumber(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function toInteger(value, fallback = null) {
  const number = toNumber(value, fallback);
  return Number.isInteger(number) ? number : fallback;
}

export function normalizeText(value) {
  return String(value ?? '').trim();
}

export function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

export function slugify(value) {
  return normalizeLower(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

export function parseIdList(value, fallback = []) {
  if (Array.isArray(value)) return value.map(Number).filter(Number.isInteger);
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = String(value).split(',').map(item => Number(item.trim())).filter(Number.isInteger);
  return parsed.length ? parsed : fallback;
}

export function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

export function nowIso() {
  return new Date().toISOString();
}
