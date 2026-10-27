// Скриншоты страниц на трёх ширинах экрана: node test/screens.mjs [baseUrl] [путь1 путь2 ...]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = process.argv[2] || 'http://127.0.0.1:8787';
const paths = process.argv.slice(3).length ? process.argv.slice(3) : ['/', '/about', '/services', '/services/procurement-strategy', '/insights', '/insights/priznaki-nuzhna-strategiya-zakupok', '/contact'];
const sizes = { desktop: [1440, 900], tablet: [820, 1180], mobile: [390, 844] };
await mkdir('test/output', { recursive: true });
const browser = await chromium.launch();
for (const [name, [width, height]] of Object.entries(sizes)) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  for (const p of paths) {
    await page.goto(base + p, { waitUntil: 'networkidle' });
    const file = `test/output/${name}${p.replace(/[^a-z0-9]+/gi, '_') || '_home'}.png`;
    await page.screenshot({ path: file, fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 0) console.log(`ГОРИЗОНТАЛЬНЫЙ СКРОЛЛ ${name} ${p}: +${overflow}px`);
  }
  await page.close();
}
await browser.close();
console.log('готово');
