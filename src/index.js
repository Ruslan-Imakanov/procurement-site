// Точка входа Cloudflare Worker: публичные страницы, API админки, медиа, документы, форма заявок.

import { Store, parseAppError } from './store.js';
import { b64url, sha256hex, esc, fmtDateShort, overlay, LOCALES, localePrefix } from './lib/util.js';
import {
  homePage, aboutPage, servicesPage, servicePage, insightsPage, articlePage, casesPage, casePage,
  contactPage, customPage, notFoundPage,
} from './render/pages.js';

export { Store };

// Версия файлов админки для сброса кеша браузера (подставляется при сборке)
/* global __ADMIN_VER__ */
const ADMIN_VER = typeof __ADMIN_VER__ !== 'undefined' ? __ADMIN_VER__ : 'dev';
const SESSION_COOKIE = '__Host-sid';
const MAX_DOC = 25 * 1024 * 1024;
const MAX_IMG = 8 * 1024 * 1024;
const IMG_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/gif', 'image/avif'];
const DOC_MIME = {
  pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text', ods: 'application/vnd.oasis.opendocument.spreadsheet',
  txt: 'text/plain', csv: 'text/csv', rtf: 'application/rtf', zip: 'application/zip', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
};

const store = (env) => env.STORE.get(env.STORE.idFromName('main'), { locationHint: env.DO_LOCATION || undefined });

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

// ---------- ответы ----------
const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=31536000',
};

function htmlResponse(html, { status = 200, nonce, headers = {} } = {}) {
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' https://www.googletagmanager.com https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://challenges.cloudflare.com",
    'frame-src https://challenges.cloudflare.com',
    "base-uri 'self'", "form-action 'self'", "frame-ancestors 'self'", "object-src 'none'",
  ].join('; ');
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate', 'Content-Security-Policy': csp, ...SEC_HEADERS, ...headers },
  });
}

const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), {
  status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC_HEADERS, ...headers },
});

