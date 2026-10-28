// Админка сайта (CMS): одностраничное приложение без фреймворков.
// Формы редактирования строятся автоматически по JSON Schema из schemas.js (или её переопределению).

import { markdown } from '../lib/md.js';
import { formatNumber, formatFilename, ACCESS } from '../lib/dms.js';
import { fmtBytes, fmtDateShort } from '../lib/util.js';

// ---------- утилиты DOM ----------
const $ = (sel, root = document) => root.querySelector(sel);

function el(tag, props, ...kids) {
  const n = document.createElement(tag);
  let selectValue;
  for (const [k, v] of Object.entries(props || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(n.style, v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'value') { if (tag === 'select') selectValue = v; else n.value = v; }
    else if (k === 'checked') n.checked = !!v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false && c !== '') n.append(c instanceof Node ? c : String(c));
  if (selectValue !== undefined) n.value = selectValue;
  return n;
}

const debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const fmtDateTime = (iso) => (iso ? `${fmtDateShort(iso)} ${String(iso).slice(11, 16)}` : '');
const clone = (o) => JSON.parse(JSON.stringify(o ?? null));

function toast(msg, type = 'ok') {
  let box = $('#toasts');
  if (!box) { box = el('div', { id: 'toasts', 'aria-live': 'polite' }); document.body.append(box); }
  const t = el('div', { class: `toast toast-${type}` }, msg);
  box.append(t);
  setTimeout(() => t.remove(), type === 'err' ? 7000 : 3500);
}

function modal(title, body, { wide } = {}) {
  const close = () => { wrap.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const wrap = el('div', { class: 'modal-wrap', onclick: (e) => { if (e.target === wrap) close(); } },
    el('div', { class: `modal${wide ? ' modal-wide' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      el('div', { class: 'modal-head' }, el('h2', null, title), el('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Закрыть', onclick: close }, '✕')),
      el('div', { class: 'modal-body' }, body)));
  document.addEventListener('keydown', onKey);
  document.body.append(wrap);
  return { close, root: wrap };
}

// ---------- API ----------
async function api(method, path, body, { raw } = {}) {
  const opts = { method, headers: { 'X-Requested-With': 'admin' } };
  if (body instanceof FormData) opts.body = body;
  else if (body !== undefined) { opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; }
  const r = await fetch(`/api/admin${path}`, opts);
  if (raw) return r;
  if (r.status === 401 && !['/login', '/password'].includes(path)) {
    state.user = null;
    renderLogin();
    throw new Error('Сессия истекла — войдите снова');
  }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Ошибка ${r.status}`);
  return data;
}

// ---------- состояние ----------
const state = { translating: false, user: null, counts: {}, siteName: '', schemas: null, media: null, services: null, dirty: false, save: null, lastHash: '' };

const DOC_TITLES = {
  'page:home': 'Главная', 'page:about': 'О нас', 'page:services': 'Услуги', 'page:insights': 'Аналитика',
  'page:cases': 'Примеры проектов', 'page:contact': 'Контакты', 'form:contact': 'Форма обратной связи', settings: 'Настройки сайта',
};
const TYPE_TITLES = {
  service: ['Специализации', 'Специализация'], article: ['Статьи', 'Статья'], case: ['Примеры проектов', 'Проект'],
  client: ['Логотипы клиентов', 'Логотип'], hero: ['Баннеры по регионам', 'Баннер'], page: ['Доп. страницы', 'Страница'],
};
const PUBLIC_PATH = {
  'page:home': '/', 'page:about': '/about', 'page:services': '/services', 'page:insights': '/insights',
  'page:cases': '/cases?preview', 'page:contact': '/contact', 'form:contact': '/contact',
};
const entryUrl = (type, e) => ({ service: `/services/${e.slug}`, article: `/insights/${e.slug}`, case: `/cases/${e.slug}?preview`, page: `/${e.slug}` }[type]);
const entryTitle = (e) => e.data?.title || e.data?.name || '(без названия)';
const isAdmin = () => state.user?.role === 'admin';

function setDirty(v = true) {
  state.dirty = v;
  document.querySelector('.savebar')?.classList.toggle('is-dirty', v);
}
window.addEventListener('beforeunload', (e) => { if (state.dirty) { e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's' && state.save) { e.preventDefault(); state.save(); }
});

async function loadSchemas() {
  if (!state.schemas) state.schemas = await api('GET', '/schemas');
  return state.schemas;
}
async function loadMedia(force) {
  if (!state.media || force) state.media = await api('GET', '/media');
  return state.media;
}
async function loadServices() {
  if (!state.services) state.services = await api('GET', '/entries?type=service');
  return state.services;
}

// ---------- изображения ----------
const EXT = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/svg+xml': 'svg', 'image/gif': 'gif', 'image/avif': 'avif' };
const variantUrl = (v) => `/media/${v.key}.${EXT[v.mime] || 'bin'}`;
function thumbUrl(id) {
  if (!id) return '';
  if (id.startsWith('builtin:')) return `/static/${id.slice(8)}.svg`;
  const m = (state.media || []).find((x) => x.id === id);
  return m ? variantUrl(m.variants[0]) : '';
}
const bestUrl = (m) => variantUrl(m.variants.filter((x) => x.w <= 1600).pop() || m.variants[0]);

const canvasToBlob = (canvas, type, quality) => new Promise((res) => canvas.toBlob(res, type, quality));

// Готовим размеры в браузере: WebP (или JPEG/PNG, если браузер не умеет WebP) шириной до 2400 px.
async function prepareVariants(file) {
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
    const url = URL.createObjectURL(file);
    const im = new Image();
    await new Promise((res) => { im.onload = res; im.onerror = res; im.src = url; });
    URL.revokeObjectURL(url);
    return [{ w: im.naturalWidth || 300, h: im.naturalHeight || 150, blob: file }];
  }
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) throw new Error('Поддерживаются JPG, PNG, WebP, SVG и GIF');
  const bmp = await createImageBitmap(file);
  const W = bmp.width;
  const H = bmp.height;
  const maxW = Math.min(W, 2400);
  const widths = [...new Set([480, 960, 1600, maxW].filter((w) => w <= maxW))];
  const out = [];
  for (const w of widths) {
    const h = Math.round((H * w) / W);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    let blob = await canvasToBlob(c, 'image/webp', 0.82);
    if (!blob || blob.type !== 'image/webp') blob = await canvasToBlob(c, file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85);
    out.push({ w, h, blob });
  }
  if (bmp.close) bmp.close();
  return out;
}

async function uploadImage(file, alt = '') {
  const variants = await prepareVariants(file);
  const fd = new FormData();
  fd.append('meta', JSON.stringify({ name: file.name, alt, variants: variants.map((v, i) => ({ w: v.w, h: v.h, field: `v${i}` })) }));
  variants.forEach((v, i) => fd.append(`v${i}`, v.blob, `${file.name}-${v.w}`));
  const m = await api('POST', '/media', fd);
  state.media = [m, ...(state.media || [])];
  return m;
}

function pickMedia(onPick) {
  const grid = el('div', { class: 'media-grid' });
  const fill = () => {
    grid.replaceChildren(...(state.media || []).map((m) => el('button', {
      type: 'button', class: 'media-tile', title: m.name,
      onclick: () => { dlg.close(); onPick(m); },
    }, el('img', { src: variantUrl(m.variants[0]), alt: m.alt || '', loading: 'lazy' }), el('span', null, m.name || m.id))));
    if (!state.media?.length) grid.append(el('p', { class: 'muted' }, 'Медиатека пуста — загрузите файл.'));
  };
  const input = el('input', {
    type: 'file', accept: 'image/*', class: 'visually-hidden', onchange: async () => {
      const f = input.files[0];
      if (!f) return;
      try { const m = await uploadImage(f); dlg.close(); onPick(m); } catch (e) { toast(e.message, 'err'); }
    },
  });
  const dlg = modal('Медиатека', el('div', null, el('div', { class: 'row' }, el('label', { class: 'btn' }, 'Загрузить новое…', input)), grid), { wide: true });
  loadMedia().then(fill).catch((e) => toast(e.message, 'err'));
}

// ---------- переводы ----------
const LANGS = [['', 'Рус'], ['kk', 'Қаз'], ['en', 'Eng']];
const NOTR_KEYS = new Set(['href', 'url', 'notifications', 'dms', 'indexing', 'casesEnabled', 'siteUrl', 'ga4Id', 'showOnHome']);
const NOTR_FORMATS = new Set(['slug', 'services', 'json', 'date']);

// Пустая «болванка» перевода: структура и длина списков как в русской версии, строки пустые.
function skeleton(schema, base) {
  if (schema.type === 'object') {
    if (schema.format === 'image') return { id: '', alt: '' };
    return Object.fromEntries(Object.entries(schema.properties || {}).map(([k, s]) => [k, skeleton(s, base?.[k])]));
  }
  if (schema.type === 'array') return (Array.isArray(base) ? base : []).map((b) => skeleton(schema.items || { type: 'string' }, b));
  if (schema.type === 'boolean') return base ?? false;
  if (schema.type === 'number') return base ?? null;
  return '';
}
function fillFrom(sk, over) {
  if (over === undefined || over === null) return sk;
  if (Array.isArray(sk)) return sk.map((x, i) => fillFrom(x, Array.isArray(over) ? over[i] : undefined));
  if (sk && typeof sk === 'object') return Object.fromEntries(Object.entries(sk).map(([k, v]) => [k, fillFrom(v, over[k])]));
  return typeof over === 'string' && typeof sk === 'string' ? over : sk;
}
function langTabs(current, hrefFor) {
  return el('div', { class: 'lang-tabs', role: 'tablist', 'aria-label': 'Язык' }, LANGS.map(([code, label]) =>
    el('a', { class: `lang-tab${code === current ? ' active' : ''}`, href: hrefFor(code), role: 'tab', 'aria-selected': code === current ? 'true' : 'false' }, label)));
}
const translateHint = (loc) => el('p', { class: 'hint translate-hint' }, `Перевод на ${loc === 'kk' ? 'казахский' : 'английский'}. Пустое поле на сайте показывается по-русски. Количество пунктов в списках, ссылки, числа и галочки берутся из русской версии.`);

// ---------- генерация формы по схеме ----------
function fieldWrap(schema, control) {
  return el('div', { class: 'field' },
    schema.title ? el('label', { class: 'field-label' }, schema.title) : null,
    control,
    schema.description ? el('div', { class: 'hint' }, schema.description) : null);
}

function textInput(schema, holder, key, type = 'text') {
  return el('input', {
    type, value: holder[key] ?? '', maxlength: schema.maxLength || null, pattern: schema.pattern || null,
    oninput: (e) => { holder[key] = type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value; setDirty(); },
  });
}

function markdownInput(holder, key) {
  const ta = el('textarea', { rows: 10, class: 'md-text', value: holder[key] ?? '', oninput: () => { holder[key] = ta.value; setDirty(); } });
  const preview = el('div', { class: 'md-preview prose', hidden: true });
  const insert = (text, mode = 'select', s = ta.selectionStart, e = ta.selectionEnd) => {
    ta.setRangeText(text, s, e, mode);
    ta.focus();
    ta.dispatchEvent(new Event('input'));
  };
  const wrapSel = (before, after = before, placeholder = 'текст') => insert(before + (ta.value.slice(ta.selectionStart, ta.selectionEnd) || placeholder) + after);
  const linePrefix = (prefix) => {
    const start = ta.value.lastIndexOf('\n', ta.selectionStart - 1) + 1;
    const block = ta.value.slice(start, ta.selectionEnd).split('\n').map((l, i) => (typeof prefix === 'function' ? prefix(i) : prefix) + l).join('\n');
    insert(block, 'select', start, ta.selectionEnd);
  };
  const tb = (label, title, fn) => el('button', { type: 'button', class: 'tb', title, 'aria-label': title, onclick: fn }, label);
  const toggle = el('button', {
    type: 'button', class: 'tb tb-wide', onclick: () => {
      const show = preview.hidden;
      preview.hidden = !show;
      ta.hidden = show;
      if (show) preview.innerHTML = markdown(ta.value); // markdown() экранирует HTML
      toggle.textContent = show ? 'Редактировать' : 'Предпросмотр';
    },
  }, 'Предпросмотр');
  const toolbar = el('div', { class: 'md-toolbar' },
    tb('Ж', 'Жирный', () => wrapSel('**')), tb('К', 'Курсив', () => wrapSel('*')),
    tb('H2', 'Подзаголовок', () => linePrefix('## ')), tb('H3', 'Подзаголовок 3 уровня', () => linePrefix('### ')),
    tb('•', 'Маркированный список', () => linePrefix('- ')), tb('1.', 'Нумерованный список', () => linePrefix((i) => `${i + 1}. `)),
    tb('❝', 'Цитата', () => linePrefix('> ')),
    tb('🔗', 'Ссылка', () => { const u = prompt('Адрес ссылки (https://… или /contact)'); if (u) wrapSel('[', `](${u})`, 'текст ссылки'); }),
    tb('🖼', 'Изображение из медиатеки', () => pickMedia((m) => insert(`\n![${m.alt || ''}](${bestUrl(m)})\n`, 'end'))),
    tb('▦', 'Таблица', () => insert('\n| Колонка 1 | Колонка 2 |\n|---|---|\n| Значение | Значение |\n', 'end')),
    toggle);
  return el('div', { class: 'md' }, toolbar, ta, preview,
    el('div', { class: 'hint' }, 'Разметка: **жирный**, *курсив*, ## подзаголовок, - список, [ссылка](адрес). Пустая строка — новый абзац.'));
}

function jsonInput(holder, key) {
  const status = el('div', { class: 'hint' });
  const ta = el('textarea', { rows: 8, class: 'mono', spellcheck: 'false', value: holder[key] ?? '' });
  const check = () => {
    const v = ta.value.trim();
    if (!v) { status.textContent = 'Пусто — дополнительная разметка не выводится'; status.className = 'hint'; return; }
    try { JSON.parse(v); status.textContent = '✓ Корректный JSON'; status.className = 'hint ok'; } catch (e) { status.textContent = `Ошибка JSON: ${e.message}`; status.className = 'hint err'; }
  };
  ta.addEventListener('input', () => { holder[key] = ta.value; setDirty(); check(); });
  const set = (v) => { ta.value = v; ta.dispatchEvent(new Event('input')); };
  check();
  return el('div', null, ta, el('div', { class: 'row row-sm' },
    el('button', { type: 'button', class: 'btn btn-sm', onclick: () => { try { set(JSON.stringify(JSON.parse(ta.value), null, 2)); } catch { /* неверный JSON — оставляем */ } } }, 'Форматировать'),
    el('button', {
      type: 'button', class: 'btn btn-sm', onclick: () => {
        if (ta.value.trim() && !confirm('Заменить текущее содержимое примером?')) return;
        set(JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: 'Вопрос?', acceptedAnswer: { '@type': 'Answer', text: 'Ответ.' } }] }, null, 2));
      },
    }, 'Пример (FAQPage)'),
    el('a', { class: 'btn btn-sm', href: 'https://validator.schema.org/', target: '_blank', rel: 'noopener' }, 'Валидатор schema.org ↗')), status);
}

