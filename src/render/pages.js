// Шаблоны публичных страниц.

import { h, raw, safeUrl, fmtDateLong, fmtBytes, plainText } from '../lib/util.js';
import { markdown, inline } from '../lib/md.js';
import { ICONS } from './art.js';
import {
  layout, attrs, img, button, eyebrow, breadcrumbs, breadcrumbLd, organizationLd, pageTitle, ogImageUrl,
} from './layout.js';

const md = (s) => raw(markdown(s));

// ---------- общие блоки ----------
function pageHero(ctx, hero, crumbs, extra = '') {
  return h`<section class="page-hero"><div class="wrap">
    ${crumbs ? breadcrumbs(ctx, crumbs) : ''}
    ${eyebrow(hero?.eyebrow)}
    <h1>${hero?.title}</h1>
    ${hero?.subtitle ? h`<p class="lead">${hero.subtitle}</p>` : ''}
    ${extra}
  </div></section>`;
}

function ctaBand(cta) {
  if (!cta?.title) return '';
  return h`<section class="section section-tight"><div class="wrap"><div class="cta-band">
    <div><h2>${cta.title}</h2>${cta.text ? h`<p>${cta.text}</p>` : ''}</div>
    ${button(cta.button, 'btn btn-gold')}
  </div></div></section>`;
}

function statsBlock(stats, cls = '') {
  const items = (stats || []).filter((x) => x.value);
  if (!items.length) return '';
  return h`<div class="stats ${cls}">${items.map((x) => h`<div><div class="stat-value">${x.value}</div><div class="stat-label">${x.label}</div></div>`)}</div>`;
}

function stepsBlock(items) {
  const list = (items || []).filter((x) => x.title);
  if (!list.length) return '';
  return h`<ol class="steps">${list.map((x) => h`<li><h3>${x.title}</h3><p>${x.text}</p></li>`)}</ol>`;
}

function featuresBlock(items) {
  const list = (items || []).filter((x) => x.title);
  if (!list.length) return '';
  return h`<ul class="features">${list.map((x) => h`<li><h3>${x.title}</h3><p>${x.text}</p></li>`)}</ul>`;
}

function logosBlock(ctx, title, filter) {
  const logos = ctx.entries('client').filter(filter);
  if (!logos.length) return '';
  return h`<section class="section section-tight" aria-label="${title || ctx.settings.ui?.clientsLabel || 'Клиенты'}"><div class="wrap">
    ${title ? h`<p class="logos-title">${title}</p>` : ''}
    <ul class="logos">${logos.map((c) => {
      const pic = img(ctx, c.data.logo, { alt: c.data.name, sizes: '200px' }) || h`<span>${c.data.name}</span>`;
      return h`<li>${c.data.url ? h`<a href="${safeUrl(c.data.url)}" target="_blank" rel="noopener">${pic}</a>` : pic}</li>`;
    })}</ul>
  </div></section>`;
}

function serviceCard(ctx, sv) {
  const ui = ctx.settings.ui || {};
  return h`<article class="card">
    <div class="icon">${raw(ICONS[sv.data.icon] || ICONS.strategy)}</div>
    <h3><a href="/services/${sv.slug}">${sv.data.title}</a></h3>
    <p>${sv.data.excerpt}</p>
    <span class="link-arrow">${ctx.home?.services?.linkLabel || ui.readMore || 'Подробнее'}</span>
  </article>`;
}

const readingTime = (text) => Math.max(1, Math.round(String(text || '').split(/\s+/).length / 180));

function postMeta(ctx, a) {
  const ui = ctx.settings.ui || {};
  return h`<div class="post-meta">${a.data.category ? h`<span class="tag">${a.data.category}</span>` : ''}
    ${a.data.date ? h`<time datetime="${a.data.date}">${fmtDateLong(a.data.date, ctx.locale)}</time>` : ''}
    <span>${String(ui.minRead || '{n} мин чтения').replace('{n}', readingTime(a.data.body))}</span></div>`;
}