function contentDisposition(type, filename) {
  const ascii = filename.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

// ---------- кеш снимка контента ----------
// В памяти изолята — 10 секунд, в Cache API дата-центра — до 5 минут (с фоновым обновлением).
// Cache API работает только на собственном домене; на *.workers.dev остаётся кеш в памяти.
let MEM = null;
const SNAP_KEY = 'https://snapshot.internal/v1';

async function refreshSnapshot(env) {
  const data = await store(env).getSnapshot();
  MEM = { at: Date.now(), data };
  try {
    await caches.default.put(SNAP_KEY, new Response(JSON.stringify(data), { headers: { 'Cache-Control': 'max-age=300', 'X-At': String(Date.now()) } }));
  } catch { /* кеш недоступен */ }
  return data;
}

async function getSnapshot(env, ctx) {
  const t = Date.now();
  if (MEM && t - MEM.at < 10000) return MEM.data;
  try {
    const hit = await caches.default.match(SNAP_KEY);
    if (hit) {
      const at = Number(hit.headers.get('X-At') || 0);
      const data = await hit.json();
      if (t - at > 10000) ctx.waitUntil(refreshSnapshot(env).catch(() => {}));
      MEM = { at: Math.max(at, t - 9000), data };
      return data;
    }
  } catch { /* кеш недоступен */ }
  return refreshSnapshot(env);
}

async function invalidateSnapshot() {
  MEM = null;
  try { await caches.default.delete(SNAP_KEY); } catch { /* нет кеша */ }
}

// Стили и скрипт публичной части встраиваются в каждую страницу; читаем их из статики один раз на изолят.
let SITE_ASSETS = null;
async function siteAssets(env) {
  if (!SITE_ASSETS) {
    const get = (p) => env.ASSETS.fetch(`https://assets.local${p}`).then((r) => (r.ok ? r.text() : ''));
    const [css, js] = await Promise.all([get('/_data/site.css'), get('/_data/site.js')]);
    SITE_ASSETS = { css, js };
  }
  return SITE_ASSETS;
}

function makeCtx(snap, request, extra = {}) {
  const url = new URL(request.url);
  const locale = LOCALES.includes(extra.locale) ? extra.locale : 'ru';
  const prefix = localePrefix(locale);
  const ov = snap.i18n?.[locale];
  if (!snap._byType) {
    const byType = {};
    for (const e of snap.entries) (byType[e.type] ||= []).push(e);
    Object.defineProperty(snap, '_byType', { value: byType, enumerable: false });
  }
  const docCache = {};
  const doc = (k) => (k in docCache ? docCache[k] : (docCache[k] = ov?.docs?.[k] ? overlay(snap.docs[k] || {}, ov.docs[k], true) : snap.docs[k] || {}));
  const entCache = {};
  const entries = (t) => entCache[t] || (entCache[t] = (snap._byType[t] || []).map((e) => (ov?.entries?.[e.id] ? { ...e, data: overlay(e.data, ov.entries[e.id], true) } : e)));
  const geo = (url.searchParams.get('geo') || '').toUpperCase();
  const override = /^[A-Z]{2}$/.test(geo);
  const origin = (snap.docs.settings?.siteUrl || url.origin).replace(/\/+$/, '');
  return {
    snap, url, locale, prefix, origin,
    settings: doc('settings'),
    base: origin + prefix,
    nonce: b64url(crypto.getRandomValues(new Uint8Array(12))),
    country: override ? geo : String(request.cf?.country || '').toUpperCase(),
    continent: override ? '' : String(request.cf?.continent || '').toUpperCase(),
    preview: false,
    entries, doc,
    ...extra,
  };
}

// ---------- сессии ----------
function getCookie(request, name) {
  const m = (request.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${name.replace(/[$-]/g, '\\$&')}=([^;]+)`));
  return m ? m[1] : '';
}
const sessionCookie = (token, maxAge) => `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;

async function currentUser(request, env) {
  const token = getCookie(request, SESSION_COOKIE);
  return token ? store(env).session(token) : null;
}

// ---------- публичная часть ----------
async function renderPublic(request, env, ctx, url) {
  const [snap, assets] = await Promise.all([getSnapshot(env, ctx), siteAssets(env)]);
  let path = url.pathname;
  let locale = 'ru';
  const lm = /^\/(kk|en)(\/.*)?$/.exec(path);
  if (lm) { locale = lm[1]; path = lm[2] || '/'; }
  const wantsPreview = url.searchParams.has('preview');
  const user = wantsPreview ? await currentUser(request, env) : null;
  const c = makeCtx(snap, request, { preview: !!user, assets, locale });
  const find = (type, slug) => c.entries(type).find((e) => e.slug === slug);
  const parts = path.split('/').filter(Boolean);
  let html = null;

  if (path === '/') html = homePage(c);
  else if (path === '/about') html = aboutPage(c);
  else if (path === '/services') html = servicesPage(c);
  else if (parts[0] === 'services' && parts.length === 2) { const e = find('service', parts[1]); if (e) html = servicePage(c, e); }
  else if (path === '/insights') html = insightsPage(c, url.searchParams.get('topic') || '');
  else if (parts[0] === 'insights' && parts.length === 2) { const e = find('article', parts[1]); if (e) html = articlePage(c, e); }
  else if (path === '/cases' && (c.settings.casesEnabled || c.preview)) html = casesPage(c);
  else if (parts[0] === 'cases' && parts.length === 2 && (c.settings.casesEnabled || c.preview)) { const e = find('case', parts[1]); if (e) html = casePage(c, e); }
  else if (path === '/contact') html = contactPage(c, { sent: url.searchParams.get('sent') === '1', error: url.searchParams.get('error') ? (c.doc('form:contact').errorText || '') : '' });
  else if (parts.length === 1) { const e = find('page', parts[0]); if (e) html = customPage(c, e); }

  if (!html) return htmlResponse(notFoundPage(c), { status: 404, nonce: c.nonce });
  return htmlResponse(html, { nonce: c.nonce, headers: c.preview ? { 'Cache-Control': 'no-store' } : {} });
}

// Предпросмотр черновика записи из админки
async function renderPreview(request, env, ctx, type, id) {
  const user = await currentUser(request, env);
  if (!user) return Response.redirect(new URL('/admin', request.url).toString(), 302);
  const [snap, assets] = await Promise.all([getSnapshot(env, ctx), siteAssets(env)]);
  const entry = await store(env).getEntry(id);
  const c = makeCtx(snap, request, { preview: true, assets });
  const r = { service: servicePage, article: articlePage, case: casePage, page: customPage }[type];
  if (!r || entry.type !== type) return htmlResponse(notFoundPage(c), { status: 404, nonce: c.nonce });
  // подменяем запись в снимке, чтобы связанные блоки тоже видели черновик
  const list = c.entries(type);
  const merged = { ...entry, data: entry.data };
  c.entries = (t) => (t === type ? [...list.filter((x) => x.id !== id), merged] : snap._byType[t] || []);
  return htmlResponse(r(c, merged), { nonce: c.nonce, headers: { 'Cache-Control': 'no-store' } });
}

function sitemap(snap, base) {
  const s = snap.docs.settings;
  const urls = [['/', ''], ['/about', ''], ['/services', ''], ['/insights', ''], ['/contact', '']];
  const by = (t) => snap.entries.filter((e) => e.type === t);
  for (const e of by('service')) urls.push([`/services/${e.slug}`, e.updated_at]);
  for (const e of by('article')) urls.push([`/insights/${e.slug}`, e.updated_at]);
  for (const e of by('page')) if (!e.data.seo?.noindex) urls.push([`/${e.slug}`, e.updated_at]);
  if (s.casesEnabled) {
    urls.push(['/cases', '']);
    for (const e of by('case')) urls.push([`/cases/${e.slug}`, e.updated_at]);
  }
  const loc = (l, p) => base + localePrefix(l) + (p === '/' && l !== 'ru' ? '' : p);
  const out = [];
  for (const [p, m] of urls) {
    const alts = LOCALES.map((l) => `<xhtml:link rel="alternate" hreflang="${l}" href="${esc(loc(l, p))}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(loc('ru', p))}"/>`;
    for (const l of LOCALES) out.push(`<url><loc>${esc(loc(l, p))}</loc>${m ? `<lastmod>${m.slice(0, 10)}</lastmod>` : ''}${alts}</url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${out.join('\n')}\n</urlset>`;
}

function robots(snap, base) {
  const s = snap.docs.settings;
  if (!s.indexing) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nDisallow: /admin\nDisallow: /api/\nDisallow: /__preview/\n${s.seo?.robotsExtra ? s.seo.robotsExtra.trim() + '\n' : ''}\nSitemap: ${base}/sitemap.xml\n`;
}

// ---------- форма обратной связи ----------
async function handleContact(request, env, ctx) {
  const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
  let loc = 'ru';
  const back = (q) => Response.redirect(new URL(`${localePrefix(loc)}/contact?${q}#form-status`, request.url).toString(), 303);
  const fail = (msg, status = 400) => (wantsJson ? json({ error: msg }, status) : back('error=1'));
  const s = store(env);
  const snap = await getSnapshot(env, ctx);
  let form = snap.docs['form:contact'] || {};
  const settings = snap.docs.settings || {};
  let fd;
  try { fd = await request.formData(); } catch { return fail(form.errorText || 'Ошибка формы'); }
  const lang = String(fd.get('lang') || '');
  if (LOCALES.includes(lang) && lang !== 'ru') {
    loc = lang;
    const o = snap.i18n?.[lang]?.docs?.['form:contact'];
    if (o) form = overlay(form, o, true);
  }

  // ловушки для ботов: скрытое поле и слишком быстрая отправка — делаем вид, что всё хорошо
  const t = Number(fd.get('_t') || 0);
  if (fd.get('website') || (t && Date.now() - t < 2500)) return wantsJson ? json({ ok: true }) : back('sent=1');

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  if (!(await s.rateHit(`contact:${ip}`, 10, 600))) return fail('Слишком много заявок подряд. Попробуйте через 10 минут', 429);

  if (settings.notifications?.turnstileSiteKey && env.TURNSTILE_SECRET) {
    const body = new FormData();
    body.append('secret', env.TURNSTILE_SECRET);
    body.append('response', String(fd.get('cf-turnstile-response') || ''));
    body.append('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body }).then((x) => x.json()).catch(() => ({}));
    if (!r.success) return fail('Подтвердите, что вы не робот');
  }

  const data = {};
  for (const f of form.fields || []) {
    if (!f.name) continue;
    let v = String(fd.get(f.name) ?? '').trim().slice(0, f.type === 'textarea' ? 5000 : 300);
    if (f.type === 'checkbox') v = v ? 'да' : '';
    if (f.required && !v) return fail(`${f.label.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')}: ${form.requiredText || 'обязательное поле'}`);
    if (v && f.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return fail(`${f.label}: неверный адрес`);
    if (f.type === 'select' && v) {
      const opts = String(f.options || '').split('\n').map((x) => x.trim()).filter(Boolean);
      if (!opts.includes(v)) v = '';
    }
    data[f.name] = v;
  }
  const meta = {
    ip_hash: (await sha256hex(ip + (env.IP_SALT || 'salt'))).slice(0, 16),
    country: request.cf?.country || '', ua: (request.headers.get('User-Agent') || '').slice(0, 200),
    referer: (request.headers.get('Referer') || '').slice(0, 300),
  };
  await s.addSubmission(data, meta);
  ctx.waitUntil(notify(env, settings, form, data).catch((e) => console.error('notify', e)));
  return wantsJson ? json({ ok: true }) : back('sent=1');
}

async function notify(env, settings, form, data) {
  const n = settings.notifications || {};
  const label = (k) => (form.fields || []).find((f) => f.name === k)?.label?.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') || k;
  const lines = Object.entries(data).filter(([, v]) => v).map(([k, v]) => `${label(k)}: ${v}`);
  const subject = `Новая заявка с сайта ${settings.siteName || ''}`.trim();
  const jobs = [];
  if (env.RESEND_API_KEY && n.email) {
    jobs.push(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: n.emailFrom || 'Сайт <onboarding@resend.dev>', to: n.email.split(/[,;\s]+/).filter(Boolean), subject,
        text: lines.join('\n'), reply_to: data.email || undefined,
      }),
    }));
  }
  if (env.TELEGRAM_BOT_TOKEN && n.telegramChatId) {
    jobs.push(fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: n.telegramChatId, text: `${subject}\n\n${lines.join('\n')}`.slice(0, 4000) }),
    }));
  }
  await Promise.all(jobs);
}

