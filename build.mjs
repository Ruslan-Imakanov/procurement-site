// Сборка:
//   dist/worker.js  — код Worker (один файл, ES-модуль)
//   dist/assets/    — статика, которую Cloudflare отдаёт без запуска Worker:
//     admin/app.js, admin/app.css — админка
//     static/*.svg, favicon.svg   — заглушки изображений и иконка
//     _data/site.css, site.js     — стили и скрипт сайта (Worker встраивает их в каждую страницу)
//     _data/seed.json             — стартовый контент (записывается в базу при первом запуске)
//     _data/schemas.json          — схемы контента для форм админки
import * as esbuild from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { SEED_DOCS, SEED_ENTRIES } from './src/seed.js';
import { SCHEMAS } from './src/schemas.js';
import { SEED_I18N } from './src/seed-i18n.js';
import { HEROES, LOGOS, FAVICON } from './src/static-art.js';

const dev = process.argv.includes('--dev');
const BROWSERS = ['chrome110', 'firefox115', 'safari16', 'edge110'];
const out = (p) => path.join('dist/assets', p);

async function write(p, data) {
  await mkdir(path.dirname(p), { recursive: true });
  await writeFile(p, data);
}

// стили и скрипт сайта
const minify = async (file, loader) => {
  const src = await readFile(file, 'utf8');
  return dev ? src : (await esbuild.transform(src, { loader, minify: true, target: BROWSERS })).code.trim();
};
await write(out('_data/site.css'), await minify('src/client/site.css', 'css'));
await write(out('_data/site.js'), await minify('src/client/site.js', 'js'));

// админка
const admin = await esbuild.build({
  entryPoints: ['src/client/admin.js'], bundle: true, write: false, format: 'esm', minify: !dev, target: BROWSERS, charset: 'utf8', legalComments: 'none',
});
const adminJs = admin.outputFiles[0].text;
const adminCss = await minify('src/client/admin.css', 'css');
await write(out('admin/app.js'), adminJs);
await write(out('admin/app.css'), adminCss);
const adminVer = createHash('sha256').update(adminJs + adminCss).digest('hex').slice(0, 10);

// данные и графика
await write(out('_data/seed.json'), JSON.stringify({ docs: SEED_DOCS, entries: SEED_ENTRIES }));
await write(out('_data/schemas.json'), JSON.stringify(SCHEMAS));
await write(out('_data/i18n.json'), JSON.stringify(SEED_I18N));
const statics = { ...HEROES, ...LOGOS };
for (const [name, svg] of Object.entries(statics)) await write(out(`static/${name}.svg`), svg);
await write(out('favicon.svg'), FAVICON);
const staticVer = createHash('sha256').update(JSON.stringify(statics) + FAVICON).digest('hex').slice(0, 8);
await write(out('_headers'), [
  '/admin/*', '  Cache-Control: public, max-age=31536000, immutable', '  X-Content-Type-Options: nosniff',
  '/static/*', '  Cache-Control: public, max-age=31536000, immutable', '  X-Content-Type-Options: nosniff',
  '/_data/*', '  X-Robots-Tag: noindex', '',
].join('\n'));

// Worker
const define = { __ADMIN_VER__: JSON.stringify(adminVer), __STATIC_VER__: JSON.stringify(staticVer) };
await write('dist/defines.json', JSON.stringify(define));
const result = await esbuild.build({
  entryPoints: ['src/index.js'], bundle: true, format: 'esm', target: 'es2022', platform: 'neutral',
  conditions: ['workerd', 'worker', 'browser'], external: ['cloudflare:*'], outfile: 'dist/worker.js',
  minify: !dev, charset: 'utf8', legalComments: 'none', metafile: true,
  define,
});
const size = Object.values(result.metafile.outputs)[0].bytes;
console.log(`dist/worker.js — ${(size / 1024).toFixed(1)} KB; admin ${adminVer} — ${(adminJs.length / 1024).toFixed(1)} KB`);