function imageInput(holder, key) {
  if (!holder[key] || typeof holder[key] !== 'object') holder[key] = { id: '', alt: '' };
  const v = holder[key];
  const box = el('div', { class: 'img-field' });
  const render = () => {
    const url = thumbUrl(v.id);
    const label = el('span', null, 'Загрузить…');
    const file = el('input', {
      type: 'file', accept: 'image/*', class: 'visually-hidden', onchange: async () => {
        const f = file.files[0];
        if (!f) return;
        label.textContent = 'Загрузка…';
        try { const m = await uploadImage(f, v.alt); v.id = m.id; setDirty(); render(); toast('Изображение загружено'); } catch (e) { toast(e.message, 'err'); label.textContent = 'Загрузить…'; }
      },
    });
    box.replaceChildren(
      el('div', { class: 'img-thumb' }, url ? el('img', { src: url, alt: '' }) : el('span', { class: 'muted' }, 'нет')),
      el('div', { class: 'img-side' },
        el('div', { class: 'row row-sm' },
          el('label', { class: 'btn btn-sm' }, label, file),
          el('button', { type: 'button', class: 'btn btn-sm', onclick: () => pickMedia((m) => { v.id = m.id; if (!v.alt && m.alt) v.alt = m.alt; setDirty(); render(); }) }, 'Из медиатеки'),
          v.id ? el('button', { type: 'button', class: 'btn btn-sm btn-danger-ghost', onclick: () => { v.id = ''; setDirty(); render(); } }, 'Убрать') : null),
        el('input', { type: 'text', placeholder: 'Описание изображения (alt) — для поисковиков и незрячих', value: v.alt || '', oninput: (e) => { v.alt = e.target.value; setDirty(); } })));
  };
  render();
  if (!state.media) loadMedia().then(render).catch(() => {});
  return box;
}

function servicesInput(holder, key) {
  if (!Array.isArray(holder[key])) holder[key] = [];
  const box = el('div', { class: 'checks' }, el('span', { class: 'muted' }, 'Загрузка…'));
  loadServices().then((list) => {
    box.replaceChildren(...list.map((s) => el('label', { class: 'check' },
      el('input', {
        type: 'checkbox', checked: holder[key].includes(s.slug), onchange: (e) => {
          holder[key] = e.target.checked ? [...new Set([...holder[key], s.slug])] : holder[key].filter((x) => x !== s.slug);
          setDirty();
        },
      }), entryTitle(s))));
  }).catch((e) => toast(e.message, 'err'));
  return box;
}

