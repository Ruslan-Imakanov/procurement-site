// Юнит-тесты: node --test test/unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { markdown } from '../src/lib/md.js';
import { formatNumber, formatFilename, counterKey } from '../src/lib/dms.js';
import { slugify, deepMerge, jsonForScript, h, raw, safeUrl } from '../src/lib/util.js';
import { SCHEMAS } from '../src/schemas.js';
import { SEED_DOCS, SEED_ENTRIES } from '../src/seed.js';
import { SINGLETONS, COLLECTIONS, SLUG_TYPES } from '../src/content-types.js';

test('markdown: экранирует HTML и опасные ссылки', () => {
  const html = markdown('Текст <script>alert(1)</script> [x](javascript:alert(1)) ![a](data:x)');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('href="#"'));
  assert.ok(html.includes('src="#"'));
});

test('markdown: заголовки, списки, таблицы, цитаты', () => {
  const html = markdown('## Заголовок\n\n- раз\n- два\n  - вложенный\n\n1. первый\n2. второй\n\n> цитата\n\n| A | B |\n|---|--:|\n| 1 | 2 |\n\n**ж** *к* `код`');
  assert.match(html, /<h2>Заголовок<\/h2>/);
  assert.match(html, /<ul><li>раз<\/li><li>два<ul><li>вложенный<\/li><\/ul><\/li><\/ul>/);
  assert.match(html, /<ol><li>первый<\/li><li>второй<\/li><\/ol>/);
  assert.match(html, /<blockquote><p>цитата<\/p><\/blockquote>/);
  assert.match(html, /<td style="text-align:right">2<\/td>/);
  assert.match(html, /<strong>ж<\/strong> <em>к<\/em> <code>код<\/code>/);
});

test('markdown: внешние ссылки открываются в новой вкладке', () => {
  assert.match(markdown('[сайт](https://example.com)'), /target="_blank" rel="noopener"/);
  assert.doesNotMatch(markdown('[контакты](/contact)'), /target=/);
});

test('DMS: номер и имя файла по шаблонам', () => {
  const n = formatNumber('{type}-{dept}-{year}-{seq:3}', { type: 'pol', dept: 'Str', date: '2026-10-27', seq: 7 });
  assert.equal(n, 'POL-STR-2026-007');
  assert.equal(counterKey({ type: 'POL', dept: 'STR', date: '2025-01-02' }), 'POL-STR-2025');
  const f = formatFilename('{number}_v{version}_{title}', { number: n, version: 2, title: 'Политика закупок: «итог»', originalName: 'Doc.FINAL.PDF' });
  assert.equal(f, 'POL-STR-2026-007_v2_politika-zakupok-itog.pdf');
  assert.equal(formatFilename('{number}', { number: 'A-1', originalName: 'noext' }), 'A-1');
});

test('slugify: транслитерация русских и казахских букв', () => {
  assert.equal(slugify('Стратегия закупок 2026!'), 'strategiya-zakupok-2026');
  assert.equal(slugify('Қазақстан және Өзбекстан'), 'kazakstan-zhane-ozbekstan');
});

test('deepMerge: объекты сливаются, массивы заменяются', () => {
  const r = deepMerge({ a: 1, o: { x: 1, y: 2 }, list: [1, 2] }, { o: { y: 3 }, list: [] });
  assert.deepEqual(r, { a: 1, o: { x: 1, y: 3 }, list: [] });
});

test('h``: экранирует подстановки, raw — нет', () => {
  assert.equal(String(h`<p>${'<b>'}</p>`), '<p>&lt;b&gt;</p>');
  assert.equal(String(h`<p>${raw('<b>')}</p>`), '<p><b></p>');
  assert.equal(String(h`<p>${['a', h`<i>${'&'}</i>`]}</p>`), '<p>a<i>&amp;</i></p>');
});

test('jsonForScript не позволяет закрыть тег script', () => {
  assert.ok(!jsonForScript({ x: '</script><script>' }).includes('</script>'));
});

test('safeUrl', () => {
  assert.equal(safeUrl('javascript:alert(1)'), '#');
  assert.equal(safeUrl('/contact'), '/contact');
  assert.equal(safeUrl('tel:+77000000000'), 'tel:+77000000000');
});

// Схемы и стартовый контент должны совпадать — иначе форма в админке не покажет поле.
function checkAgainst(schema, value, path) {
  if (value === undefined || value === null) return;
  if (schema.type === 'object') {
    assert.equal(typeof value, 'object', `${path}: ожидается объект`);
    for (const k of Object.keys(value)) assert.ok(schema.properties[k], `${path}.${k}: поля нет в схеме`);
    for (const [k, s] of Object.entries(schema.properties)) checkAgainst(s, value[k], `${path}.${k}`);
  } else if (schema.type === 'array') {
    assert.ok(Array.isArray(value), `${path}: ожидается массив`);
    value.forEach((v, i) => checkAgainst(schema.items, v, `${path}[${i}]`));
  } else if (schema.type === 'string') {
    assert.equal(typeof value, 'string', `${path}: ожидается строка`);
    if (schema.enum && value) assert.ok(schema.enum.includes(value), `${path}: «${value}» нет среди вариантов`);
  } else if (schema.type === 'boolean') {
    assert.equal(typeof value, 'boolean', `${path}: ожидается true/false`);
  }
}

test('стартовый контент соответствует схемам', () => {
  for (const key of SINGLETONS) {
    assert.ok(SCHEMAS[key], `нет схемы ${key}`);
    checkAgainst(SCHEMAS[key], SEED_DOCS[key], key);
  }
  for (const e of SEED_ENTRIES) {
    assert.ok(COLLECTIONS.includes(e.type), `неизвестный тип ${e.type}`);
    checkAgainst(SCHEMAS[e.type], e.data, `${e.type}:${e.data.slug || e.data.name}`);
  }
  for (const t of SLUG_TYPES) assert.ok(SCHEMAS[t].properties.slug, `${t} без slug`);
});