function postCard(ctx, a) {
  return h`<article class="post-card">
    ${img(ctx, a.data.cover, { sizes: '(max-width: 640px) 100vw, (max-width: 860px) 50vw, 400px' }) || raw('<div class="post-cover-ph" aria-hidden="true"></div>')}
    <div class="post-body">${postMeta(ctx, a)}<h3><a href="/insights/${a.slug}">${a.data.title}</a></h3><p>${a.data.excerpt}</p></div>
  </article>`;
}

export const articlesSorted = (ctx) => ctx.entries('article').slice().sort((a, b) => String(b.data.date || '').localeCompare(String(a.data.date || '')));

// ---------- выбор баннера по стране ----------
const EUROPE = new Set('AD AL AT BA BE BG CH CY CZ DE DK EE ES FI FR GB GR HR HU IE IS IT LI LT LU LV MC ME MK MT NL NO PL PT RO RS SE SI SK SM UA VA XK'.split(' '));

export function pickHero(ctx) {
  const heroes = ctx.entries('hero');
  const country = ctx.country;
  const continent = ctx.continent || (EUROPE.has(country) ? 'EU' : '');
  let fallback = null;
  for (const hv of heroes) {
    const codes = String(hv.data.regions || '').toUpperCase().split(/[\s,;]+/).filter(Boolean);
    if (codes.includes('*')) { fallback = fallback || hv; continue; }
    if ((country && codes.includes(country)) || (continent && codes.includes(continent))) return hv;
  }
  return fallback;
}

// ---------- страницы ----------
export function homePage(ctx) {
  const p = ctx.doc('page:home');
  ctx.home = p;
  const variant = pickHero(ctx);
  const heroImg = variant?.data.image;
  const services = ctx.entries('service');
  const posts = articlesSorted(ctx).slice(0, Math.min(6, Math.max(1, Number(p.insights?.count) || 3)));
  const s = ctx.settings;
  const body = h`
  <section class="hero" data-region="${variant?.data.name || ''}">
    <div class="hero-media">${img(ctx, heroImg, { priority: true, sizes: '100vw', alt: heroImg?.alt || '' })}</div>
    <div class="wrap"><div class="hero-inner">
      ${eyebrow(p.hero?.eyebrow)}
      <h1>${variant?.data.title || p.hero?.title}</h1>
      <p class="lead">${variant?.data.subtitle || p.hero?.subtitle}</p>
      <div class="hero-actions">${button(p.hero?.primary, 'btn btn-gold')}${button(p.hero?.secondary, 'btn btn-ghost')}</div>
    </div></div>
  </section>
  ${p.trust?.show ? logosBlock(ctx, p.trust.title, (c) => c.data.showOnHome !== false) : ''}
  <section class="section section-soft"><div class="wrap split">
    <div>${eyebrow(p.intro?.eyebrow)}<h2>${p.intro?.title}</h2></div>
    <div class="prose">${md(p.intro?.body)}</div>
  </div>
  ${p.stats?.length ? h`<div class="wrap" style="margin-top:56px">${statsBlock(p.stats, 'stats-band')}</div>` : ''}
  </section>
  ${services.length ? h`<section class="section"><div class="wrap">
    <div class="section-head">${eyebrow(p.services?.eyebrow)}<h2>${p.services?.title}</h2>${p.services?.text ? h`<p>${p.services.text}</p>` : ''}</div>
    <div class="grid grid-3">${services.map((sv) => serviceCard(ctx, sv))}</div>
  </div></section>` : ''}
  ${p.approach?.steps?.length ? h`<section class="section section-soft"><div class="wrap">
    <div class="section-head">${eyebrow(p.approach.eyebrow)}<h2>${p.approach.title}</h2></div>
    ${stepsBlock(p.approach.steps)}
  </div></section>` : ''}
  ${p.testimonial?.show && p.testimonial.quote ? h`<section class="section"><div class="wrap quote">
    <figure style="margin:0"><blockquote><p style="margin:0">${p.testimonial.quote}</p></blockquote>
    <figcaption><cite><strong>${p.testimonial.author}</strong>${p.testimonial.role}</cite></figcaption></figure>
  </div></section>` : ''}
  ${p.insights?.show && posts.length ? h`<section class="section section-soft"><div class="wrap">
    <div class="section-head">${eyebrow(p.insights.eyebrow)}<h2>${p.insights.title}</h2></div>
    <div class="grid grid-3">${posts.map((a) => postCard(ctx, a))}</div>
    <p style="margin-top:32px"><a class="link-arrow" href="/insights">${p.insights.linkLabel || s.ui?.allArticles}</a></p>
  </div></section>` : ''}
  ${ctaBand(p.cta)}`;
  return layout(ctx, {
    title: p.seo?.title ? pageTitle(ctx, p.seo.title) : `${s.siteName} — ${s.tagline}`,
    description: s.seo?.description, path: '/', seo: p.seo, body,
    jsonld: [organizationLd(ctx), { '@context': 'https://schema.org', '@type': 'WebSite', name: s.siteName, url: ctx.base + '/', publisher: { '@id': `${ctx.base}/#organization` } }],
  });
}