function emptyFrom(schema) {
  if (schema.type === 'object') return Object.fromEntries(Object.entries(schema.properties || {}).map(([k, s]) => [k, emptyFrom(s)]));
  if (schema.type === 'array') return [];
  if (schema.type === 'boolean') return false;
  if (schema.type === 'number') return null;
  return '';
}

function arrayInput(schema, holder, key) {
  if (!Array.isArray(holder[key])) holder[key] = [];
  const arr = holder[key];
  const item = schema.items || { type: 'string' };
  const box = el('div', { class: 'array' });
  const summary = (v) => (v && typeof v === 'object' ? Object.values(v).find((x) => typeof x === 'string' && x.trim()) : v) || '';
  const render = () => {
    const rows = arr.map((_, i) => {
      const move = (d) => { const j = i + d; [arr[i], arr[j]] = [arr[j], arr[i]]; setDirty(); render(); };
      const tools = state.translating ? el('span') : el('span', { class: 'array-tools' },
        el('button', { type: 'button', class: 'icon-btn', title: 'Выше', 'aria-label': 'Выше', disabled: i === 0, onclick: (e) => { e.preventDefault(); move(-1); } }, '↑'),
        el('button', { type: 'button', class: 'icon-btn', title: 'Ниже', 'aria-label': 'Ниже', disabled: i === arr.length - 1, onclick: (e) => { e.preventDefault(); move(1); } }, '↓'),
        el('button', { type: 'button', class: 'icon-btn danger', title: 'Удалить', 'aria-label': 'Удалить', onclick: (e) => { e.preventDefault(); if (confirm('Удалить элемент?')) { arr.splice(i, 1); setDirty(); render(); } } }, '✕'));
      if (item.type === 'object' && !item['x-inline']) {
        return el('details', { class: 'array-item', open: state.translating || arr.length <= 3 || !summary(arr[i]) },
          el('summary', null, el('span', { class: 'array-num' }, i + 1), el('span', { class: 'array-sum' }, summary(arr[i]) || '(пусто)'), tools),
          el('div', { class: 'array-body' }, objectFields(item, arr[i])));
      }
      return el('div', { class: 'array-item array-row' }, el('span', { class: 'array-num' }, i + 1),
        el('div', { class: 'array-body' }, item.type === 'object' ? objectFields(item, arr[i], { inline: true }) : fieldControl(item, arr, i)), tools);
    });
    box.replaceChildren(...rows, state.translating ? null : el('button', {
      type: 'button', class: 'btn btn-sm', onclick: () => { arr.push(emptyFrom(item)); setDirty(); render(); },
    }, `+ Добавить${item.title ? `: ${item.title.toLowerCase()}` : ''}`));
  };
  render();
  return box;
}

function fieldControl(schema, holder, key) {
  const t = schema.type;
  if (t === 'object' && schema.format === 'image') return imageInput(holder, key);
  if (t === 'array' && schema.format === 'services') return servicesInput(holder, key);
  if (t === 'array') return arrayInput(schema, holder, key);
  if (t === 'object') {
    if (!holder[key] || typeof holder[key] !== 'object') holder[key] = {};
    return objectFields(schema, holder[key], { inline: schema['x-inline'] });
  }
  if (t === 'boolean') {
    return el('label', { class: 'switch' }, el('input', { type: 'checkbox', checked: !!holder[key], onchange: (e) => { holder[key] = e.target.checked; setDirty(); } }), el('span', null, schema.title));
  }
  if (t === 'number') return textInput(schema, holder, key, 'number');
  if (schema.enum) {
    const titles = schema['x-enumTitles'] || [];
    return el('select', { value: holder[key] ?? '', onchange: (e) => { holder[key] = e.target.value; setDirty(); } },
      el('option', { value: '' }, '—'), schema.enum.map((v, i) => el('option', { value: v }, titles[i] || v)));
  }
  switch (schema.format) {
    case 'textarea': return el('textarea', { rows: 3, value: holder[key] ?? '', maxlength: schema.maxLength || null, oninput: (e) => { holder[key] = e.target.value; setDirty(); } });
    case 'markdown': return markdownInput(holder, key);
    case 'json': return jsonInput(holder, key);
    case 'date': return textInput(schema, holder, key, 'date');
    default: return textInput(schema, holder, key);
  }
}

const isGroup = (s) => s.type === 'object' && s.format !== 'image';

function untranslatable(schema, key) {
  return state.translating && (schema['x-notranslate'] || NOTR_KEYS.has(key) || NOTR_FORMATS.has(schema.format) || schema.type === 'boolean' || schema.type === 'number' || schema.enum);
}

function field(schema, holder, key, { top } = {}) {
  if (untranslatable(schema, key)) return null;
  const control = fieldControl(schema, holder, key);
  if (schema.type === 'boolean') return el('div', { class: 'field' }, control, schema.description ? el('div', { class: 'hint' }, schema.description) : null);
  if (isGroup(schema)) {
    const inner = [schema.description ? el('p', { class: 'hint' }, schema.description) : null, control];
    if (top) {
      return schema['x-collapsed']
        ? el('details', { class: 'panel panel-collapsible' }, el('summary', null, el('h2', null, schema.title)), el('div', { class: 'panel-body' }, inner))
        : el('section', { class: 'panel' }, el('h2', null, schema.title), inner);
    }
    return el('fieldset', { class: `group${schema['x-inline'] ? ' group-inline' : ''}` }, schema.title ? el('legend', null, schema.title) : null, inner);
  }
  return fieldWrap(schema, control);
}

function objectFields(schema, obj, { inline } = {}) {
  return el('div', { class: inline ? 'fields fields-inline' : 'fields' }, Object.entries(schema.properties || {}).map(([k, s]) => field(s, obj, k)));
}

// Корневая форма: группы и списки — отдельными панелями, простые поля — общей панелью сверху.
function rootForm(schema, model) {
  const simple = [];
  const panels = [];
  for (const [k, s] of Object.entries(schema.properties || {})) {
    if (untranslatable(s, k)) continue;
    if (isGroup(s)) panels.push(field(s, model, k, { top: true }));
    else if (s.type === 'array' || s.format === 'markdown') {
      panels.push(el('section', { class: 'panel' }, el('h2', null, s.title), s.description ? el('p', { class: 'hint' }, s.description) : null, fieldControl(s, model, k)));
    } else simple.push(field(s, model, k));
  }
  return el('div', { class: 'form-root' }, simple.length ? el('section', { class: 'panel' }, el('div', { class: 'fields' }, simple)) : null, panels);
}

const saveBar = (actions) => el('div', { class: 'savebar' }, el('span', { class: 'savebar-state' }), actions);
const header = (title, ...right) => el('div', { class: 'page-head' }, el('h1', null, title), el('div', { class: 'row' }, right));

// ---------- экраны ----------
async function viewDashboard(main) {
  const [me, settings] = await Promise.all([api('GET', '/me'), api('GET', '/docs/settings')]);
  state.counts = me.counts;
  updateBadges();
  const s = settings.data;
  const card = (label, value, href) => el('a', { class: 'stat-card', href }, el('strong', null, String(value)), el('span', null, label));
  const todo = [];
  if (!s.indexing) todo.push(['Индексация поисковиками выключена', 'Сайт отдаёт noindex — так и нужно, пока на нём тексты-заглушки. После запуска включите в «Настройках сайта».']);
  if (!s.casesEnabled) todo.push(['Раздел «Примеры проектов» скрыт', 'Наполните проекты и включите раздел в «Настройках сайта». Посмотреть заранее можно в режиме предпросмотра.']);
  if (!s.analytics?.ga4Id) todo.push(['Google Analytics не подключён', 'Укажите Measurement ID (G-…) в «Настройках сайта» → «Google Analytics 4 и cookie».']);
  const li = ([t, d]) => el('li', null, el('strong', null, t), el('span', null, d));
  main.replaceChildren(
    header(`Здравствуйте, ${state.user.name || state.user.email}`),
    el('div', { class: 'stats' },
      card('новых заявок', me.counts.newSubmissions, '#/submissions'), card('статей', me.counts.articles, '#/list/article'),
      card('документов', me.counts.documents, '#/documents'), card('файлов в медиатеке', me.counts.media, '#/media')),
    todo.length ? el('section', { class: 'panel' }, el('h2', null, 'Что стоит сделать'), el('ul', { class: 'todo' }, todo.map(li))) : null,
    el('section', { class: 'panel' }, el('h2', null, 'Как здесь всё устроено'), el('ul', { class: 'todo' }, [
      ['Страницы', 'Тексты, кнопки и картинки основных страниц сайта.'],
      ['Контент', 'Специализации, статьи, проекты, логотипы клиентов и баннеры для разных стран.'],
      ['Документы', 'Хранилище политик, отчётов и шаблонов с автоматической нумерацией. Публичные документы появляются на странице «Аналитика».'],
      ['Сохранение', 'Кнопка «Сохранить» или Ctrl+S. Изменения появляются на сайте в течение 10–20 секунд.'],
    ].map(li))),
  );
}

