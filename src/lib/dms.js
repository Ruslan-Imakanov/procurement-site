// Автоматическая нумерация и именование документов DMS по шаблонам из настроек.
// Используется и сервером (присвоение номера), и админкой (предпросмотр до загрузки).

import { slugify } from './util.js';

export const ACCESS = {
  public: 'Публичный — можно скачать с сайта',
  internal: 'Внутренний — только сотрудники',
  confidential: 'Конфиденциальный — только сотрудники',
};

const cleanCode = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'XX';

export function counterKey({ type, dept, date }) {
  return `${cleanCode(type)}-${cleanCode(dept)}-${String(date || '').slice(0, 4) || new Date().getUTCFullYear()}`;
}

export function formatNumber(template, { type, dept, date, seq }) {
  const year = String(date || '').slice(0, 4) || String(new Date().getUTCFullYear());
  return String(template || '{type}-{dept}-{year}-{seq:3}')
    .replace(/\{seq(?::(\d))?\}/g, (_, w) => String(seq).padStart(Number(w || 0), '0'))
    .replace(/\{type\}/g, cleanCode(type))
    .replace(/\{dept\}/g, cleanCode(dept))
    .replace(/\{year\}/g, year);
}

export function extOf(name) {
  const m = /\.([a-z0-9]{1,8})$/i.exec(String(name || ''));
  return m ? m[1].toLowerCase() : '';
}

export function formatFilename(template, { number, version, title, type, dept, date, originalName }) {
  const base = String(template || '{number}_v{version}_{title}')
    .replace(/\{number\}/g, number)
    .replace(/\{version\}/g, String(version))
    .replace(/\{title\}/g, slugify(title, 50) || 'document')
    .replace(/\{type\}/g, cleanCode(type))
    .replace(/\{dept\}/g, cleanCode(dept))
    .replace(/\{date\}/g, String(date || '').slice(0, 10))
    .replace(/\{year\}/g, String(date || '').slice(0, 4))
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '');
  const ext = extOf(originalName);
  return ext ? `${base}.${ext}` : base;
}
