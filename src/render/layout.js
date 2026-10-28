// Каркас страницы: <head> с SEO-тегами, шапка, подвал, уведомление о cookie, скрипт.

import { h, raw, esc, jsonForScript, safeUrl, LOCALES, LOCALE_NAMES, localePrefix } from '../lib/util.js';
import { inline } from '../lib/md.js';
import { BRAND_MARK } from './art.js';

const EXT = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/svg+xml': 'svg', 'image/gif': 'gif', 'image/avif': 'avif' };
export const mediaUrl = (v) => `/media/${v.key}.${EXT[v.mime] || 'bin'}`;

// Версия встроенных картинок для долгого кеширования (подставляется при сборке)
/* global __STATIC_VER__ */
const STATIC_VER = typeof __STATIC_VER__ !== 'undefined' ? __STATIC_VER__ : 'dev';

// Атрибуты тега из объекта; false/null/undefined пропускаются, true — атрибут без значения.
// Пустая строка остаётся (нужно для alt="" у декоративных картинок).
export function attrs(o) {
  let s = '';
  for (const [k, v] of Object.entries(o)) {
    if (v === false || v == null) continue;
    s += v === true ? ` ${k}` : ` ${k}="${esc(v)}"`;
  }
  return raw(s);
}

// Изображение из медиатеки или встроенная заглушка; srcset из подготовленных размеров.
export function img(ctx, ref, { sizes = '100vw', cls, priority = false, alt, width, height } = {}) {
  const id = ref?.id;
  if (!id) return '';
  const altText = alt ?? ref.alt ?? '';
  if (id.startsWith('builtin:')) {
    const name = id.slice(8);
    const [w, hh] = name.startsWith('hero') ? [1600, 900] : [240, 96];
    return h`<img${attrs({ src: `/static/${name}.svg?v=${STATIC_VER}`, width: width || w, height: height || hh, alt: altText, class: cls, loading: priority ? false : 'lazy', decoding: 'async', fetchpriority: priority ? 'high' : false })}>`;
  }
  const m = ctx.snap.media[id];
  if (!m || !m.v.length) return '';
  const vs = m.v;
  const main = vs.filter((v) => v.w <= 1600).pop() || vs[0];
  return h`<img${attrs({
    src: mediaUrl(main),
    srcset: vs.length > 1 ? vs.map((v) => `${mediaUrl(v)} ${v.w}w`).join(', ') : false,
    sizes: vs.length > 1 ? sizes : false,
    width: m.w, height: m.h, alt: altText || m.alt || '', class: cls,
    loading: priority ? false : 'lazy', decoding: 'async', fetchpriority: priority ? 'high' : false,
  })}>`;
}

// Абсолютный адрес картинки для og:image (только растровые из медиатеки).
export function ogImageUrl(ctx, ref) {
  const m = ref?.id && ctx.snap.media[ref.id];
  if (!m || m.mime === 'image/svg+xml') return '';
  const v = m.v.filter((x) => x.w <= 1600).pop() || m.v[0];
  return ctx.origin + mediaUrl(v);
}

export function button(b, cls = 'btn btn-primary') {
  if (!b?.label) return '';
  return h`<a class="${cls}" href="${safeUrl(b.href || '#')}">${b.label}</a>`;
}

export const eyebrow = (s) => (s ? h`<span class="eyebrow">${s}</span>` : '');

export function breadcrumbs(ctx, items) {
  const ui = ctx.settings.ui || {};
  const all = [{ name: ui.homeLabel || 'Главная', path: '/' }, ...items];
  return h`<nav class="crumbs" aria-label="${ui.crumbsLabel || 'Навигация по разделам'}"><ol>${all.map((it, i) => (i < all.length - 1
    ? h`<li><a href="${it.path}">${it.name}</a></li>`
    : h`<li><span aria-current="page">${it.name}</span></li>`))}</ol></nav>`;
}

export function breadcrumbLd(ctx, items) {
  const ui = ctx.settings.ui || {};
  const all = [{ name: ui.homeLabel || 'Главная', path: '/' }, ...items];
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: all.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: ctx.base + it.path })),
  };
}

export function organizationLd(ctx) {
  const s = ctx.settings;
  if (s.seo?.organizationJsonLd) {
    try { return JSON.parse(s.seo.organizationJsonLd); } catch { /* неверный JSON — берём автоматическую */ }
  }
  const c = s.contacts || {};
  const logo = ogImageUrl(ctx, s.logo);
  return {
    '@context': 'https://schema.org', '@type': 'ProfessionalService', '@id': `${ctx.base}/#organization`,
    name: s.siteName, description: s.seo?.description || s.tagline, url: ctx.base + '/',
    ...(logo ? { logo, image: logo } : {}),
    ...(c.phone ? { telephone: c.phone } : {}),
    ...(c.email ? { email: c.email } : {}),
    ...(c.address ? { address: { '@type': 'PostalAddress', streetAddress: c.address } } : {}),
    sameAs: (c.social || []).map((x) => x.url).filter((u) => /^https?:/.test(u || '')),
  };
}