async function viewDoc(main, key) {
  const tm = /^(kk|en):(.+)$/.exec(key);
  const loc = tm ? tm[1] : '';
  const baseKey = tm ? tm[2] : key;
  const [schemas, doc, baseDoc] = await Promise.all([loadSchemas(), api('GET', `/docs/${encodeURIComponent(key)}`), loc ? api('GET', `/docs/${encodeURIComponent(baseKey)}`) : null]);
  const schema = schemas[baseKey]?.schema;
  if (!schema) throw new Error('Нет схемы для этого раздела');
  state.translating = !!loc;
  let model = loc ? fillFrom(skeleton(schema, baseDoc.data), doc.data) : clone(doc.data) || {};
  const formBox = el('div');
  const renderForm = () => formBox.replaceChildren(rootForm(schema, model));
  let rawMode = false;
  const rawArea = el('textarea', { class: 'mono raw-json', rows: 30, spellcheck: 'false', oninput: () => setDirty() });
  const rawBtn = el('button', { type: 'button', class: 'btn' }, 'JSON');
  const toggleRaw = () => {
    if (!rawMode) {
      rawArea.value = JSON.stringify(model, null, 2);
      formBox.replaceChildren(el('p', { class: 'hint' }, 'Прямое редактирование данных в JSON. Структура должна совпадать со схемой.'), rawArea);
    } else {
      try { model = JSON.parse(rawArea.value); } catch (e) { toast(`Ошибка JSON: ${e.message}`, 'err'); return; }
      renderForm();
    }
    rawMode = !rawMode;
    rawBtn.textContent = rawMode ? 'Форма' : 'JSON';
  };
  rawBtn.addEventListener('click', toggleRaw);
  const save = async () => {
    try {
      if (rawMode) model = JSON.parse(rawArea.value);
      const r = await api('PUT', `/docs/${encodeURIComponent(key)}`, { data: model });
      if (!loc) model = clone(r.data);
      setDirty(false);
      if (rawMode) { rawMode = false; rawBtn.textContent = 'JSON'; }
      renderForm();
      toast('Сохранено');
      if (key === 'settings') state.siteName = model.siteName;
    } catch (e) { toast(e.message, 'err'); }
  };
  state.save = save;
  renderForm();
  main.replaceChildren(
    header(DOC_TITLES[baseKey] || schema.title, PUBLIC_PATH[baseKey] ? el('a', { class: 'btn', href: (loc ? `/${loc}` : '') + (PUBLIC_PATH[baseKey] === '/' && loc ? '' : PUBLIC_PATH[baseKey]), target: '_blank' }, 'Открыть на сайте ↗') : null, isAdmin() ? rawBtn : null),
    langTabs(loc, (l) => `#/doc/${l ? `${l}:` : ''}${baseKey}`),
    loc ? translateHint(loc) : null,
    formBox,
    saveBar([el('button', { type: 'button', class: 'btn btn-primary', onclick: save }, 'Сохранить')]),
  );
}

async function viewList(main, type) {
  const [plural, single] = TYPE_TITLES[type];
  const list = await api('GET', `/entries?type=${type}`);
  if (type === 'article') list.sort((a, b) => String(b.data.date || '').localeCompare(String(a.data.date || '')));
  if (type === 'client' || type === 'hero') await loadMedia().catch(() => {});
  const body = el('div', { class: 'list' });
  const reorder = async (i, d) => {
    const j = i + d;
    [list[i], list[j]] = [list[j], list[i]];
    render();
    try { await api('POST', '/entries/reorder', { type, ids: list.map((x) => x.id) }); } catch (e) { toast(e.message, 'err'); }
  };
  const render = () => {
    body.replaceChildren(...list.map((e, i) => el('div', { class: 'list-row' },
      type === 'client' || type === 'hero' ? el('img', { class: 'list-thumb', src: thumbUrl((e.data.logo || e.data.image)?.id) || 'data:,', alt: '' }) : null,
      el('a', { class: 'list-title', href: `#/entry/${type}/${e.id}` }, entryTitle(e),
        el('span', { class: 'list-sub' }, [
          type === 'article' ? fmtDateShort(e.data.date) : '',
          type === 'hero' ? `Регионы: ${e.data.regions || '—'}` : '',
          e.slug ? (entryUrl(type, e) || '').replace('?preview', '') : '',
        ].filter(Boolean).join(' · '))),
      el('span', { class: `badge ${e.status === 'draft' ? 'badge-draft' : 'badge-ok'}` }, e.status === 'draft' ? 'Черновик' : 'Опубликовано'),
      type !== 'article' ? el('span', { class: 'row row-sm' },
        el('button', { type: 'button', class: 'icon-btn', title: 'Выше', 'aria-label': 'Выше', disabled: i === 0, onclick: () => reorder(i, -1) }, '↑'),
        el('button', { type: 'button', class: 'icon-btn', title: 'Ниже', 'aria-label': 'Ниже', disabled: i === list.length - 1, onclick: () => reorder(i, 1) }, '↓')) : null)));
    if (!list.length) body.append(el('p', { class: 'empty' }, 'Пока ничего нет.'));
  };
  render();
  const notes = {
    hero: 'Посетителю показывается первый сверху баннер, в списке регионов которого есть его страна (или континент); баннер с «*» — для всех остальных. Проверить можно, открыв сайт с параметром ?geo=KZ, ?geo=DE, ?geo=AE.',
    case: 'Раздел скрыт от посетителей, пока в «Настройках сайта» не включено «Показывать раздел «Примеры проектов»».',
    client: 'Логотипы показываются на главной, на странице «Услуги» и на страницах специализаций.',
    page: 'Дополнительные страницы открываются по адресу /<адрес>, например /privacy.',
  };
  main.replaceChildren(header(plural, el('a', { class: 'btn btn-primary', href: `#/entry/${type}/new` }, `+ ${single}`)), notes[type] ? el('p', { class: 'hint' }, notes[type]) : null, body);
}

async function viewEntry(main, type, id, loc = '') {
  const schemas = await loadSchemas();
  const schema = schemas[type].schema;
  const isNew = id === 'new';
  let entry = isNew ? { type, status: 'published', data: emptyFrom(schema) } : await api('GET', `/entries/${id}`);
  if (isNew && type === 'article') entry.data.date = new Date().toISOString().slice(0, 10);
  state.translating = !!loc && !isNew;
  let model = entry.data;
  if (state.translating) {
    const tr = await api('GET', `/docs/${loc}:e:${id}`);
    model = fillFrom(skeleton(schema, entry.data), tr.data);
  }
  const status = el('select', { value: entry.status, onchange: () => setDirty() }, el('option', { value: 'published' }, 'Опубликовано'), el('option', { value: 'draft' }, 'Черновик'));
  const save = async () => {
    try {
      if (state.translating) {
        await api('PUT', `/docs/${loc}:e:${id}`, { data: model });
        setDirty(false);
        toast('Перевод сохранён');
        return;
      }
      const r = await api('POST', '/entries', { id: isNew ? undefined : entry.id, type, status: status.value, data: model });
      setDirty(false);
      if (type === 'service') state.services = null;
      toast('Сохранено');
      if (isNew) location.hash = `#/entry/${type}/${r.id}`;
      else if (r.slug !== entry.slug) router();
      else entry = r;
    } catch (e) { toast(e.message, 'err'); }
  };
  const del = async () => {
    if (!confirm(`Удалить «${entryTitle(entry)}»? Это действие нельзя отменить.`)) return;
    try {
      await api('DELETE', `/entries/${entry.id}`);
      setDirty(false);
      if (type === 'service') state.services = null;
      toast('Удалено');
      location.hash = `#/list/${type}`;
    } catch (e) { toast(e.message, 'err'); }
  };
  state.save = save;
  const url = !isNew && entryUrl(type, entry);
  main.replaceChildren(
    header(isNew ? `Новая запись: ${TYPE_TITLES[type][1].toLowerCase()}` : entryTitle(entry),
      el('a', { class: 'btn', href: `#/list/${type}` }, '← К списку'),
      url && !loc ? el('a', { class: 'btn', href: `/__preview/${type}/${entry.id}`, target: '_blank', title: 'Как страница выглядит с последними сохранёнными изменениями, включая черновик' }, 'Предпросмотр ↗') : null,
      url && !loc && entry.status !== 'draft' ? el('a', { class: 'btn', href: url, target: '_blank' }, 'На сайте ↗') : null,
      url && loc ? el('a', { class: 'btn', href: `/${loc}${url}`, target: '_blank' }, 'На сайте ↗') : null),
    !isNew && type !== 'client' ? langTabs(loc, (l) => `#/entry/${type}/${id}${l ? `/${l}` : ''}`) : null,
    state.translating ? translateHint(loc) : null,
    rootForm(schema, model),
    saveBar([state.translating ? null : el('label', { class: 'inline-label' }, 'Статус ', status),
      !isNew && !state.translating ? el('button', { type: 'button', class: 'btn btn-danger-ghost', onclick: del }, 'Удалить') : null,
      el('button', { type: 'button', class: 'btn btn-primary', onclick: save }, state.translating ? 'Сохранить перевод' : 'Сохранить')]),
  );
}

