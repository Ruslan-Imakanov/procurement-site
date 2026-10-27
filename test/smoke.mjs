// Быстрая HTTP-проверка развёрнутого сайта: node test/smoke.mjs [baseUrl]
import assert from 'node:assert/strict';

const base = (process.argv[2] || 'http://127.0.0.1:8787').replace(/\/$/, '');
const checks = [
  ['/', 200, 'text/html', /<h1>/],
  ['/about', 200, 'text/html', /<h1>/],
  ['/services', 200, 'text/html', /services\//],
  ['/insights', 200, 'text/html', /<h1>/],
  ['/contact', 200, 'text/html', /id="contact-form"/],
  ['/privacy', 200, 'text/html', /<h1>/],
  ['/no-such-page', 404, 'text/html', /404/],
  ['/sitemap.xml', 200, 'application/xml', /<urlset/],
  ['/robots.txt', 200, 'text/plain', /User-agent/],
  ['/admin', 200, 'text/html', /app\.js/],
  ['/favicon.svg', 200, 'image/svg+xml', /<svg/],
  ['/api/admin/me', 401, 'application/json', /error/],
];
let failed = 0;
for (const [path, status, type, body] of checks) {
  try {
    const r = await fetch(base + path, { redirect: 'manual' });
    const text = await r.text();
    assert.equal(r.status, status, `${path}: статус ${r.status}`);
    assert.ok((r.headers.get('content-type') || '').includes(type), `${path}: content-type ${r.headers.get('content-type')}`);
    assert.match(text, body, `${path}: содержимое`);
    if (type === 'text/html' && path !== '/admin') {
      assert.ok(r.headers.get('content-security-policy'), `${path}: нет CSP`);
      assert.match(text, /<meta name="description"/, `${path}: нет meta description`);
    }
    console.log(`✓ ${path}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${e.message}`);
  }
}
// баннер по стране
for (const [geo, expect] of [['KZ', 'Центральная Азия'], ['AE', 'Ближний Восток'], ['DE', 'Европа']]) {
  const html = await (await fetch(`${base}/?geo=${geo}`)).text();
  const ok = html.includes(`data-region="${expect}`);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} баннер для ${geo} → ${expect}`);
}
process.exit(failed ? 1 : 0);