export function aboutPage(ctx) {
  const p = ctx.doc('page:about');
  const crumbs = [{ name: p.hero?.title || 'О нас', path: '/about' }];
  const members = (p.team?.members || []).filter((m) => m.name);
  const initials = (n) => String(n).split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  const body = h`
  ${pageHero(ctx, p.hero, crumbs)}
  <section class="section"><div class="wrap split">
    <div><h2>${p.story?.title}</h2><div class="prose">${md(p.story?.body)}</div></div>
    <div class="split-media">${img(ctx, p.story?.image, { sizes: '(max-width: 860px) 100vw, 560px' }) || statsBlock(p.stats)}</div>
  </div></section>
  ${p.story?.image?.id && p.stats?.length ? h`<section class="section-tight"><div class="wrap">${statsBlock(p.stats, 'stats-band')}</div></section>` : ''}
  ${p.values?.items?.length ? h`<section class="section section-soft"><div class="wrap">
    <div class="section-head"><h2>${p.values.title}</h2></div>${featuresBlock(p.values.items)}
  </div></section>` : ''}
  ${members.length ? h`<section class="section"><div class="wrap">
    <div class="section-head"><h2>${p.team.title}</h2>${p.team.text ? h`<p>${p.team.text}</p>` : ''}</div>
    <div class="team">${members.map((m) => h`<article class="member">
      ${img(ctx, m.photo, { sizes: '96px', alt: m.name, width: 96, height: 96 }) || h`<div class="avatar" aria-hidden="true">${initials(m.name)}</div>`}
      <h3>${m.name}</h3><div class="role">${m.role}</div><p>${m.bio}</p>
      ${m.linkedin ? h`<a href="${safeUrl(m.linkedin)}" target="_blank" rel="noopener">${ctx.settings.ui?.profileLabel || 'Профиль'}</a>` : ''}
    </article>`)}</div>
  </div></section>` : ''}
  ${p.credentials?.items?.length ? h`<section class="section section-soft"><div class="wrap">
    <div class="section-head"><h2>${p.credentials.title}</h2></div>
    <div class="grid grid-3">${p.credentials.items.filter((x) => x.title).map((x) => h`<div class="card"><h3>${x.title}</h3><p>${x.text}</p></div>`)}</div>
  </div></section>` : ''}
  ${ctaBand(p.cta)}`;
  return layout(ctx, {
    title: pageTitle(ctx, p.seo?.title, p.hero?.title), description: p.hero?.subtitle, path: '/about', seo: p.seo, body,
    jsonld: [breadcrumbLd(ctx, crumbs), { '@context': 'https://schema.org', '@type': 'AboutPage', name: p.hero?.title, url: `${ctx.base}/about`, about: { '@id': `${ctx.base}/#organization` } }],
  });
}