function parseCustomLd(str) {
  if (!str || !String(str).trim()) return [];
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : [v];
  } catch { return []; }
}

function brand(ctx, inHeader = false) {
  const s = ctx.settings;
  const logo = s.logo?.id ? img(ctx, s.logo, { alt: s.siteName, priority: inHeader }) : '';
  return h`<a class="brand" href="/">${logo || h`${raw(BRAND_MARK)}<span><span class="brand-name">${s.siteName}</span>${s.tagline ? h`<span class="brand-tag">${s.tagline}</span>` : ''}</span>`}</a>`;
}

export function navItems(ctx) {
  return (ctx.settings.nav || []).filter((n) => n.label && (n.href !== '/cases' || ctx.settings.casesEnabled || ctx.preview));
}

function header(ctx, path) {
  const s = ctx.settings;
  const isActive = (href) => href === path || (href !== '/' && path.startsWith(href + '/'));
  return h`<header class="site-header"><div class="wrap header-inner">
    ${brand(ctx, true)}
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span class="nav-toggle-bar"></span>${s.ui?.menuLabel || 'Меню'}</button>
    <nav id="site-nav" class="site-nav" aria-label="${s.ui?.mainMenuLabel || 'Основное меню'}"><ul>
      ${navItems(ctx).map((n) => h`<li><a href="${safeUrl(n.href)}"${isActive(n.href) ? raw(' aria-current="page"') : ''}>${n.label}</a></li>`)}
    </ul>${button(s.headerCta, 'btn btn-primary nav-cta-mobile')}</nav>
    ${button(s.headerCta, 'btn btn-primary header-cta')}
    <div class="lang" role="group" aria-label="Language">@@LANG@@</div>
  </div></header>`;
}

function footer(ctx) {
  const s = ctx.settings;
  const c = s.contacts || {};
  const ui = s.ui || {};
  const services = ctx.entries('service');
  const extra = ctx.entries('page').filter((p) => p.data.showInFooter).map((p) => ({ label: p.data.title, href: `/${p.slug}` }));
  const links = [...(s.footer?.links || []), ...extra];
  const a = s.analytics || {};
  return h`<footer class="site-footer"><div class="wrap">
    <div class="footer-grid">
      <div>${brand(ctx)}<p>${s.footer?.about}</p>
        ${c.social?.length ? h`<ul>${c.social.filter((x) => x.label).map((x) => h`<li><a href="${safeUrl(x.url)}" rel="noopener" target="_blank">${x.label}</a></li>`)}</ul>` : ''}</div>
      <div><h2>${ui.servicesMenu || 'Специализации'}</h2><ul>${services.map((sv) => h`<li><a href="/services/${sv.slug}">${sv.data.title}</a></li>`)}</ul></div>
      <div><h2>${s.siteName}</h2><ul>${navItems(ctx).map((n) => h`<li><a href="${safeUrl(n.href)}">${n.label}</a></li>`)}</ul></div>
      <div><h2>${ui.contactsMenu || 'Контакты'}</h2><ul>
        ${c.phone ? h`<li><a href="tel:${c.phone.replace(/[^\d+]/g, '')}">${c.phone}</a></li>` : ''}
        ${c.email ? h`<li><a href="mailto:${c.email}">${c.email}</a></li>` : ''}
        ${c.address ? h`<li>${c.address}</li>` : ''}
        ${c.hours ? h`<li>${c.hours}</li>` : ''}
      </ul></div>
    </div>
    <div class="footer-bottom">
      <span>${String(s.footer?.copyright || '').replace('{year}', new Date().getUTCFullYear())}</span>
      <span>${links.map((l, i) => h`${i ? ' · ' : ''}<a href="${safeUrl(l.href)}">${l.label}</a>`)}${a.bannerEnabled ? h`${links.length ? ' · ' : ''}<button type="button" class="linklike" data-cookie-settings>${a.settingsLabel || 'Настройки cookie'}</button>` : ''}</span>
    </div>
  </div></footer>`;
}