async function viewMedia(main) {
  await loadMedia(true);
  const grid = el('div', { class: 'media-grid media-grid-lg' });
  const count = el('span');
  const input = el('input', {
    type: 'file', accept: 'image/*', multiple: true, class: 'visually-hidden', onchange: async () => {
      for (const f of input.files) {
        try { await uploadImage(f); toast(`Загружено: ${f.name}`); } catch (e) { toast(`${f.name}: ${e.message}`, 'err'); }
      }
      input.value = '';
      render();
    },
  });
  const details = (m) => {
    const alt = el('input', { type: 'text', value: m.alt || '' });
    const dlg = modal(m.name || 'Изображение', el('div', { class: 'media-detail' },
      el('img', { src: bestUrl(m), alt: '' }),
      el('div', null,
        el('p', null, `${m.width}×${m.height} px · ${fmtBytes(m.size)} · размеры: ${m.variants.map((v) => v.w).join(', ')} px`),
        el('p', null, 'Ссылка для вставки в текст: ', el('code', null, bestUrl(m))),
        fieldWrap({ title: 'Описание (alt)' }, alt),
        el('div', { class: 'row' },
          el('button', {
            type: 'button', class: 'btn btn-primary', onclick: async () => {
              try { Object.assign(m, await api('PATCH', `/media/${m.id}`, { alt: alt.value })); toast('Сохранено'); dlg.close(); } catch (e) { toast(e.message, 'err'); }
            },
          }, 'Сохранить'),
          el('button', {
            type: 'button', class: 'btn btn-danger-ghost', onclick: async () => {
              if (!confirm('Удалить файл? Если он используется на сайте, там останется пустое место.')) return;
              try { await api('DELETE', `/media/${m.id}`); state.media = state.media.filter((x) => x.id !== m.id); toast('Удалено'); dlg.close(); render(); } catch (e) { toast(e.message, 'err'); }
            },
          }, 'Удалить')))), { wide: true });
  };
  const render = () => {
    count.textContent = `Файлов: ${state.media.length}. `;
    grid.replaceChildren(...state.media.map((m) => el('button', { type: 'button', class: 'media-tile', onclick: () => details(m) },
      el('img', { src: variantUrl(m.variants[0]), alt: m.alt || '', loading: 'lazy' }), el('span', null, m.name || m.id))));
    if (!state.media.length) grid.append(el('p', { class: 'empty' }, 'Медиатека пуста.'));
  };
  render();
  main.replaceChildren(
    header('Медиатека', el('label', { class: 'btn btn-primary' }, '+ Загрузить изображения', input)),
    el('p', { class: 'hint' }, count, 'Фотографии автоматически уменьшаются и сохраняются в WebP нескольких размеров — сайт подбирает размер под экран посетителя.'),
    grid,
  );
}

// ---------- документы (DMS) ----------
const accessLabel = (k) => ({ public: 'Публичный', internal: 'Внутренний', confidential: 'Конфиденциальный' }[k] || k);

async function viewDocuments(main, id) {
  const dms = (await api('GET', '/docs/settings')).data.dms || {};
  const typeName = (c) => dms.types?.find((t) => t.code === c)?.name || c;
  const deptName = (c) => dms.departments?.find((t) => t.code === c)?.name || c;
  if (id) return viewDocument(main, id, typeName, deptName);
  const list = await api('GET', '/documents');
  const q = el('input', { type: 'search', placeholder: 'Поиск: номер, название, клиент, теги…', 'aria-label': 'Поиск' });
  const fType = el('select', { 'aria-label': 'Тип' }, el('option', { value: '' }, 'Все типы'), (dms.types || []).map((t) => el('option', { value: t.code }, t.name)));
  const fDept = el('select', { 'aria-label': 'Направление' }, el('option', { value: '' }, 'Все направления'), (dms.departments || []).map((t) => el('option', { value: t.code }, t.name)));
  const fAccess = el('select', { 'aria-label': 'Доступ' }, el('option', { value: '' }, 'Любой доступ'), Object.keys(ACCESS).map((k) => el('option', { value: k }, accessLabel(k))));
  const tbody = el('tbody');
  const render = () => {
    const s = q.value.trim().toLowerCase();
    const rows = list.filter((d) => (!fType.value || d.type === fType.value) && (!fDept.value || d.dept === fDept.value) && (!fAccess.value || d.access === fAccess.value)
      && (!s || [d.number, d.title, d.client, d.tags, d.owner, d.description].join(' ').toLowerCase().includes(s)));
    tbody.replaceChildren(...rows.map((d) => el('tr', null,
      el('td', { 'data-label': 'Номер' }, el('a', { href: `#/documents/${d.id}`, class: 'mono' }, d.number)),
      el('td', { 'data-label': 'Название' }, el('a', { href: `#/documents/${d.id}` }, d.title), d.client ? el('div', { class: 'muted small' }, d.client) : null),
      el('td', { 'data-label': 'Тип' }, typeName(d.type)),
      el('td', { 'data-label': 'Направление' }, deptName(d.dept)),
      el('td', { 'data-label': 'Дата' }, fmtDateShort(d.doc_date)),
      el('td', { 'data-label': 'Доступ' }, el('span', { class: `badge badge-${d.access}` }, accessLabel(d.access))),
      el('td', { 'data-label': 'Версия' }, `v${d.version}`),
      el('td', { 'data-label': 'Файл' }, el('a', { href: `/api/admin/documents/${d.id}/download`, title: d.filename }, `⬇ ${fmtBytes(d.size)}`)))));
    if (!rows.length) tbody.append(el('tr', null, el('td', { colspan: 8, class: 'empty' }, list.length ? 'Ничего не найдено' : 'Документов пока нет — загрузите первый.')));
  };
  [q, fType, fDept, fAccess].forEach((x) => x.addEventListener('input', render));
  render();
  main.replaceChildren(
    header('Документы', el('button', { type: 'button', class: 'btn btn-primary', onclick: () => uploadDocument(dms) }, '+ Загрузить документ')),
    el('p', { class: 'hint' }, `Номер присваивается автоматически по шаблону «${dms.numberTemplate}», имя файла — по шаблону «${dms.fileTemplate}». Справочники и шаблоны настраиваются в «Настройках сайта» → «Документы (DMS)».`),
    el('div', { class: 'filters' }, q, fType, fDept, fAccess),
    el('div', { class: 'table-wrap' }, el('table', { class: 'table' },
      el('thead', null, el('tr', null, ['Номер', 'Название', 'Тип', 'Направление', 'Дата', 'Доступ', 'Версия', 'Файл'].map((t) => el('th', null, t)))), tbody)),
  );
}