export function servicesPage(ctx) {
  const p = ctx.doc('page:services');
  const crumbs = [{ name: p.hero?.title || 'Услуги', path: '/services' }];
  const services = ctx.entries('service');
  const body = h`
  ${pageHero(ctx, p.hero, crumbs)}
  <section class="section"><div class="wrap">
    ${p.intro ? h`<div class="prose narrow" style="margin-bottom:48px">${md(p.intro)}</div>` : ''}
    <h2 class="visually-hidden">${p.hero?.title}</h2>
    <div class="grid grid-3">${services.map((sv) => serviceCard(ctx, sv))}</div>
  </div></section>
  ${p.why?.items?.length ? h`<section class="section section-soft"><div class="wrap">
    <div class="section-head"><h2>${p.why.title}</h2></div>${featuresBlock(p.why.items)}
  </div></section>` : ''}
  ${p.trust?.show ? logosBlock(ctx, p.trust.title, (c) => c.data.showOnHome !== false) : ''}
  ${ctaBand(p.cta)}`;
  return layout(ctx, {
    title: pageTitle(ctx, p.seo?.title, p.hero?.title), description: p.hero?.subtitle, path: '/services', seo: p.seo, body,
    jsonld: [breadcrumbLd(ctx, crumbs), {
      '@context': 'https://schema.org', '@type': 'ItemList',
      itemListElement: services.map((sv, i) => ({ '@type': 'ListItem', position: i + 1, url: `${ctx.base}/services/${sv.slug}`, name: sv.data.title })),
    }],
  });
}

export function servicePage(ctx, sv) {
  const d = sv.data;
  const sp = ctx.doc('page:services');
  const path = `/services/${sv.slug}`;
  const crumbs = [{ name: sp.hero?.title || 'Услуги', path: '/services' }, { name: d.title, path }];
  const faq = (d.faq?.items || []).filter((x) => x.q);
  const others = ctx.entries('service').filter((x) => x.id !== sv.id);
  const body = h`
  ${pageHero(ctx, { eyebrow: d.hero?.eyebrow, title: d.title, subtitle: d.hero?.subtitle }, crumbs)}
  <section class="section"><div class="wrap split">
    <div class="prose">${md(d.intro)}</div>
    <div class="split-media">${img(ctx, d.image, { sizes: '(max-width: 860px) 100vw, 560px' }) || statsBlock(d.outcomes?.items)}</div>
  </div></section>
  ${d.offerings?.items?.length ? h`<section class="section section-soft"><div class="wrap">
    <div class="section-head"><h2>${d.offerings.title}</h2></div>${featuresBlock(d.offerings.items)}
  </div></section>` : ''}
  ${d.image?.id && d.outcomes?.items?.length ? h`<section class="section"><div class="wrap">
    <div class="section-head"><h2>${d.outcomes.title}</h2></div>${statsBlock(d.outcomes.items)}
  </div></section>` : ''}
  ${d.process?.items?.length ? h`<section class="section"><div class="wrap">
    <div class="section-head"><h2>${d.process.title}</h2></div>${stepsBlock(d.process.items)}
  </div></section>` : ''}
  ${d.clients?.show ? logosBlock(ctx, d.clients.title, (c) => !c.data.services?.length || c.data.services.includes(sv.slug)) : ''}
  ${faq.length ? h`<section class="section section-soft"><div class="wrap faq">
    <h2>${d.faq.title}</h2>${faq.map((x) => h`<details><summary>${x.q}</summary><p>${x.a}</p></details>`)}
  </div></section>` : ''}
  ${others.length ? h`<section class="section"><div class="wrap">
    <div class="section-head"><h2>${ctx.settings.ui?.otherServices || ctx.settings.ui?.servicesMenu || 'Другие специализации'}</h2></div>
    <div class="grid grid-2">${others.map((o) => serviceCard(ctx, o))}</div>
  </div></section>` : ''}
  ${ctaBand(d.cta)}`;
  const jsonld = [breadcrumbLd(ctx, crumbs), {
    '@context': 'https://schema.org', '@type': 'Service', name: d.title, serviceType: d.title,
    description: d.seo?.description || d.excerpt, url: ctx.base + path, provider: { '@id': `${ctx.base}/#organization`, '@type': 'Organization', name: ctx.settings.siteName },
  }];
  if (faq.length) {
    jsonld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) });
  }
  return layout(ctx, { title: pageTitle(ctx, d.seo?.title, d.title), description: d.excerpt, path, seo: { ...d.seo, ogImage: d.seo?.ogImage?.id ? d.seo.ogImage : d.image }, body, jsonld });
}