// ---------- API админки ----------
async function readJson(request) {
  try { return await request.json(); } catch { throw new HttpError(400, 'Неверный JSON'); }
}

async function adminApi(request, env, ctx, url) {
  const s = store(env);
  const method = request.method;
  const p = url.pathname.replace(/^\/api\/admin/, '') || '/';
  const seg = p.split('/').filter(Boolean);

  // защита от CSRF: изменяющие запросы — только из нашей админки (свой заголовок + тот же Origin)
  if (method !== 'GET' && method !== 'HEAD') {
    const origin = request.headers.get('Origin');
    if (request.headers.get('X-Requested-With') !== 'admin' || (origin && origin !== url.origin)) throw new HttpError(403, 'Запрос отклонён');
  }

  // --- без входа ---
  if (p === '/setup' && method === 'GET') return json({ needed: !(await s.hasUsers()), tokenConfigured: !!env.SETUP_TOKEN });
  if (p === '/setup' && method === 'POST') {
    const b = await readJson(request);
    if (!env.SETUP_TOKEN) throw new HttpError(400, 'Секрет SETUP_TOKEN не задан в настройках Worker');
    if (b.token !== env.SETUP_TOKEN) throw new HttpError(403, 'Неверный код установки');
    const user = await s.createUser({ email: b.email, name: b.name, role: 'admin', password: b.password }, { bootstrap: true });
    return json({ user });
  }
  if (p === '/login' && method === 'POST') {
    const b = await readJson(request);
    const r = await s.login(b.email, b.password, request.headers.get('CF-Connecting-IP') || '0.0.0.0');
    return json({ user: r.user }, 200, { 'Set-Cookie': sessionCookie(r.token, 14 * 24 * 3600) });
  }
  if (p === '/session' && method === 'GET') return json({ user: await currentUser(request, env) });
  if (p === '/logout' && method === 'POST') {
    await s.logout(getCookie(request, SESSION_COOKIE));
    return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) });
  }

  // --- дальше только с входом ---
  const user = await currentUser(request, env);
  if (!user) throw new HttpError(401, 'Требуется вход');
  const adminOnly = () => { if (user.role !== 'admin') throw new HttpError(403, 'Доступно только администратору'); };
  const changed = async (r) => { await invalidateSnapshot(); return json(r); };

  if (p === '/me') return json({ user, counts: await s.counts(), siteName: (await s.getDoc('settings')).siteName });
  if (p === '/password' && method === 'POST') { const b = await readJson(request); return json(await s.changePassword(user.id, b.old, b.new)); }

  // схемы
  if (p === '/schemas' && method === 'GET') return json(await s.getSchemas());
  if (seg[0] === 'schemas' && seg[1] && method === 'PUT') { adminOnly(); const b = await readJson(request); return json(await s.putSchema(seg[1], b.schema ?? null, user)); }

  // одиночные документы
  if (seg[0] === 'docs' && seg[1]) {
    const key = decodeURIComponent(seg[1]);
    if (method === 'GET') return json({ key, data: /^(kk|en):/.test(key) ? await s.getTranslation(key) : await s.getDoc(key) });
    if (method === 'PUT') { if (/(^|:)settings$/.test(key)) adminOnly(); const b = await readJson(request); return changed({ key, data: await s.putDoc(key, b.data, user) }); }
  }

  // коллекции
  if (seg[0] === 'entries') {
    if (seg[1] === 'reorder' && method === 'POST') { const b = await readJson(request); return changed(await s.reorderEntries(b.type, b.ids || [])); }
    if (!seg[1] && method === 'GET') return json(await s.listEntries(url.searchParams.get('type') || ''));
    if (!seg[1] && method === 'POST') { const b = await readJson(request); return changed(await s.saveEntry(b, user)); }
    if (seg[1] && method === 'GET') return json(await s.getEntry(seg[1]));
    if (seg[1] && method === 'DELETE') return changed(await s.deleteEntry(seg[1]));
  }

  // медиатека
  if (seg[0] === 'media') {
    if (!seg[1] && method === 'GET') return json(await s.listMedia());
    if (!seg[1] && method === 'POST') {
      const fd = await request.formData();
      const meta = JSON.parse(String(fd.get('meta') || '{}'));
      const variants = [];
      for (const v of meta.variants || []) {
        const file = fd.get(v.field);
        if (!file || typeof file === 'string') throw new HttpError(400, 'Нет файла');
        if (!IMG_TYPES.includes(file.type)) throw new HttpError(400, `Формат ${file.type || '?'} не поддерживается. Загрузите JPG, PNG, WebP, SVG или GIF`);
        if (file.size > MAX_IMG) throw new HttpError(400, 'Изображение больше 8 МБ');
        variants.push({ w: Number(v.w) || 0, h: Number(v.h) || 0, mime: file.type, bytes: new Uint8Array(await file.arrayBuffer()) });
      }
      return changed(await s.putMedia({ name: meta.name, alt: meta.alt, variants }, user));
    }
    if (seg[1] && method === 'PATCH') { const b = await readJson(request); return changed(await s.updateMedia(seg[1], b)); }
    if (seg[1] && method === 'DELETE') return changed(await s.deleteMedia(seg[1]));
  }

  // документы (DMS)
  if (seg[0] === 'documents') {
    if (!seg[1] && method === 'GET') return json(await s.listDocuments());
    if (seg[1] === 'preview' && method === 'POST') return json(await s.previewDocument(await readJson(request)));
    if (!seg[1] && method === 'POST') {
      const fd = await request.formData();
      const meta = JSON.parse(String(fd.get('meta') || '{}'));
      return changed(await s.createDocument(meta, await readUpload(fd.get('file')), user));
    }
    if (seg[1] && seg[2] === 'versions' && method === 'POST') {
      const fd = await request.formData();
      return changed(await s.addDocumentVersion(seg[1], await readUpload(fd.get('file')), String(fd.get('note') || ''), user));
    }
    if (seg[1] && seg[2] === 'download' && method === 'GET') {
      const f = await s.getDocumentFile(seg[1], Number(url.searchParams.get('v')) || 0, false);
      if (!f) throw new HttpError(404, 'Файл не найден');
      return new Response(f.bytes, { headers: { 'Content-Type': f.mime, 'Content-Disposition': contentDisposition('attachment', f.filename), 'Cache-Control': 'private, no-store', ...SEC_HEADERS } });
    }
    if (seg[1] && !seg[2] && method === 'GET') return json(await s.getDocument(seg[1]));
    if (seg[1] && !seg[2] && method === 'PATCH') return changed(await s.updateDocument(seg[1], await readJson(request), user));
    if (seg[1] && !seg[2] && method === 'DELETE') { adminOnly(); return changed(await s.deleteDocument(seg[1])); }
  }

  // заявки
  if (seg[0] === 'submissions') {
    if (seg[1] === 'export.csv' && method === 'GET') return submissionsCsv(await s.listSubmissions(), (await s.getDoc('form:contact')).fields || []);
    if (!seg[1] && method === 'GET') return json(await s.listSubmissions());
    if (seg[1] && method === 'PATCH') { const b = await readJson(request); return json(await s.setSubmissionStatus(seg[1], b.status)); }
    if (seg[1] && method === 'DELETE') return json(await s.deleteSubmission(seg[1]));
  }

  // пользователи
  if (seg[0] === 'users') {
    adminOnly();
    if (!seg[1] && method === 'GET') return json(await s.listUsers());
    if (!seg[1] && method === 'POST') return json(await s.createUser(await readJson(request)));
    if (seg[1] && method === 'PATCH') return json(await s.updateUser(seg[1], await readJson(request)));
    if (seg[1] && method === 'DELETE') { if (seg[1] === user.id) throw new HttpError(400, 'Нельзя удалить самого себя'); return json(await s.deleteUser(seg[1])); }
  }

  if (p === '/export' && method === 'GET') {
    adminOnly();
    const data = await s.exportAll();
    return new Response(JSON.stringify(data, null, 2), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': contentDisposition('attachment', `backup-${new Date().toISOString().slice(0, 10)}.json`), 'Cache-Control': 'no-store' } });
  }

  throw new HttpError(404, 'Неизвестный запрос');
}