function uploadDocument(dms) {
  const m = { type: '', dept: '', doc_date: new Date().toISOString().slice(0, 10), title: '', owner: state.user.name || '', client: '', access: 'internal', description: '', tags: '' };
  const file = el('input', { type: 'file', required: true });
  const preview = el('div', { class: 'doc-preview' }, 'Выберите тип, направление и дату — здесь появится номер документа.');
  const updatePreview = debounce(async () => {
    if (!m.type || !m.dept || !m.doc_date) return;
    const originalName = file.files[0]?.name || '';
    let r;
    try {
      r = await api('POST', '/documents/preview', { type: m.type, dept: m.dept, date: m.doc_date, title: m.title, originalName });
    } catch {
      // запасной расчёт в браузере (без учёта счётчика)
      const number = formatNumber(dms.numberTemplate, { type: m.type, dept: m.dept, date: m.doc_date, seq: '?' });
      r = { number, filename: formatFilename(dms.fileTemplate, { number, version: 1, title: m.title, type: m.type, dept: m.dept, date: m.doc_date, originalName }) };
    }
    preview.replaceChildren(el('div', null, 'Номер: ', el('strong', { class: 'mono' }, r.number)), el('div', null, 'Имя файла: ', el('span', { class: 'mono' }, r.filename)));
  });
  const sel = (key, opts) => el('select', { required: true, onchange: (e) => { m[key] = e.target.value; updatePreview(); } }, el('option', { value: '' }, '— выберите —'), opts);
  const inp = (key, extra = {}) => el('input', { value: m[key], ...extra, oninput: (e) => { m[key] = e.target.value; updatePreview(); } });
  file.addEventListener('change', updatePreview);
  const submit = el('button', { type: 'submit', class: 'btn btn-primary' }, 'Загрузить');
  const form = el('form', {
    class: 'fields doc-form', onsubmit: async (e) => {
      e.preventDefault();
      if (!file.files[0]) { toast('Выберите файл', 'err'); return; }
      submit.disabled = true;
      submit.textContent = 'Загрузка…';
      try {
        const fd = new FormData();
        fd.append('meta', JSON.stringify(m));
        fd.append('file', file.files[0]);
        const d = await api('POST', '/documents', fd);
        toast(`Документ ${d.number} загружен`);
        dlg.close();
        location.hash = `#/documents/${d.id}`;
      } catch (err) { toast(err.message, 'err'); submit.disabled = false; submit.textContent = 'Загрузить'; }
    },
  },
  el('div', { class: 'grid2' },
    fieldWrap({ title: 'Тип документа *' }, sel('type', (dms.types || []).map((t) => el('option', { value: t.code }, `${t.name} (${t.code})`)))),
    fieldWrap({ title: 'Направление *' }, sel('dept', (dms.departments || []).map((t) => el('option', { value: t.code }, `${t.name} (${t.code})`)))),
    fieldWrap({ title: 'Дата документа *' }, inp('doc_date', { type: 'date', required: true })),
    fieldWrap({ title: 'Уровень доступа *' }, el('select', { value: m.access, onchange: (e) => { m.access = e.target.value; } }, Object.entries(ACCESS).map(([k, v]) => el('option', { value: k }, v))))),
  fieldWrap({ title: 'Название *' }, inp('title', { required: true, maxlength: 200 })),
  el('div', { class: 'grid2' }, fieldWrap({ title: 'Владелец / автор' }, inp('owner')), fieldWrap({ title: 'Клиент / проект' }, inp('client'))),
  fieldWrap({ title: 'Краткое описание' }, el('textarea', { rows: 2, oninput: (e) => { m.description = e.target.value; } })),
  fieldWrap({ title: 'Теги', description: 'Через запятую' }, inp('tags')),
  fieldWrap({ title: 'Файл *', description: 'PDF, Word, Excel, PowerPoint и др., до 25 МБ' }, file),
  preview,
  el('div', { class: 'row' }, submit));
  const dlg = modal('Загрузка документа', form, { wide: true });
}

async function viewDocument(main, id, typeName, deptName) {
  const d = await api('GET', `/documents/${id}`);
  const m = { title: d.title, description: d.description, owner: d.owner, client: d.client, access: d.access, tags: d.tags };
  const inp = (key) => el('input', { value: m[key] || '', oninput: (e) => { m[key] = e.target.value; setDirty(); } });
  const save = async () => {
    try { await api('PATCH', `/documents/${id}`, m); setDirty(false); toast('Сохранено'); router(); } catch (e) { toast(e.message, 'err'); }
  };
  state.save = save;
  const vFile = el('input', { type: 'file' });
  const vNote = el('input', { placeholder: 'Что изменилось' });
  const addVersion = async () => {
    if (!vFile.files[0]) { toast('Выберите файл', 'err'); return; }
    try {
      const fd = new FormData();
      fd.append('file', vFile.files[0]);
      fd.append('note', vNote.value);
      const r = await api('POST', `/documents/${id}/versions`, fd);
      toast(`Загружена версия v${r.version}`);
      router();
    } catch (e) { toast(e.message, 'err'); }
  };
  const del = async () => {
    if (!confirm(`Удалить документ ${d.number} со всеми версиями? Номер повторно не используется.`)) return;
    try { await api('DELETE', `/documents/${id}`); toast('Удалено'); location.hash = '#/documents'; } catch (e) { toast(e.message, 'err'); }
  };
  const row = (t, v) => [el('dt', null, t), el('dd', null, v)];
  main.replaceChildren(
    header(d.number, el('a', { class: 'btn', href: '#/documents' }, '← К списку'), el('a', { class: 'btn', href: `/api/admin/documents/${id}/download` }, '⬇ Скачать текущую версию')),
    el('section', { class: 'panel' }, el('h2', null, 'Карточка документа'),
      el('dl', { class: 'dl' },
        row('Номер', el('span', { class: 'mono' }, d.number)), row('Тип', typeName(d.type)), row('Направление', deptName(d.dept)),
        row('Дата документа', fmtDateShort(d.doc_date)), row('Создан', `${fmtDateTime(d.created_at)} · ${d.created_by}`),
        row('Изменён', `${fmtDateTime(d.updated_at)} · ${d.updated_by}`)),
      el('p', { class: 'hint' }, 'Тип, направление и дата определяют номер и после загрузки не меняются.'),
      el('div', { class: 'fields' },
        fieldWrap({ title: 'Название' }, inp('title')),
        el('div', { class: 'grid2' }, fieldWrap({ title: 'Владелец / автор' }, inp('owner')), fieldWrap({ title: 'Клиент / проект' }, inp('client'))),
        fieldWrap({ title: 'Описание' }, el('textarea', { rows: 2, value: m.description || '', oninput: (e) => { m.description = e.target.value; setDirty(); } })),
        el('div', { class: 'grid2' },
          fieldWrap({ title: 'Теги' }, inp('tags')),
          fieldWrap({ title: 'Уровень доступа', description: d.access === 'public' ? 'Документ доступен для скачивания на странице «Аналитика»' : '' },
            el('select', { value: m.access, onchange: (e) => { m.access = e.target.value; setDirty(); } }, Object.entries(ACCESS).map(([k, v]) => el('option', { value: k }, v))))))),
    el('section', { class: 'panel' }, el('h2', null, 'Версии'),
      el('div', { class: 'table-wrap' }, el('table', { class: 'table' },
        el('thead', null, el('tr', null, ['Версия', 'Файл', 'Размер', 'Загружен', 'Комментарий', ''].map((t) => el('th', null, t)))),
        el('tbody', null, d.versions.map((v) => el('tr', null,
          el('td', { 'data-label': 'Версия' }, `v${v.version}`),
          el('td', { 'data-label': 'Файл', class: 'mono small' }, v.filename, el('div', { class: 'muted' }, `исходное имя: ${v.original_name}`)),
          el('td', { 'data-label': 'Размер' }, fmtBytes(v.size)),
          el('td', { 'data-label': 'Загружен' }, `${fmtDateTime(v.uploaded_at)} · ${v.uploaded_by}`),
          el('td', { 'data-label': 'Комментарий' }, v.note),
          el('td', null, el('a', { href: `/api/admin/documents/${id}/download?v=${v.version}` }, 'Скачать'))))))),
      el('h3', null, 'Загрузить новую версию'),
      el('div', { class: 'row' }, vFile, vNote, el('button', { type: 'button', class: 'btn', onclick: addVersion }, 'Загрузить версию'))),
    saveBar([isAdmin() ? el('button', { type: 'button', class: 'btn btn-danger-ghost', onclick: del }, 'Удалить документ') : null,
      el('button', { type: 'button', class: 'btn btn-primary', onclick: save }, 'Сохранить')]),
  );
}