export function insightsPage(ctx, cat) {
  const p = ctx.doc('page:insights');
  const crumbs = [{ name: p.hero?.title || 'Аналитика', path: '/insights' }];
  const all = articlesSorted(ctx);
  const cats = [...new Set(all.map((a) => a.data.category).filter(Boolean))];
  const list = cat ? all.filter((a) => a.data.category === cat) : all;
  const docs = ctx.snap.publicDocs || [];
  const ui = ctx.settings.ui || {};
  const body = h`
  ${pageHero(ctx, p.hero, crumbs)}
  <section class="section"><div class="wrap">
    ${cats.length > 1 ? h`<ul class="chips" aria-label="${ui.topicsLabel || 'Темы'}">
      <li><a href="/insights"${!cat ? raw(' aria-current="true"') : ''}>${p.allLabel || 'Все'}</a></li>
      ${cats.map((c) => h`<li><a href="/insights?topic=${encodeURIComponent(c)}"${c === cat ? raw(' aria-current="true"') : ''}>${c}</a></li>`)}
    </ul>` : ''}
    <h2 class="visually-hidden">${cat || p.hero?.title}</h2>
    ${list.length ? h`<div class="grid grid-3">${list.map((a) => postCard(ctx, a))}</div>` : h`<p class="empty">${p.emptyText}</p>`}
  </div></section>
  ${p.downloads?.show && docs.length ? h`<section class="section section-soft" id="downloads"><div class="wrap">
    <div class="section-head"><h2>${p.downloads.title}</h2>${p.downloads.text ? h`<p>${p.downloads.text}</p>` : ''}</div>
    <ul class="files">${docs.map((f) => {
      const ext = (String(f.filename).match(/\.([a-z0-9]+)$/i) || [])[1] || 'file';
      return h`<li class="file"><span class="file-ext" aria-hidden="true">${ext}</span>
        <span class="file-info"><strong>${f.title}</strong><span>${f.number} · ${fmtDateLong(f.doc_date, ctx.locale)} · ${fmtBytes(f.size)}</span>${f.description ? h`<span style="display:block">${f.description}</span>` : ''}</span>
        <a class="btn btn-outline" href="/files/${f.id}/${encodeURIComponent(f.filename)}" data-download download>${ui.downloadLabel || 'Скачать'}<span class="visually-hidden"> ${f.title}</span></a></li>`;
    })}</ul>
  </div></section>` : ''}
  ${ctaBand(p.cta)}`;
  return layout(ctx, {
    title: pageTitle(ctx, p.seo?.title, cat ? `${cat} — ${p.hero?.title}` : p.hero?.title), description: p.hero?.subtitle,
    path: cat ? `/insights?topic=${encodeURIComponent(cat)}` : '/insights', seo: p.seo, body, noindex: !!cat && !list.length,
    jsonld: [breadcrumbLd(ctx, crumbs), { '@context': 'https://schema.org', '@type': 'CollectionPage', name: p.hero?.title, url: `${ctx.base}/insights` }],
  });
}

