// Сквозной тест в браузере (Chromium): форма заявки на сайте и основные сценарии админки.
// Делает скриншоты для инструкции в docs/img.
// Запуск: node test/e2e.mjs [baseUrl] [email] [password]
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://127.0.0.1:8787';
const email = process.argv[3] || 'admin@example.com';
const password = process.argv[4] || 'Test12345678';
const shots = process.env.SHOTS || 'docs/img';
await mkdir(shots, { recursive: true });
await mkdir('test/output', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1360, height: 860 }, locale: 'ru-RU' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
const shot = (name, opts = {}) => page.screenshot({ path: `${shots}/${name}.jpg`, type: 'jpeg', quality: 78, ...opts });
const step = (s) => console.log(`• ${s}`);
const toast = async (text) => page.locator('.toast', { hasText: text }).first().waitFor({ timeout: 15000 });

// --- 1. заявка с сайта ---
step('форма обратной связи на сайте');
await page.goto(`${base}/contact`);
await page.fill('#f-name', 'Тест Тестович');
await page.fill('#f-company', 'ООО «Проверка»');
await page.fill('#f-email', 'test@example.com');
await page.fill('#f-phone', '+7 700 000 00 01');
await page.selectOption('#f-topic', { index: 1 });
await page.fill('#f-message', 'Тестовый запрос из автотеста: проверка формы обратной связи.');
await page.check('#f-consent');
await page.waitForTimeout(2600); // защита от ботов не принимает слишком быструю отправку
await page.click('#contact-form [type=submit]');
await page.locator('#form-status.ok').waitFor({ timeout: 15000 });
await shot('site-contact-sent', { fullPage: false });

// --- 2. вход ---
step('вход в админку');
await page.goto(`${base}/admin`);
await page.fill('input[type=email]', email);
await page.fill('input[type=password]', password);
await shot('admin-login');
await page.click('button[type=submit]');
await page.locator('.stat-card').first().waitFor();
await shot('admin-dashboard');
assert.equal(await page.locator('[data-badge="subs"]').textContent(), '1', 'счётчик новых заявок');

// --- 3. правка главной ---
step('правка текста главной страницы');
await page.goto(`${base}/admin#/doc/page:home`);
const sub = page.locator('.panel', { hasText: 'Первый экран' }).locator('textarea').first();
await sub.waitFor();
const newText = `Независимые эксперты по закупкам: снижаем затраты, укрепляем цепочку поставок и управляем рисками (${new Date().toISOString().slice(11, 19)})`;
await sub.fill(newText);
await shot('admin-page-home');
await page.keyboard.press('Control+s');
await toast('Сохранено');
await page.goto(`${base}/`);
assert.ok((await page.content()).includes(newText), 'новый текст на главной');

// --- 4. изображение в специализации ---
step('загрузка изображения в специализацию');
await page.goto(`${base}/admin#/list/service`);
await page.locator('.list-title').first().click();
await page.locator('.img-field').first().waitFor();
await shot('admin-service');
const [chooser] = await Promise.all([
  page.waitForEvent('filechooser'),
  page.locator('.panel', { hasText: 'Изображение' }).locator('label.btn', { hasText: 'Загрузить' }).first().click(),
]);
await chooser.setFiles('test/fixtures/photo.jpg');
await toast('Изображение загружено');
await page.locator('.panel', { hasText: 'Изображение' }).locator('.img-side input[type=text]').first().fill('Совещание с поставщиками');
await page.click('.savebar .btn-primary');
await toast('Сохранено');
const href = await page.locator('a.btn', { hasText: 'На сайте' }).getAttribute('href');
await page.goto(base + href);
const srcset = await page.locator('.split-media img').getAttribute('srcset');
assert.ok(/\/media\/m_[0-9a-f]+_\d+\.(webp|jpg) \d+w/.test(srcset || ''), `srcset с размерами: ${srcset}`);
await shot('site-service-with-image');

// --- 5. документ в DMS ---
step('загрузка документа в DMS');
await page.goto(`${base}/admin#/documents`);
await page.click('text=+ Загрузить документ');
const dlg = page.locator('.modal');
await dlg.locator('select').nth(0).selectOption('POL');
await dlg.locator('select').nth(1).selectOption('STR');
await dlg.locator('select').nth(2).selectOption('public');
await dlg.locator('.field', { hasText: 'Название' }).locator('input').fill('Политика закупок (шаблон)');
await dlg.locator('input[type=file]').setInputFiles('test/fixtures/policy.pdf');
await dlg.locator('.doc-preview strong').waitFor();
const number = await dlg.locator('.doc-preview strong').textContent();
assert.match(number, /^POL-STR-\d{4}-001$/);
await shot('admin-dms-upload');
await dlg.locator('button[type=submit]').click();
await toast('загружен');
await page.locator('.dl').waitFor();
await shot('admin-dms-document');
await page.goto(`${base}/admin#/documents`);
await page.locator('.table tbody tr').first().waitFor();
await shot('admin-dms-list');

// --- 6. прочие разделы ---
for (const [hash, name, wait] of [
  ['#/submissions', 'admin-submissions', '.sub'], ['#/media', 'admin-media', '.media-tile'], ['#/list/hero', 'admin-heroes', '.list-row'],
  ['#/doc/settings', 'admin-settings', '.panel'], ['#/doc/form:contact', 'admin-form', '.array'], ['#/list/article', 'admin-articles', '.list-row'],
  ['#/schemas', 'admin-schemas', '.raw-json'], ['#/users', 'admin-users', '.table'], ['#/list/case', 'admin-cases', '.list-row'],
]) {
  step(`раздел ${hash}`);
  await page.goto(`${base}/admin${hash}`);
  await page.locator(wait).first().waitFor();
  await shot(name);
}
step('редактор статьи (markdown)');
await page.goto(`${base}/admin#/list/article`);
await page.locator('.list-title').first().click();
await page.locator('.md-text').waitFor();
await page.locator('.md .md-text').scrollIntoViewIfNeeded();
await shot('admin-article');

step('публичная страница «Аналитика» показывает документ');
await page.goto(`${base}/insights`);
assert.ok((await page.content()).includes(number), 'публичный документ в разделе «Аналитика»');
const dl = await Promise.all([page.waitForEvent('download'), page.locator('.file a').first().click()]);
assert.ok(dl[0].suggestedFilename().startsWith(number), `имя скачанного файла: ${dl[0].suggestedFilename()}`);

// --- 7. телефон ---
step('админка на телефоне');
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mob.context().addCookies(await ctx.cookies());
await mob.goto(`${base}/admin#/doc/page:home`);
await mob.locator('.panel').first().waitFor();
await mob.screenshot({ path: `${shots}/admin-mobile.jpg`, type: 'jpeg', quality: 78 });
const overflow = await mob.evaluate(() => document.documentElement.scrollWidth - innerWidth);
assert.ok(overflow <= 0, `горизонтальный скролл в админке на телефоне: ${overflow}px`);

await browser.close();
await writeFile('test/output/e2e-errors.txt', errors.join('\n'));
if (errors.length) { console.log('Ошибки в консоли браузера:\n' + errors.join('\n')); process.exit(1); }
console.log('✓ e2e пройден без ошибок');