async function readUpload(file) {
  if (!file || typeof file === 'string') throw new HttpError(400, 'Прикрепите файл');
  if (file.size > MAX_DOC) throw new HttpError(400, 'Файл больше 25 МБ');
  const ext = (file.name.match(/\.([a-z0-9]+)$/i) || [])[1]?.toLowerCase() || '';
  return { name: file.name, mime: DOC_MIME[ext] || 'application/octet-stream', bytes: new Uint8Array(await file.arrayBuffer()) };
}

function submissionsCsv(rows, fields) {
  const cols = fields.filter((f) => f.name).map((f) => [f.name, f.label.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')]);
  const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Дата', 'Статус', ...cols.map((c) => c[1]), 'Страна'];
  const lines = rows.map((r) => [fmtDateShort(r.created_at) + ' ' + r.created_at.slice(11, 16), r.status, ...cols.map((c) => r.data[c[0]]), r.meta?.country].map(q).join(';'));
  return new Response('\ufeff' + [head.map(q).join(';'), ...lines].join('\r\n'), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': contentDisposition('attachment', `zayavki-${new Date().toISOString().slice(0, 10)}.csv`), 'Cache-Control': 'no-store' },
  });
}

function adminShell() {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Управление сайтом</title><meta name="robots" content="noindex, nofollow"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/admin/app.css?v=${ADMIN_VER}"></head><body><div id="app"><p style="padding:24px;font-family:sans-serif">Загрузка…</p></div>
<script src="/admin/app.js?v=${ADMIN_VER}" type="module"></script></body></html>`;
}

const ADMIN_CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self'; frame-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; object-src 'none'";

// ---------- маршрутизация ----------
async function route(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path.startsWith('/api/admin')) return adminApi(request, env, ctx, url);
  if (path === '/api/contact' && method === 'POST') return handleContact(request, env, ctx);
  if (method !== 'GET' && method !== 'HEAD') throw new HttpError(405, 'Метод не поддерживается');

  if (path === '/admin' || (path.startsWith('/admin/') && !path.startsWith('/admin/app.'))) {
    return new Response(adminShell(), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': ADMIN_CSP, ...SEC_HEADERS } });
  }
  if (path.startsWith('/media/')) {
    const key = path.slice(7).replace(/\.[a-z0-9]+$/, '');
    const cache = caches.default;
    const cached = await cache.match(request).catch(() => null);
    if (cached) return cached;
    const blob = await store(env).getMediaBlob(key);
    if (!blob) return new Response('Not found', { status: 404 });
    const res = new Response(blob.bytes, {
      headers: {
        'Content-Type': blob.mime, 'Cache-Control': 'public, max-age=31536000, immutable', ...SEC_HEADERS,
        // SVG открывается как документ — запрещаем в нём скрипты
        ...(blob.mime === 'image/svg+xml' ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox" } : {}),
      },
    });
    ctx.waitUntil(cache.put(request, res.clone()).catch(() => {}));
    return res;
  }
  if (path.startsWith('/files/')) {
    const id = path.split('/')[2] || '';
    const f = await store(env).getDocumentFile(id, 0, true);
    if (!f) return new Response('Not found', { status: 404 });
    return new Response(f.bytes, { headers: { 'Content-Type': f.mime, 'Content-Disposition': contentDisposition('attachment', f.filename), 'Cache-Control': 'public, max-age=300', 'X-Robots-Tag': 'noindex', ...SEC_HEADERS } });
  }
  if (path.startsWith('/__preview/')) {
    const [, , type, id] = path.split('/');
    return renderPreview(request, env, ctx, type, id);
  }
  if (path === '/sitemap.xml' || path === '/robots.txt') {
    const snap = await getSnapshot(env, ctx);
    const base = (snap.docs.settings.siteUrl || url.origin).replace(/\/+$/, '');
    return path === '/robots.txt'
      ? new Response(robots(snap, base), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=300' } })
      : new Response(sitemap(snap, base), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
  }
  if (path.length > 1 && path.endsWith('/')) return Response.redirect(new URL(path.replace(/\/+$/, '') + url.search, url).toString(), 301);
  return renderPublic(request, env, ctx, url);
}

export default {
  async fetch(request, env, ctx) {
    try {
      const res = await route(request, env, ctx);
      return request.method === 'HEAD' ? new Response(null, res) : res;
    } catch (err) {
      const app = parseAppError(err);
      const status = err instanceof HttpError ? err.status : app ? app.status : 500;
      const message = err instanceof HttpError ? err.message : app ? app.message : 'Внутренняя ошибка сервера';
      if (status >= 500) console.error(err?.stack || err);
      const url = new URL(request.url);
      if (url.pathname.startsWith('/api/')) return json({ error: message }, status);
      return new Response(message, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  },
};