function cookieBanner(ctx) {
  const a = ctx.settings.analytics || {};
  if (!a.bannerEnabled) return '';
  return h`<div id="cookie-banner" class="cookie" role="dialog" aria-live="polite" aria-label="${ctx.settings.ui?.cookieLabel || 'Уведомление о cookie'}" hidden>
    <p>${a.bannerText} ${a.policyHref ? h`<a href="${safeUrl(a.policyHref)}">${a.policyLabel || 'Подробнее'}</a>` : ''}</p>
    <div class="cookie-actions"><button type="button" class="btn btn-primary" data-consent="granted">${a.acceptLabel || 'Принять'}</button>
    <button type="button" class="btn btn-outline" data-consent="denied">${a.declineLabel || 'Отклонить'}</button></div></div>`;
}

export function pageTitle(ctx, seoTitle, fallback) {
  const s = ctx.settings;
  return (seoTitle || fallback || s.siteName) + (s.seo?.titleSuffix || '');
}

// Полная HTML-страница
export function layout(ctx, { title, description, path, body, jsonld = [], seo = {}, ogType = 'website', noindex = false, status = 200 }) {
  const s = ctx.settings;
  const desc = String(seo.description || description || s.seo?.description || '').replace(/\s+/g, ' ').trim().slice(0, 300);
  const ui = s.ui || {};
  const canonical = ctx.base + (path === '/' && ctx.prefix ? '' : path);
  const locHref = (l) => ctx.origin + localePrefix(l) + (path === '/' && l !== 'ru' ? '' : path);
  const robots = !s.indexing || noindex || seo.noindex || ctx.preview || status !== 200 ? 'noindex, nofollow' : 'index, follow, max-image-preview:large';
  const og = ogImageUrl(ctx, seo.ogImage) || ogImageUrl(ctx, s.seo?.ogImage);
  const lds = [...jsonld, ...parseCustomLd(seo.jsonld)];
  const cfg = { ga: s.analytics?.ga4Id || '', banner: !!s.analytics?.bannerEnabled };
  const langLinks = LOCALES.map((l) => `<a href="${esc(localePrefix(l) + (path === '/' && l !== 'ru' ? '' : path))}" hreflang="${l}" lang="${l}"${l === ctx.locale ? ' aria-current="true"' : ''}>${LOCALE_NAMES[l]}</a>`).join('');
  const hreflangs = status === 200 ? LOCALES.map((l) => h`<link rel="alternate" hreflang="${l}" href="${locHref(l)}">`).concat(h`<link rel="alternate" hreflang="x-default" href="${locHref('ru')}">`) : '';
  let html = '<!doctype html>' + h`<html lang="${ctx.locale}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
${desc ? h`<meta name="description" content="${desc}">` : ''}
<meta name="robots" content="${robots}">
${status === 200 ? h`<link rel="canonical" href="${canonical}">` : ''}${hreflangs}
<meta property="og:type" content="${ogType}"><meta property="og:site_name" content="${s.siteName}"><meta property="og:locale" content="${{ ru: 'ru_RU', kk: 'kk_KZ', en: 'en_US' }[ctx.locale]}">
<meta property="og:title" content="${title}">${desc ? h`<meta property="og:description" content="${desc}">` : ''}<meta property="og:url" content="${canonical}">
${og ? h`<meta property="og:image" content="${og}"><meta name="twitter:card" content="summary_large_image">` : h`<meta name="twitter:card" content="summary">`}
<meta name="theme-color" content="#0f2a44">
<link rel="icon" href="/favicon.svg?v=${STATIC_VER}" type="image/svg+xml">
${cfg.ga ? raw('<link rel="preconnect" href="https://www.googletagmanager.com">') : ''}
<style>${raw(ctx.assets.css)}</style>
${lds.map((ld) => h`<script type="application/ld+json">${raw(jsonForScript(ld))}</script>`)}
</head><body>
<a class="skip" href="#main">${ui.skipLabel || 'Перейти к содержимому'}</a>
${ctx.preview ? h`<div class="notice-preview">Режим предпросмотра — страница видна только вам</div>` : ''}
${header(ctx, path)}
<main id="main">${body}</main>
${footer(ctx)}
${cookieBanner(ctx)}
<script nonce="${ctx.nonce}">window.__SITE=${raw(jsonForScript(cfg))};${raw(ctx.assets.js)}</script>
</body></html>`;
  html = String(html);
  if (ctx.prefix) {
    // внутренние ссылки получают префикс языка (/kk, /en); служебные адреса остаются как есть
    html = html.replace(/(href|action)="\/(?!\/|kk(?:\/|")|en(?:\/|")|files\/|media\/|static\/|favicon|admin|api\/|__preview|sitemap|robots)([^"]*)"/g,
      (_, a, rest) => `${a}="${ctx.prefix}${rest ? '/' + rest : ''}"`);
  }
  return html.replace('@@LANG@@', langLinks);
}

export { inline };