export function articlePage(ctx, a) {
  const d = a.data;
  const p = ctx.doc('page:insights');
  const ui = ctx.settings.ui || {};
  const path = `/insights/${a.slug}`;
  const crumbs = [{ name: p.hero?.title || 'Аналитика', path: '/insights' }, { name: d.title, path }];
  const related = articlesSorted(ctx).filter((x) => x.id !== a.id).slice(0, 3);
  const cover = img(ctx, d.cover, { priority: true, sizes: '(max-width: 1000px) 100vw, 1000px' });
  const body = h`
  ${pageHero(ctx, { eyebrow: d.category, title: d.title, subtitle: d.excerpt }, crumbs,
    h`<p class="post-meta" style="color:rgba(255,255,255,.75);margin:20px 0 0">${d.author ? h`<span>${d.author}</span>` : ''}${d.date ? h`<time datetime="${d.date}">${fmtDateLong(d.date, ctx.locale)}</time>` : ''}<span>${String(ui.minRead || '{n} мин').replace('{n}', readingTime(d.body))}</span></p>`)}
  ${cover ? h`<div class="wrap"><div class="article-cover">${cover}</div></div>` : ''}
  <section class="section"><div class="wrap"><article class="article-body prose">${md(d.body)}
    <a class="back" href="/insights">${ui.backToInsights || '← Назад'}</a></article></div></section>
  ${related.length ? h`<section class="section section-soft"><div class="wrap">
    <div class="section-head"><h2>${ui.allArticles || 'Ещё материалы'}</h2></div>
    <div class="grid grid-3">${related.map((x) => postCard(ctx, x))}</div>
  </div></section>` : ''}
  ${ctaBand(p.cta)}`;
  const image = ogImageUrl(ctx, d.cover);
  return layout(ctx, {
    title: pageTitle(ctx, d.seo?.title, d.title), description: d.excerpt || plainText(d.body, 160), path, ogType: 'article',
    seo: { ...d.seo, ogImage: d.seo?.ogImage?.id ? d.seo.ogImage : d.cover }, body,
    jsonld: [breadcrumbLd(ctx, crumbs), {
      '@context': 'https://schema.org', '@type': 'Article', headline: d.title, description: d.excerpt,
      datePublished: d.date || a.created_at, dateModified: (a.updated_at || '').slice(0, 10) || d.date,
      author: d.author ? { '@type': 'Person', name: d.author } : { '@id': `${ctx.base}/#organization` },
      publisher: { '@id': `${ctx.base}/#organization`, '@type': 'Organization', name: ctx.settings.siteName },
      mainEntityOfPage: ctx.base + path, ...(image ? { image } : {}), ...(d.category ? { articleSection: d.category } : {}),
    }],
  });
}

export function casesPage(ctx) {
  const p = ctx.doc('page:cases');
  const crumbs = [{ name: p.hero?.title || 'Проекты', path: '/cases' }];
  const cases = ctx.entries('case');
  const ui = ctx.settings.ui || {};
  const body = h`
  ${pageHero(ctx, p.hero, crumbs)}
  <section class="section"><div class="wrap">
    <h2 class="visually-hidden">${p.hero?.title}</h2>
    ${cases.length ? h`<div class="grid grid-2">${cases.map((c) => h`<article class="post-card case-card">
      ${img(ctx, c.data.image, { sizes: '(max-width: 640px) 100vw, 600px' }) || raw('<div class="post-cover-ph" aria-hidden="true"></div>')}
      <div class="post-body"><div class="post-meta">${c.data.industry ? h`<span class="tag">${c.data.industry}</span>` : ''}</div>
        <h3><a href="/cases/${c.slug}">${c.data.title}</a></h3>
        ${c.data.tagline ? h`<p class="case-tagline">${c.data.tagline}</p>` : ''}
        <p>${c.data.summary}</p>
        <span class="link-arrow" style="margin-top:16px">${ui.readMore || 'Подробнее'}</span></div>
    </article>`)}</div>` : h`<p class="empty">${p.emptyText}</p>`}
  </div></section>
  ${ctaBand(p.cta)}`;
  return layout(ctx, {
    title: pageTitle(ctx, p.seo?.title, p.hero?.title), description: p.hero?.subtitle, path: '/cases', seo: p.seo, body,
    noindex: !ctx.settings.casesEnabled, jsonld: [breadcrumbLd(ctx, crumbs)],
  });
}