// ---------- заявки ----------
async function viewSubmissions(main) {
  const [list, form] = await Promise.all([api('GET', '/submissions'), api('GET', '/docs/form:contact')]);
  const fields = form.data.fields || [];
  const label = (k) => (fields.find((f) => f.name === k)?.label || k).replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  const filter = el('select', { 'aria-label': 'Показать', onchange: () => render() },
    el('option', { value: 'new' }, 'Новые'), el('option', { value: 'done' }, 'Обработанные'), el('option', { value: 'spam' }, 'Спам'), el('option', { value: '' }, 'Все'));
  filter.value = list.some((s) => s.status === 'new') ? 'new' : '';
  const box = el('div', { class: 'subs' });
  const setStatus = async (s, status) => {
    try { await api('PATCH', `/submissions/${s.id}`, { status }); s.status = status; render(); refreshCounts(); } catch (e) { toast(e.message, 'err'); }
  };
  const render = () => {
    const rows = list.filter((s) => !filter.value || s.status === filter.value);
    box.replaceChildren(...rows.map((s) => el('article', { class: `sub sub-${s.status}` },
      el('header', null, el('strong', null, fmtDateTime(s.created_at)), el('span', { class: `badge badge-${s.status}` }, { new: 'Новая', done: 'Обработана', spam: 'Спам' }[s.status]),
        s.meta?.country ? el('span', { class: 'muted small' }, s.meta.country) : null),
      el('dl', { class: 'dl' }, Object.entries(s.data).filter(([, v]) => v).map(([k, v]) => [el('dt', null, label(k)),
        el('dd', null, k === 'email' ? el('a', { href: `mailto:${v}` }, v) : k === 'phone' ? el('a', { href: `tel:${v}` }, v) : v)])),
      el('div', { class: 'row row-sm' },
        s.status !== 'done' ? el('button', { type: 'button', class: 'btn btn-sm', onclick: () => setStatus(s, 'done') }, '✓ Обработана') : el('button', { type: 'button', class: 'btn btn-sm', onclick: () => setStatus(s, 'new') }, 'Вернуть в новые'),
        s.status !== 'spam' ? el('button', { type: 'button', class: 'btn btn-sm', onclick: () => setStatus(s, 'spam') }, 'Спам') : null,
        el('button', {
          type: 'button', class: 'btn btn-sm btn-danger-ghost', onclick: async () => {
            if (!confirm('Удалить заявку?')) return;
            try { await api('DELETE', `/submissions/${s.id}`); list.splice(list.indexOf(s), 1); render(); refreshCounts(); } catch (e) { toast(e.message, 'err'); }
          },
        }, 'Удалить')))));
    if (!rows.length) box.append(el('p', { class: 'empty' }, 'Заявок нет.'));
  };
  render();
  main.replaceChildren(header('Заявки', filter, el('a', { class: 'btn', href: '/api/admin/submissions/export.csv' }, 'Выгрузить в Excel (CSV)')), box);
}

// ---------- пользователи и аккаунт ----------
function genPassword() {
  const abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const a = crypto.getRandomValues(new Uint8Array(14));
  return Array.from(a.slice(0, 10), (b) => abc[b % abc.length]).join('') + Array.from(a.slice(10), (b) => b % 10).join('');
}

async function viewUsers(main) {
  const list = await api('GET', '/users');
  const roleSel = (value, onchange) => el('select', { value, onchange, 'aria-label': 'Роль' }, el('option', { value: 'editor' }, 'Редактор'), el('option', { value: 'admin' }, 'Администратор'));
  const nu = { email: '', name: '', role: 'editor', password: genPassword() };
  const showSecret = (title, lines) => modal(title, el('div', null, el('p', null, 'Данные для входа на ', el('code', null, `${location.origin}/admin`), ':'),
    el('pre', { class: 'mono big' }, lines.join('\n')), el('p', { class: 'hint' }, 'Пароль больше нигде не показывается — передайте его пользователю. Сменить его можно в разделе «Мой аккаунт».')));
  main.replaceChildren(
    header('Пользователи'),
    el('p', { class: 'hint' }, 'Администратор управляет всем, включая настройки, пользователей и удаление документов. Редактор — тексты, статьи, медиатека, документы и заявки.'),
    el('div', { class: 'table-wrap' }, el('table', { class: 'table' },
      el('thead', null, el('tr', null, ['E-mail', 'Имя', 'Роль', 'Последний вход', ''].map((t) => el('th', null, t)))),
      el('tbody', null, list.map((u) => el('tr', null,
        el('td', { 'data-label': 'E-mail' }, u.email), el('td', { 'data-label': 'Имя' }, u.name),
        el('td', { 'data-label': 'Роль' }, roleSel(u.role, async (e) => { try { await api('PATCH', `/users/${u.id}`, { role: e.target.value }); toast('Роль изменена'); } catch (err) { toast(err.message, 'err'); router(); } })),
        el('td', { 'data-label': 'Последний вход' }, fmtDateTime(u.last_login) || '—'),
        el('td', null, el('div', { class: 'row row-sm' },
          el('button', {
            type: 'button', class: 'btn btn-sm', onclick: async () => {
              if (!confirm(`Задать пользователю ${u.email} новый пароль?`)) return;
              const p = genPassword();
              try { await api('PATCH', `/users/${u.id}`, { password: p }); showSecret('Новый пароль', [u.email, p]); } catch (e) { toast(e.message, 'err'); }
            },
          }, 'Сбросить пароль'),
          u.id !== state.user.id ? el('button', {
            type: 'button', class: 'btn btn-sm btn-danger-ghost', onclick: async () => {
              if (!confirm(`Удалить пользователя ${u.email}?`)) return;
              try { await api('DELETE', `/users/${u.id}`); toast('Удалён'); router(); } catch (e) { toast(e.message, 'err'); }
            },
          }, 'Удалить') : null))))))),
    el('section', { class: 'panel' }, el('h2', null, 'Добавить пользователя'),
      el('form', {
        class: 'fields', onsubmit: async (e) => {
          e.preventDefault();
          try { const u = await api('POST', '/users', nu); showSecret('Пользователь создан', [u.email, nu.password]); router(); } catch (err) { toast(err.message, 'err'); }
        },
      },
      el('div', { class: 'grid2' },
        fieldWrap({ title: 'E-mail' }, el('input', { type: 'email', required: true, oninput: (e) => { nu.email = e.target.value; } })),
        fieldWrap({ title: 'Имя' }, el('input', { oninput: (e) => { nu.name = e.target.value; } })),
        fieldWrap({ title: 'Роль' }, roleSel(nu.role, (e) => { nu.role = e.target.value; })),
        fieldWrap({ title: 'Временный пароль', description: 'Не короче 10 символов, буквы и цифры' }, el('input', { value: nu.password, oninput: (e) => { nu.password = e.target.value; } }))),
      el('div', { class: 'row' }, el('button', { type: 'submit', class: 'btn btn-primary' }, 'Создать')))),
  );
}

function viewAccount(main) {
  const f = { old: '', new: '', new2: '' };
  const inp = (k, label) => fieldWrap({ title: label }, el('input', { type: 'password', autocomplete: k === 'old' ? 'current-password' : 'new-password', required: true, oninput: (e) => { f[k] = e.target.value; } }));
  main.replaceChildren(
    header('Мой аккаунт'),
    el('section', { class: 'panel' }, el('p', null, `${state.user.email} · ${state.user.role === 'admin' ? 'администратор' : 'редактор'}`),
      el('h2', null, 'Сменить пароль'),
      el('form', {
        class: 'fields narrow-form', onsubmit: async (e) => {
          e.preventDefault();
          if (f.new !== f.new2) { toast('Пароли не совпадают', 'err'); return; }
          try { await api('POST', '/password', { old: f.old, new: f.new }); toast('Пароль изменён'); e.target.reset(); } catch (err) { toast(err.message, 'err'); }
        },
      }, inp('old', 'Текущий пароль'), inp('new', 'Новый пароль'), inp('new2', 'Новый пароль ещё раз'),
      el('div', { class: 'row' }, el('button', { type: 'submit', class: 'btn btn-primary' }, 'Сменить пароль')))),
  );
}

async function viewSchemas(main) {
  const schemas = await loadSchemas();
  const label = (n) => DOC_TITLES[n] || TYPE_TITLES[n]?.[0] || n;
  const pick = el('select', { 'aria-label': 'Схема', onchange: () => show() }, Object.keys(schemas).map((n) => el('option', { value: n }, `${label(n)}${schemas[n].custom ? ' (изменена)' : ''}`)));
  const ta = el('textarea', { class: 'mono raw-json', rows: 28, spellcheck: 'false', oninput: () => setDirty() });
  const status = el('div', { class: 'hint' });
  const show = () => {
    ta.value = JSON.stringify(schemas[pick.value].schema, null, 2);
    status.textContent = schemas[pick.value].custom ? 'Схема изменена в админке.' : 'Стандартная схема.';
    setDirty(false);
  };
  const put = async (schema, msg) => {
    try { schemas[pick.value] = await api('PUT', `/schemas/${encodeURIComponent(pick.value)}`, { schema }); setDirty(false); toast(msg); show(); } catch (e) { toast(e.message, 'err'); }
  };
  const save = async () => {
    let schema;
    try { schema = JSON.parse(ta.value); } catch (e) { toast(`Ошибка JSON: ${e.message}`, 'err'); return; }
    await put(schema, 'Схема сохранена');
  };
  state.save = save;
  show();
  main.replaceChildren(
    header('Схемы контента (JSON Schema)'),
    el('p', { class: 'hint' }, 'По этим схемам строятся формы редактирования. Здесь можно переименовать поля (title), поменять подсказки (description), варианты списков (enum) и порядок полей. Разметка schema.org для поисковиков редактируется в блоке «SEO и разметка schema.org» каждой страницы.'),
    el('div', { class: 'row' }, pick, el('a', { class: 'btn', href: '/api/admin/export' }, 'Скачать резервную копию контента (JSON)')),
    ta, status,
    saveBar([el('button', { type: 'button', class: 'btn btn-danger-ghost', onclick: () => { if (confirm('Вернуть стандартную схему?')) put(null, 'Схема сброшена'); } }, 'Сбросить к стандартной'),
      el('button', { type: 'button', class: 'btn btn-primary', onclick: save }, 'Сохранить схему')]),
  );
}

