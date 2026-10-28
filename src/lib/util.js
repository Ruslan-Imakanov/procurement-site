// Общие хелперы: безопасная HTML-шаблонизация, транслитерация, даты.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

// Строка, которую не нужно экранировать (уже готовый HTML).
export class Raw {
  constructor(s) { this.s = s; }
  toString() { return this.s; }
}
export const raw = (s) => new Raw(s == null ? '' : String(s));

function renderVal(v) {
  if (v == null || v === false || v === true) return '';
  if (v instanceof Raw) return v.s;
  if (Array.isArray(v)) return v.map(renderVal).join('');
  return esc(v);
}

// Тегированный шаблон: всё подставленное экранируется, кроме raw()/h``.
export function h(strings, ...vals) {
  let out = strings[0];
  for (let i = 0; i < vals.length; i++) out += renderVal(vals[i]) + strings[i + 1];
  return new Raw(out);
}

// JSON внутри <script type="application/ld+json"> — без возможности закрыть тег.
export const jsonForScript = (obj) =>
  JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

const TR = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l',
  м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ә: 'a', ғ: 'g', қ: 'k', ң: 'n', ө: 'o', ұ: 'u',
  ү: 'u', һ: 'h', і: 'i',
};
export function translit(s) {
  return String(s ?? '').toLowerCase().replace(/[а-яёәғқңөұүһі]/g, (c) => TR[c] ?? '');
}
export function slugify(s, max = 60) {
  return translit(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, max).replace(/-+$/g, '');
}

export const LOCALES = ['ru', 'kk', 'en'];
export const LOCALE_NAMES = { ru: 'Рус', kk: 'Қаз', en: 'Eng' };
export const localePrefix = (loc) => (loc && loc !== 'ru' ? `/${loc}` : '');
const MONTHS = {
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  kk: ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
// '2026-10-27' → '27 октября 2026' / '27 қазан 2026' / 'October 27, 2026'
export function fmtDateLong(iso, loc = 'ru') {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return '';
  const month = (MONTHS[loc] || MONTHS.ru)[Number(m[2]) - 1];
  return loc === 'en' ? `${month} ${Number(m[3])}, ${m[1]}` : `${Number(m[3])} ${month} ${m[1]}`;
}
// '2026-10-27' → '27.10.2026'
export function fmtDateShort(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
}
export const todayIso = () => new Date().toISOString().slice(0, 10);

export function fmtBytes(n) {
  if (!n) return '0 Б';
  if (n < 1024) return `${n} Б`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} КБ`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} МБ`;
}

// Разрешаем только безопасные схемы ссылок.
export function safeUrl(u) {
  const s = String(u ?? '').trim();
  if (!s) return '';
  if (/^(https?:|mailto:|tel:)/i.test(s) || /^[/#?]/.test(s)) return s;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return '#';
  return s;
}

export const randomId = (bytes = 12) => {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
};

export function b64url(buf) {
  let s = '';
  const a = new Uint8Array(buf);
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

export const plainText = (s, max = 200) => {
  const t = String(s ?? '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`|-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : t;
};

// Слияние сохранённого документа с его значениями по умолчанию: объекты сливаются,
// массивы и простые значения берутся из сохранённого.
export function deepMerge(base, over) {
  if (over === undefined) return base;
  if (Array.isArray(over) || over === null || typeof over !== 'object') return over;
  if (!base || typeof base !== 'object' || Array.isArray(base)) return over;
  const out = { ...base };
  for (const k of Object.keys(over)) out[k] = deepMerge(base[k], over[k]);
  return out;
}

// Перевод хранится как «наложение» на русский документ: пустые строки и пустые списки означают
// «взять русский текст». Числа и флажки всегда берутся из русской версии.
// strict — длина списков равна русской (для показа на сайте); иначе — максимальная (для слияния наложений).
export function overlay(base, over, strict = false) {
  if (over === undefined || over === null) return base;
  if (base === undefined) return over;
  if (Array.isArray(over)) {
    if (!Array.isArray(base)) return base;
    const n = strict ? base.length : Math.max(base.length, over.length);
    return Array.from({ length: n }, (_, i) => overlay(base[i], over[i], strict));
  }
  if (typeof over === 'object') {
    if (!base || typeof base !== 'object' || Array.isArray(base)) return base;
    const out = { ...base };
    for (const k of Object.keys(over)) out[k] = overlay(base[k], over[k], strict);
    return out;
  }
  if (typeof over === 'string') return over.trim() ? over : base;
  return base;
}