export function casePage(ctx, c) {
  const d = c.data;
  const p = ctx.doc('page:cases');
  const ui = ctx.settings.ui || {};
  const path = `/cases/${c.slug}`;
  const crumbs = [{ name: p.hero?.title || 'Проекты', path: '/cases' }, { name: d.title, path }];
  const pic = img(ctx, d.image, { priority: true, sizes: '(max-width: 1000px) 100vw, 1000px' });
  const body = h`
  ${pageHero(ctx, { eyebrow: d.industry, title: d.title, subtitle: d.tagline }, crumbs)}
  ${pic ? h`<div class="wrap"><div class="article-cover">${pic}</div></div>` : ''}
  <section class="section"><div class="wrap split">
    <div><h2>${p.labels?.summary || 'Задача'}</h2><div class="prose"><p>${d.summary}</p></div></div>
    <div><h2>${p.labels?.result || 'Результат'}</h2><div class="prose">${md(d.result)}</div></div>
  </div></section>
  ${d.metrics?.length ? h`<section class="section section-soft"><div class="wrap">
    <div class="section-head"><h2>${p.labels?.metrics || 'Ключевые цифры'}</h2></div>${statsBlock(d.metrics)}
    <a class="back" href="/cases">${ui.backToCases || '← Назад'}</a>
  </div></section>` : ''}
  ${ctaBand(p.cta)}`;
  return layout(ctx, {
    title: pageTitle(ctx, d.seo?.title, d.title), description: d.summary, path, seo: { ...d.seo, ogImage: d.seo?.ogImage?.id ? d.seo.ogImage : d.image },
    body, noindex: !ctx.settings.casesEnabled, jsonld: [breadcrumbLd(ctx, crumbs)],
  });
}

function formField(f) {
  const id = `f-${f.name}`;
  const req = f.required ? raw(' <span class="req" aria-hidden="true">*</span>') : '';
  const cls = `field${f.width === 'half' ? ' half' : ''}${f.type === 'checkbox' ? ' field-check' : ''}`;
  const auto = { name: 'name', email: 'email', phone: 'tel', tel: 'tel', company: 'organization' }[f.name] || false;
  const common = { id, name: f.name, required: !!f.required };
  if (f.type === 'checkbox') {
    return h`<div class="${cls}"><input type="checkbox"${attrs({ ...common, value: 'yes' })}><label for="${id}">${raw(inline(f.label))}${req}</label></div>`;
  }
  let control;
  if (f.type === 'textarea') control = h`<textarea${attrs({ ...common, placeholder: f.placeholder, rows: 6, maxlength: 5000 })}></textarea>`;
  else if (f.type === 'select') {
    const opts = String(f.options || '').split('\n').map((x) => x.trim()).filter(Boolean);
    control = h`<select${attrs(common)}><option value="">${f.placeholder || '—'}</option>${opts.map((o) => h`<option>${o}</option>`)}</select>`;
  } else {
    control = h`<input${attrs({ ...common, type: ['email', 'tel'].includes(f.type) ? f.type : 'text', placeholder: f.placeholder, autocomplete: auto, maxlength: 300 })}>`;
  }
  return h`<div class="${cls}"><label for="${id}">${f.label}${req}</label>${control}</div>`;
}