// ---------- оболочка, вход, маршрутизация ----------
const NAV = () => [
  ['', [['#/dashboard', 'Обзор']]],
  ['Страницы', Object.keys(PUBLIC_PATH).filter((k) => k.startsWith('page:')).map((k) => [`#/doc/${k}`, DOC_TITLES[k]])],
  ['Контент', Object.entries(TYPE_TITLES).map(([t, [p]]) => [`#/list/${t}`, p])],
  ['Обращения', [['#/submissions', 'Заявки', 'subs'], ['#/doc/form:contact', 'Форма обратной связи']]],
  ['Файлы', [['#/documents', 'Документы (DMS)'], ['#/media', 'Медиатека']]],
  ['Настройки', [
    isAdmin() && ['#/doc/settings', 'Настройки сайта'],
    isAdmin() && ['#/users', 'Пользователи'],
    isAdmin() && ['#/schemas', 'Схемы и резервная копия'],
    ['#/account', 'Мой аккаунт'],
  ].filter(Boolean)],
];

function updateBadges() {
  const b = $('[data-badge="subs"]');
  if (b) { b.textContent = state.counts.newSubmissions || ''; b.hidden = !state.counts.newSubmissions; }
}
async function refreshCounts() {
  try { state.counts = (await api('GET', '/me')).counts; updateBadges(); } catch { /* не критично */ }
}

function renderShell() {
  const app = $('#app');
  if ($('.shell', app)) return;
  const nav = el('nav', { class: 'side-nav', 'aria-label': 'Разделы' }, NAV().map(([group, items]) => el('div', { class: 'nav-group' },
    group ? el('div', { class: 'nav-group-title' }, group) : null,
    items.map(([href, label, badge]) => el('a', { href, 'data-href': href }, label, badge ? el('span', { class: 'nav-badge', 'data-badge': badge, hidden: true }) : null)))));
  app.replaceChildren(el('div', { class: 'shell' },
    el('aside', { class: 'sidebar' },
      el('div', { class: 'side-head' },
        el('button', { type: 'button', class: 'menu-btn', 'aria-label': 'Меню', onclick: () => document.body.classList.toggle('menu-open') }, '☰'),
        el('a', { class: 'side-brand', href: '#/dashboard' }, state.siteName || 'Сайт', el('small', null, 'управление сайтом'))),
      nav,
      el('div', { class: 'side-foot' },
        el('a', { href: '/', target: '_blank' }, 'Открыть сайт ↗'),
        el('button', {
          type: 'button', class: 'linklike', onclick: async () => {
            if (state.dirty && !confirm('Есть несохранённые изменения. Выйти?')) return;
            await api('POST', '/logout').catch(() => {});
            state.user = null;
            setDirty(false);
            renderLogin();
          },
        }, `Выйти (${state.user.email})`))),
    el('main', { id: 'main', class: 'main', tabindex: '-1' })));
  updateBadges();
}

function highlightNav(rawHash) {
  const hash = rawHash.replace(/\/(kk|en):/, '/').replace(/^(#\/entry\/[a-z]+\/[0-9a-f]+)\/(kk|en)$/, '$1');
  document.querySelectorAll('.side-nav a').forEach((a) => {
    const h = a.dataset.href;
    const listOf = h.startsWith('#/list/') && hash.startsWith(h.replace('#/list/', '#/entry/') + '/');
    a.classList.toggle('active', hash === h || listOf || hash.startsWith(`${h}/`));
  });
}

async function router() {
  if (!state.user) return;
  const hash = location.hash || '#/dashboard';
  state.lastHash = hash;
  renderShell();
  highlightNav(hash);
  document.body.classList.remove('menu-open');
  const [, view, a, b, c] = hash.split('/');
  const main = $('#main');
  state.save = null;
  state.translating = false;
  setDirty(false);
  main.replaceChildren(el('p', { class: 'muted', style: { padding: '24px' } }, 'Загрузка…'));
  try {
    switch (view) {
      case 'doc': await viewDoc(main, decodeURIComponent(a)); break;
      case 'list': await viewList(main, a); break;
      case 'entry': await viewEntry(main, a, b, c); break;
      case 'media': await viewMedia(main); break;
      case 'documents': await viewDocuments(main, a); break;
      case 'submissions': await viewSubmissions(main); break;
      case 'users': await viewUsers(main); break;
      case 'schemas': await viewSchemas(main); break;
      case 'account': viewAccount(main); break;
      default: await viewDashboard(main);
    }
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  } catch (e) {
    main.replaceChildren(el('div', { class: 'panel error' }, el('h2', null, 'Не удалось открыть раздел'), el('p', null, e.message)));
  }
}

let ignoreHash = false;
window.addEventListener('hashchange', () => {
  if (ignoreHash) { ignoreHash = false; return; }
  if (state.dirty && !confirm('Есть несохранённые изменения. Уйти без сохранения?')) {
    ignoreHash = true;
    location.hash = state.lastHash;
    return;
  }
  router();
});

const authScreen = (title, form) => $('#app').replaceChildren(el('div', { class: 'auth' }, el('div', { class: 'auth-card' }, el('h1', null, title), form)));

function renderLogin() {
  document.body.classList.remove('menu-open');
  const f = { email: '', password: '' };
  const err = el('p', { class: 'form-error', role: 'alert' });
  const btn = el('button', { type: 'submit', class: 'btn btn-primary btn-block' }, 'Войти');
  authScreen('Вход в управление сайтом', el('form', {
    class: 'fields', onsubmit: async (e) => {
      e.preventDefault();
      btn.disabled = true;
      err.textContent = '';
      try { await api('POST', '/login', f); await start(); } catch (x) { err.textContent = x.message; btn.disabled = false; }
    },
  },
  fieldWrap({ title: 'E-mail' }, el('input', { type: 'email', name: 'email', autocomplete: 'username', required: true, autofocus: true, oninput: (e) => { f.email = e.target.value; } })),
  fieldWrap({ title: 'Пароль' }, el('input', { type: 'password', name: 'password', autocomplete: 'current-password', required: true, oninput: (e) => { f.password = e.target.value; } })),
  err, btn));
}

function renderSetup(tokenConfigured) {
  const f = { token: '', email: '', name: '', password: '' };
  const err = el('p', { class: 'form-error', role: 'alert' });
  if (!tokenConfigured) {
    authScreen('Первичная настройка', el('p', null, 'Администратор ещё не создан. Задайте секрет SETUP_TOKEN в настройках Worker (Cloudflare → Workers → Settings → Variables and Secrets) и обновите страницу.'));
    return;
  }
  authScreen('Первичная настройка', el('form', {
    class: 'fields', onsubmit: async (e) => {
      e.preventDefault();
      err.textContent = '';
      try {
        await api('POST', '/setup', f);
        await api('POST', '/login', { email: f.email, password: f.password });
        await start();
      } catch (x) { err.textContent = x.message; }
    },
  },
  el('p', { class: 'hint' }, 'Создайте учётную запись администратора. Код установки — значение секрета SETUP_TOKEN в настройках Worker.'),
  fieldWrap({ title: 'Код установки' }, el('input', { type: 'password', required: true, oninput: (e) => { f.token = e.target.value; } })),
  fieldWrap({ title: 'E-mail' }, el('input', { type: 'email', required: true, oninput: (e) => { f.email = e.target.value; } })),
  fieldWrap({ title: 'Имя' }, el('input', { oninput: (e) => { f.name = e.target.value; } })),
  fieldWrap({ title: 'Пароль', description: 'Не короче 10 символов, буквы и цифры' }, el('input', { type: 'password', autocomplete: 'new-password', required: true, oninput: (e) => { f.password = e.target.value; } })),
  err, el('button', { type: 'submit', class: 'btn btn-primary btn-block' }, 'Создать администратора')));
}

async function start() {
  const me = await api('GET', '/me');
  state.user = me.user;
  state.counts = me.counts;
  state.siteName = me.siteName;
  $('#app').replaceChildren();
  await router();
}

(async function init() {
  try {
    const { user } = await api('GET', '/session');
    if (user) { await start(); return; }
    const setup = await api('GET', '/setup');
    if (setup.needed) renderSetup(setup.tokenConfigured);
    else renderLogin();
  } catch (e) {
    $('#app').replaceChildren(el('p', { class: 'form-error', style: { padding: '24px' } }, `Ошибка загрузки: ${e.message}`));
  }
}());