export function contactPage(ctx, { sent = false, error = '' } = {}) {
  const p = ctx.doc('page:contact');
  const f = ctx.doc('form:contact');
  const s = ctx.settings;
  const ui = s.ui || {};
  const c = s.contacts || {};
  const crumbs = [{ name: p.hero?.title || 'Контакты', path: '/contact' }];
  const siteKey = s.notifications?.turnstileSiteKey;
  const body = h`
  ${pageHero(ctx, p.hero, crumbs)}
  <section class="section"><div class="wrap contact-grid">
    <div>
      <h2>${p.formTitle}</h2>${p.formText ? h`<p>${p.formText}</p>` : ''}
      <form id="contact-form" class="form" method="post" action="/api/contact"${attrs({ 'data-sending': f.sendingLabel, 'data-success-title': f.successTitle, 'data-success-text': f.successText, 'data-error': f.errorText })}>
        ${sent ? '' : (f.fields || []).filter((x) => x.name && x.label).map(formField)}
        ${sent ? '' : h`<div class="hp" aria-hidden="true"><label for="f-website">Website</label><input id="f-website" name="website" tabindex="-1" autocomplete="off"></div>
        <input type="hidden" name="_t" value="${Date.now()}"><input type="hidden" name="lang" value="${ctx.locale}">
        ${siteKey ? h`<div class="field"><div class="cf-turnstile" data-sitekey="${siteKey}"></div></div>` : ''}
        <div class="form-actions"><button class="btn btn-primary" type="submit">${f.submitLabel || 'Отправить'}</button></div>`}
        <div id="form-status" class="form-status${sent ? ' ok' : error ? ' err' : ''}" role="status" aria-live="polite"${sent || error ? '' : raw(' hidden')}>
          ${sent ? h`<h3>${f.successTitle}</h3><p style="margin:0">${f.successText}</p>` : error}</div>
      </form>
    </div>
    <aside class="contact-card">
      <h2 style="font-size:1.5rem">${p.infoTitle}</h2>
      <ul class="contact-list">
        ${c.phone ? h`<li><span>${ui.phoneLabel || 'Телефон'}</span><a href="tel:${c.phone.replace(/[^\d+]/g, '')}">${c.phone}</a></li>` : ''}
        ${c.email ? h`<li><span>${ui.emailLabel || 'E-mail'}</span><a href="mailto:${c.email}">${c.email}</a></li>` : ''}
        ${c.address ? h`<li><span>${ui.addressLabel || 'Адрес'}</span><strong>${c.address}</strong>${c.mapUrl ? h` <a href="${safeUrl(c.mapUrl)}" target="_blank" rel="noopener" style="font-weight:400;font-size:15px;display:block">${ui.mapLabel || 'На карте'}</a>` : ''}</li>` : ''}
        ${c.hours ? h`<li><span>${ui.hoursLabel || 'Часы работы'}</span><strong>${c.hours}</strong></li>` : ''}
      </ul>
      ${p.infoText ? h`<div class="prose" style="font-size:1rem">${md(p.infoText)}</div>` : ''}
    </aside>
  </div></section>
  ${siteKey ? raw('<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>') : ''}`;
  const org = organizationLd(ctx);
  return layout(ctx, {
    title: pageTitle(ctx, p.seo?.title, p.hero?.title), description: p.hero?.subtitle, path: '/contact', seo: p.seo, body,
    jsonld: [breadcrumbLd(ctx, crumbs), { '@context': 'https://schema.org', '@type': 'ContactPage', name: p.hero?.title, url: `${ctx.base}/contact`, mainEntity: org }],
  });
}

export function customPage(ctx, pg) {
  const d = pg.data;
  const path = `/${pg.slug}`;
  const crumbs = [{ name: d.title, path }];
  const body = h`${pageHero(ctx, { title: d.title }, crumbs)}
  <section class="section"><div class="wrap"><div class="prose narrow">${md(d.body)}</div></div></section>`;
  return layout(ctx, { title: pageTitle(ctx, d.seo?.title, d.title), description: plainText(d.body, 160), path, seo: d.seo, body, jsonld: [breadcrumbLd(ctx, crumbs)] });
}

export function notFoundPage(ctx) {
  const ui = ctx.settings.ui || {};
  const body = h`${pageHero(ctx, { eyebrow: '404', title: ui.notFoundTitle || 'Страница не найдена', subtitle: ui.notFoundText }, null,
    h`<div class="hero-actions"><a class="btn btn-gold" href="/">${ui.homeLabel || 'Главная'}</a><a class="btn btn-ghost" href="/services">${ui.servicesMenu || 'Услуги'}</a></div>`)}`;
  return layout(ctx, { title: pageTitle(ctx, ui.notFoundTitle || 'Страница не найдена'), path: '/404', body, status: 404 });
}
