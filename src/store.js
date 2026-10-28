// Единое хранилище сайта: Durable Object с SQLite внутри.
// Контент, медиафайлы, документы DMS, заявки, пользователи и сессии — всё здесь.
// Файлы хранятся кусками по 1 МБ (ограничение размера строки SQLite в Durable Objects — 2 МБ).
// Стартовый контент и схемы лежат в статике (/_data/*.json, собираются из seed.js и schemas.js).

import { DurableObject } from 'cloudflare:workers';
import { SINGLETONS, COLLECTIONS, SLUG_TYPES } from './content-types.js';
import { deepMerge, overlay, LOCALES, randomId, slugify, sha256hex, b64url } from './lib/util.js';
import { hashPassword, verifyPassword, checkPasswordStrength } from './lib/password.js';
import { counterKey, formatNumber, formatFilename } from './lib/dms.js';

const CHUNK = 1024 * 1024;
const SESSION_TTL = 14 * 24 * 3600 * 1000;
const now = () => new Date().toISOString();

// Ошибка для пользователя. Через RPC передаётся только message, поэтому код статуса
// кодируется в самом сообщении и разбирается воркером (см. parseAppError).
export class AppError extends Error {
  constructor(message, status = 400) { super(`§${status}§${message}`); }
}
export function parseAppError(err) {
  const m = /^§(\d{3})§([\s\S]*)$/.exec(String(err?.message || ''));
  return m ? { status: Number(m[1]), message: m[2] } : null;
}

export class Store extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    ctx.blockConcurrencyWhile(async () => {
      await this.loadDefaults();
      this.migrate();
    });
  }

  async loadDefaults() {
    const get = async (path) => {
      const r = await this.env.ASSETS.fetch(`https://assets.local${path}`);
      if (!r.ok) throw new Error(`Не найден ${path}: ${r.status}`);
      return r.json();
    };
    const [seed, schemas, i18n] = await Promise.all([get('/_data/seed.json'), get('/_data/schemas.json'), get('/_data/i18n.json')]);
    this.seedI18n = i18n;
    this.seedDocs = seed.docs;
    this.seedEntries = seed.entries;
    this.schemas = schemas;
  }

  // ---------- инфраструктура ----------
  rows(q, ...args) { return this.sql.exec(q, ...args).toArray(); }
  one(q, ...args) { return this.rows(q, ...args)[0] ?? null; }
  meta(key) { return this.one('SELECT value FROM meta WHERE key=?', key)?.value ?? null; }
  setMeta(key, value) { this.sql.exec('INSERT OR REPLACE INTO meta(key, value) VALUES (?, ?)', key, String(value)); }
  bump() { this.setMeta('content_version', Number(this.meta('content_version') || 0) + 1); }

  migrate() {
    this.sql.exec('CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT)');
    const v = Number(this.meta('schema_version') || 0);
    if (v < 1) {
      this.sql.exec(`
        CREATE TABLE IF NOT EXISTS docs(key TEXT PRIMARY KEY, data TEXT NOT NULL, updated_at TEXT, updated_by TEXT);
        CREATE TABLE IF NOT EXISTS entries(id TEXT PRIMARY KEY, type TEXT NOT NULL, slug TEXT, status TEXT NOT NULL DEFAULT 'published',
          sort INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL, created_at TEXT, updated_at TEXT, updated_by TEXT);
        CREATE INDEX IF NOT EXISTS entries_type ON entries(type, sort);
        CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY, name TEXT, mime TEXT, size INTEGER, width INTEGER, height INTEGER,
          alt TEXT, variants TEXT, created_at TEXT, created_by TEXT);
        CREATE TABLE IF NOT EXISTS blob_meta(blob_id TEXT PRIMARY KEY, mime TEXT, size INTEGER, chunks INTEGER);
        CREATE TABLE IF NOT EXISTS blobs(blob_id TEXT NOT NULL, idx INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY(blob_id, idx));
        CREATE TABLE IF NOT EXISTS documents(id TEXT PRIMARY KEY, number TEXT UNIQUE, type TEXT, dept TEXT, year INTEGER, seq INTEGER,
          title TEXT, description TEXT, doc_date TEXT, owner TEXT, client TEXT, access TEXT, tags TEXT, version INTEGER,
          created_at TEXT, created_by TEXT, updated_at TEXT, updated_by TEXT);
        CREATE TABLE IF NOT EXISTS document_versions(id TEXT PRIMARY KEY, doc_id TEXT NOT NULL, version INTEGER, filename TEXT,
          original_name TEXT, mime TEXT, size INTEGER, blob_id TEXT, note TEXT, uploaded_at TEXT, uploaded_by TEXT);
        CREATE INDEX IF NOT EXISTS docver_doc ON document_versions(doc_id, version);
        CREATE TABLE IF NOT EXISTS counters(key TEXT PRIMARY KEY, value INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS submissions(id TEXT PRIMARY KEY, created_at TEXT, data TEXT, meta TEXT, status TEXT DEFAULT 'new');
        CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT, role TEXT, pass TEXT, created_at TEXT, last_login TEXT);
        CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER, created_at INTEGER);
        CREATE TABLE IF NOT EXISTS rate(key TEXT PRIMARY KEY, count INTEGER, reset_at INTEGER);
      `);
      this.seed();
      this.setMeta('schema_version', 1);
    }
  }

  seed() {
    const t = now();
    for (const [key, data] of Object.entries(this.seedDocs)) {
      this.sql.exec('INSERT OR IGNORE INTO docs(key, data, updated_at, updated_by) VALUES (?, ?, ?, ?)', key, JSON.stringify(data), t, 'seed');
    }
    if (!this.one('SELECT 1 AS x FROM entries LIMIT 1')) {
      for (const e of this.seedEntries) {
        this.sql.exec('INSERT INTO entries(id, type, slug, status, sort, data, created_at, updated_at, updated_by) VALUES (?,?,?,?,?,?,?,?,?)',
          randomId(8), e.type, e.data.slug || null, e.status || 'published', e.sort || 0, JSON.stringify(e.data), t, t, 'seed');
      }
    }
    this.bump();
  }

  // ---------- публичный снимок контента (для рендера страниц) ----------
  getSnapshot() {
    const docs = {};
    for (const key of SINGLETONS) docs[key] = this.getDoc(key);
    const entries = this.rows("SELECT id, type, slug, sort, data, created_at, updated_at FROM entries WHERE status='published' ORDER BY type, sort, created_at")
      .map((r) => ({ id: r.id, type: r.type, slug: r.slug, sort: r.sort, created_at: r.created_at, updated_at: r.updated_at, data: JSON.parse(r.data) }));
    const media = {};
    for (const m of this.rows('SELECT id, mime, width, height, alt, variants FROM media')) {
      media[m.id] = { mime: m.mime, w: m.width, h: m.height, alt: m.alt, v: JSON.parse(m.variants || '[]') };
    }
    const publicDocs = this.rows(`SELECT d.id, d.number, d.title, d.description, d.doc_date, d.type, d.version, v.filename, v.size, v.mime
      FROM documents d JOIN document_versions v ON v.doc_id = d.id AND v.version = d.version
      WHERE d.access = 'public' ORDER BY d.doc_date DESC, d.number DESC`);
    const i18n = {};
    for (const loc of LOCALES.slice(1)) {
      const d = {};
      for (const key of SINGLETONS) d[key] = this.docOverlay(loc, key);
      const e = {};
      for (const en of entries) {
        const ov = this.entryOverlay(loc, en.id, en.type, en.slug, en.data);
        if (ov) e[en.id] = ov;
      }
      i18n[loc] = { docs: d, entries: e };
    }
    return { version: Number(this.meta('content_version') || 0), docs, entries, media, publicDocs, i18n };
  }

  contentVersion() { return Number(this.meta('content_version') || 0); }

  // ---------- одиночные документы ----------
  getDoc(key) {
    const row = this.one('SELECT data FROM docs WHERE key=?', key);
    const stored = row ? JSON.parse(row.data) : undefined;
    return this.seedDocs[key] ? deepMerge(this.seedDocs[key], stored) : stored ?? null;
  }

  // Ключи переводов: «kk:page:home», «en:settings», «kk:e:<id записи>»
  parseKey(key) {
    const m = /^(kk|en):(.+)$/.exec(String(key));
    return m ? { loc: m[1], base: m[2] } : { loc: '', base: String(key) };
  }

  docOverlay(loc, key) {
    const row = this.one('SELECT data FROM docs WHERE key=?', `${loc}:${key}`);
    const seed = this.seedI18n?.[loc]?.docs?.[key];
    return overlay(seed ?? {}, row ? JSON.parse(row.data) : undefined);
  }

  entryOverlay(loc, id, type, slug, data) {
    const row = this.one('SELECT data FROM docs WHERE key=?', `${loc}:e:${id}`);
    const seed = this.seedI18n?.[loc]?.entries?.[`${type}:${slug || data?.name || ''}`];
    if (!row && !seed) return null;
    return overlay(seed ?? {}, row ? JSON.parse(row.data) : undefined);
  }

  getTranslation(key) {
    const { loc, base } = this.parseKey(key);
    const em = /^e:([0-9a-f]+)$/.exec(base);
    if (em) {
      const e = this.getEntry(em[1]);
      return this.entryOverlay(loc, e.id, e.type, e.slug, e.data) || {};
    }
    if (!SINGLETONS.includes(base)) throw new AppError('Неизвестный документ', 404);
    return this.docOverlay(loc, base);
  }

  putDoc(key, data, user) {
    const { loc, base } = this.parseKey(key);
    if (loc) {
      if (!SINGLETONS.includes(base) && !/^e:[0-9a-f]+$/.test(base)) throw new AppError('Неизвестный документ', 404);
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new AppError('Ожидается объект');
      this.sql.exec('INSERT OR REPLACE INTO docs(key, data, updated_at, updated_by) VALUES (?, ?, ?, ?)', key, JSON.stringify(data), now(), user?.email || '');
      this.bump();
      return this.getTranslation(key);
    }
    if (!SINGLETONS.includes(key)) throw new AppError('Неизвестный документ', 404);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new AppError('Ожидается объект');
    this.sql.exec('INSERT OR REPLACE INTO docs(key, data, updated_at, updated_by) VALUES (?, ?, ?, ?)', key, JSON.stringify(data), now(), user?.email || '');
    this.bump();
    return this.getDoc(key);
  }

  // ---------- схемы контента (переопределения) ----------
  getSchemas() {
    const out = {};
    for (const name of Object.keys(this.schemas)) {
      const row = this.one('SELECT data FROM docs WHERE key=?', `schema:${name}`);
      out[name] = { schema: row ? JSON.parse(row.data) : this.schemas[name], custom: !!row };
    }
    return out;
  }

  putSchema(name, schema, user) {
    if (!this.schemas[name]) throw new AppError('Неизвестная схема', 404);
    if (schema === null) {
      this.sql.exec('DELETE FROM docs WHERE key=?', `schema:${name}`);
    } else {
      if (!schema || schema.type !== 'object' || typeof schema.properties !== 'object') throw new AppError('Схема должна быть объектом с type: "object" и properties');
      this.sql.exec('INSERT OR REPLACE INTO docs(key, data, updated_at, updated_by) VALUES (?, ?, ?, ?)', `schema:${name}`, JSON.stringify(schema), now(), user?.email || '');
    }
    return this.getSchemas()[name];
  }

  // ---------- коллекции ----------
  listEntries(type) {
    return this.rows('SELECT id, type, slug, status, sort, data, created_at, updated_at, updated_by FROM entries WHERE type=? ORDER BY sort, created_at', type)
      .map((r) => ({ ...r, data: JSON.parse(r.data) }));
  }

  getEntry(id) {
    const r = this.one('SELECT * FROM entries WHERE id=?', id);
    if (!r) throw new AppError('Запись не найдена', 404);
    return { ...r, data: JSON.parse(r.data) };
  }

  saveEntry({ id, type, status, data }, user) {
    if (!COLLECTIONS.includes(type)) throw new AppError('Неизвестный тип записи');
    if (!data || typeof data !== 'object') throw new AppError('Нет данных');
    const hasSlug = SLUG_TYPES.includes(type);
    let slug = null;
    if (hasSlug) {
      slug = slugify(data.slug || data.title || '') || randomId(4);
      // уникальность адреса внутри типа
      let n = 1;
      const base = slug;
      while (this.one('SELECT 1 AS x FROM entries WHERE type=? AND slug=? AND id<>?', type, slug, id || '')) slug = `${base}-${++n}`;
      data = { ...data, slug };
    }
    const t = now();
    const st = status === 'draft' ? 'draft' : 'published';
    if (id && this.one('SELECT 1 AS x FROM entries WHERE id=?', id)) {
      this.sql.exec('UPDATE entries SET slug=?, status=?, data=?, updated_at=?, updated_by=? WHERE id=?', slug, st, JSON.stringify(data), t, user?.email || '', id);
    } else {
      id = randomId(8);
      const sort = (this.one('SELECT MAX(sort) AS m FROM entries WHERE type=?', type)?.m ?? 0) + 1;
      this.sql.exec('INSERT INTO entries(id, type, slug, status, sort, data, created_at, updated_at, updated_by) VALUES (?,?,?,?,?,?,?,?,?)',
        id, type, slug, st, sort, JSON.stringify(data), t, t, user?.email || '');
    }
    this.bump();
    return this.getEntry(id);
  }

  deleteEntry(id) {
    this.sql.exec('DELETE FROM entries WHERE id=?', id);
    this.sql.exec('DELETE FROM docs WHERE key IN (?, ?)', `kk:e:${id}`, `en:e:${id}`);
    this.bump();
    return { ok: true };
  }

  reorderEntries(type, ids) {
    ids.forEach((id, i) => this.sql.exec('UPDATE entries SET sort=? WHERE id=? AND type=?', i + 1, id, type));
    this.bump();
    return { ok: true };
  }

  // ---------- бинарные данные ----------
  putBlob(blobId, mime, bytes) {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    this.sql.exec('DELETE FROM blobs WHERE blob_id=?', blobId);
    const n = Math.max(1, Math.ceil(u8.length / CHUNK));
    for (let i = 0; i < n; i++) {
      this.sql.exec('INSERT INTO blobs(blob_id, idx, data) VALUES (?, ?, ?)', blobId, i, u8.slice(i * CHUNK, (i + 1) * CHUNK).buffer);
    }
    this.sql.exec('INSERT OR REPLACE INTO blob_meta(blob_id, mime, size, chunks) VALUES (?, ?, ?, ?)', blobId, mime, u8.length, n);
  }

  getBlob(blobId) {
    const m = this.one('SELECT mime, size FROM blob_meta WHERE blob_id=?', blobId);
    if (!m) return null;
    const out = new Uint8Array(m.size);
    let off = 0;
    for (const r of this.sql.exec('SELECT data FROM blobs WHERE blob_id=? ORDER BY idx', blobId)) {
      const part = new Uint8Array(r.data);
      out.set(part, off);
      off += part.length;
    }
    return { mime: m.mime, size: m.size, bytes: out };
  }

  deleteBlob(blobId) {
    this.sql.exec('DELETE FROM blobs WHERE blob_id=?', blobId);
    this.sql.exec('DELETE FROM blob_meta WHERE blob_id=?', blobId);
  }

  // ---------- медиатека ----------
  // variants: [{ w, h, mime, bytes }] — админка заранее готовит размеры (WebP) в браузере.
  putMedia({ name, alt, variants }, user) {
    if (!Array.isArray(variants) || !variants.length) throw new AppError('Нет файла');
    const id = randomId(8);
    const vmeta = [];
    let size = 0;
    for (const v of variants) {
      const key = `m_${id}_${v.w}`;
      this.putBlob(key, v.mime, v.bytes);
      size += v.bytes.byteLength;
      vmeta.push({ w: v.w, h: v.h, mime: v.mime, key });
    }
    vmeta.sort((a, b) => a.w - b.w);
    const largest = vmeta[vmeta.length - 1];
    this.sql.exec('INSERT INTO media(id, name, mime, size, width, height, alt, variants, created_at, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)',
      id, name || '', largest.mime, size, largest.w, largest.h, alt || '', JSON.stringify(vmeta), now(), user?.email || '');
    this.bump();
    return this.getMedia(id);
  }

  getMedia(id) {
    const m = this.one('SELECT * FROM media WHERE id=?', id);
    if (!m) throw new AppError('Файл не найден', 404);
    return { ...m, variants: JSON.parse(m.variants || '[]') };
  }

  listMedia() {
    return this.rows('SELECT * FROM media ORDER BY created_at DESC').map((m) => ({ ...m, variants: JSON.parse(m.variants || '[]') }));
  }

  updateMedia(id, { alt, name }) {
    this.sql.exec('UPDATE media SET alt=COALESCE(?, alt), name=COALESCE(?, name) WHERE id=?', alt ?? null, name ?? null, id);
    this.bump();
    return this.getMedia(id);
  }

  deleteMedia(id) {
    const m = this.getMedia(id);
    for (const v of m.variants) this.deleteBlob(v.key);
    this.sql.exec('DELETE FROM media WHERE id=?', id);
    this.bump();
    return { ok: true };
  }

  getMediaBlob(key) {
    if (!/^m_[0-9a-f]+_\d+$/.test(key)) return null;
    return this.getBlob(key);
  }

  // ---------- документы (DMS) ----------
  dmsSettings() { return this.getDoc('settings').dms || {}; }

  previewDocument({ type, dept, date, title, originalName }) {
    const s = this.dmsSettings();
    const seq = (this.one('SELECT value FROM counters WHERE key=?', counterKey({ type, dept, date }))?.value || 0) + 1;
    const number = formatNumber(s.numberTemplate, { type, dept, date, seq });
    return { number, filename: formatFilename(s.fileTemplate, { number, version: 1, title, type, dept, date, originalName }) };
  }

  validateDocMeta(meta, creating) {
    const s = this.dmsSettings();
    if (creating) {
      if (!(s.types || []).some((t) => t.code === meta.type)) throw new AppError('Выберите тип документа');
      if (!(s.departments || []).some((t) => t.code === meta.dept)) throw new AppError('Выберите направление');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.doc_date || '')) throw new AppError('Укажите дату документа');
    }
    if (!String(meta.title || '').trim()) throw new AppError('Укажите название документа');
    if (!['public', 'internal', 'confidential'].includes(meta.access)) throw new AppError('Выберите уровень доступа');
  }

  createDocument(meta, file, user) {
    this.validateDocMeta(meta, true);
    if (!file?.bytes) throw new AppError('Прикрепите файл');
    const s = this.dmsSettings();
    const id = randomId(8);
    const t = now();
    let number;
    this.ctx.storage.transactionSync(() => {
      const key = counterKey({ type: meta.type, dept: meta.dept, date: meta.doc_date });
      const seq = (this.one('SELECT value FROM counters WHERE key=?', key)?.value || 0) + 1;
      this.sql.exec('INSERT OR REPLACE INTO counters(key, value) VALUES (?, ?)', key, seq);
      number = formatNumber(s.numberTemplate, { type: meta.type, dept: meta.dept, date: meta.doc_date, seq });
      if (this.one('SELECT 1 AS x FROM documents WHERE number=?', number)) number = `${number}-${id.slice(0, 4)}`;
      this.sql.exec(`INSERT INTO documents(id, number, type, dept, year, seq, title, description, doc_date, owner, client, access, tags, version,
        created_at, created_by, updated_at, updated_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, number, meta.type, meta.dept, Number(meta.doc_date.slice(0, 4)), seq, meta.title.trim(), meta.description || '', meta.doc_date,
      meta.owner || '', meta.client || '', meta.access, meta.tags || '', 1, t, user?.email || '', t, user?.email || '');
      this.storeVersion(id, 1, file, meta.note || 'Первая версия', user);
    });
    if (meta.access === 'public') this.bump();
    return this.getDocument(id);
  }

  storeVersion(docId, version, file, note, user) {
    const d = this.one('SELECT * FROM documents WHERE id=?', docId);
    const s = this.dmsSettings();
    const filename = formatFilename(s.fileTemplate, { number: d.number, version, title: d.title, type: d.type, dept: d.dept, date: d.doc_date, originalName: file.name });
    const blobId = `d_${docId}_${version}`;
    this.putBlob(blobId, file.mime || 'application/octet-stream', file.bytes);
    this.sql.exec(`INSERT INTO document_versions(id, doc_id, version, filename, original_name, mime, size, blob_id, note, uploaded_at, uploaded_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`, randomId(8), docId, version, filename, file.name || '', file.mime || 'application/octet-stream',
    file.bytes.byteLength, blobId, note || '', now(), user?.email || '');
  }

  addDocumentVersion(id, file, note, user) {
    const d = this.one('SELECT * FROM documents WHERE id=?', id);
    if (!d) throw new AppError('Документ не найден', 404);
    if (!file?.bytes) throw new AppError('Прикрепите файл');
    const version = d.version + 1;
    this.ctx.storage.transactionSync(() => {
      this.storeVersion(id, version, file, note, user);
      this.sql.exec('UPDATE documents SET version=?, updated_at=?, updated_by=? WHERE id=?', version, now(), user?.email || '', id);
    });
    if (d.access === 'public') this.bump();
    return this.getDocument(id);
  }

  updateDocument(id, meta, user) {
    const d = this.one('SELECT * FROM documents WHERE id=?', id);
    if (!d) throw new AppError('Документ не найден', 404);
    this.validateDocMeta(meta, false);
    this.sql.exec('UPDATE documents SET title=?, description=?, owner=?, client=?, access=?, tags=?, updated_at=?, updated_by=? WHERE id=?',
      meta.title.trim(), meta.description || '', meta.owner || '', meta.client || '', meta.access, meta.tags || '', now(), user?.email || '', id);
    if (d.access === 'public' || meta.access === 'public') this.bump();
    return this.getDocument(id);
  }

  listDocuments() {
    return this.rows(`SELECT d.*, v.filename, v.size, v.mime FROM documents d
      LEFT JOIN document_versions v ON v.doc_id = d.id AND v.version = d.version ORDER BY d.created_at DESC`);
  }

  getDocument(id) {
    const d = this.one('SELECT * FROM documents WHERE id=?', id);
    if (!d) throw new AppError('Документ не найден', 404);
    d.versions = this.rows('SELECT version, filename, original_name, mime, size, note, uploaded_at, uploaded_by FROM document_versions WHERE doc_id=? ORDER BY version DESC', id);
    return d;
  }

  // publicOnly — для скачивания с сайта без входа
  getDocumentFile(id, version, publicOnly) {
    const d = this.one('SELECT * FROM documents WHERE id=?', id);
    if (!d || (publicOnly && d.access !== 'public')) return null;
    const v = this.one('SELECT * FROM document_versions WHERE doc_id=? AND version=?', id, version || d.version);
    if (!v) return null;
    const blob = this.getBlob(v.blob_id);
    return blob && { filename: v.filename, mime: v.mime, bytes: blob.bytes };
  }

  deleteDocument(id) {
    const d = this.one('SELECT access FROM documents WHERE id=?', id);
    for (const v of this.rows('SELECT blob_id FROM document_versions WHERE doc_id=?', id)) this.deleteBlob(v.blob_id);
    this.sql.exec('DELETE FROM document_versions WHERE doc_id=?', id);
    this.sql.exec('DELETE FROM documents WHERE id=?', id);
    if (d?.access === 'public') this.bump();
    return { ok: true };
  }

  // ---------- заявки ----------
  addSubmission(data, meta) {
    const id = randomId(8);
    this.sql.exec('INSERT INTO submissions(id, created_at, data, meta, status) VALUES (?, ?, ?, ?, ?)', id, now(), JSON.stringify(data), JSON.stringify(meta || {}), 'new');
    return { id };
  }

  listSubmissions() {
    return this.rows('SELECT * FROM submissions ORDER BY created_at DESC LIMIT 1000').map((r) => ({ ...r, data: JSON.parse(r.data), meta: JSON.parse(r.meta || '{}') }));
  }

  setSubmissionStatus(id, status) {
    if (!['new', 'done', 'spam'].includes(status)) throw new AppError('Неверный статус');
    this.sql.exec('UPDATE submissions SET status=? WHERE id=?', status, id);
    return { ok: true };
  }

  deleteSubmission(id) { this.sql.exec('DELETE FROM submissions WHERE id=?', id); return { ok: true }; }

  counts() {
    return {
      newSubmissions: this.one("SELECT COUNT(*) AS n FROM submissions WHERE status='new'").n,
      documents: this.one('SELECT COUNT(*) AS n FROM documents').n,
      articles: this.one("SELECT COUNT(*) AS n FROM entries WHERE type='article'").n,
      media: this.one('SELECT COUNT(*) AS n FROM media').n,
    };
  }

  // ---------- ограничение частоты ----------
  rateHit(key, limit, windowSec) {
    const t = Date.now();
    const r = this.one('SELECT count, reset_at FROM rate WHERE key=?', key);
    if (!r || r.reset_at < t) {
      this.sql.exec('INSERT OR REPLACE INTO rate(key, count, reset_at) VALUES (?, 1, ?)', key, t + windowSec * 1000);
      if (Math.random() < 0.02) this.sql.exec('DELETE FROM rate WHERE reset_at < ?', t);
      return true;
    }
    if (r.count >= limit) return false;
    this.sql.exec('UPDATE rate SET count = count + 1 WHERE key=?', key);
    return true;
  }

  // ---------- пользователи и сессии ----------
  publicUser(u) { return u && { id: u.id, email: u.email, name: u.name, role: u.role, created_at: u.created_at, last_login: u.last_login }; }

  hasUsers() { return !!this.one('SELECT 1 AS x FROM users LIMIT 1'); }

  async createUser({ email, name, role, password }, { bootstrap } = {}) {
    email = String(email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new AppError('Неверный e-mail');
    if (!['admin', 'editor'].includes(role)) throw new AppError('Неверная роль');
    const weak = checkPasswordStrength(password);
    if (weak) throw new AppError(weak);
    if (bootstrap && this.hasUsers()) throw new AppError('Администратор уже создан', 409);
    if (this.one('SELECT 1 AS x FROM users WHERE email=?', email)) throw new AppError('Пользователь с таким e-mail уже есть', 409);
    const pass = await hashPassword(password);
    const id = randomId(8);
    this.sql.exec('INSERT INTO users(id, email, name, role, pass, created_at) VALUES (?, ?, ?, ?, ?, ?)', id, email, String(name || '').trim(), role, pass, now());
    return this.publicUser(this.one('SELECT * FROM users WHERE id=?', id));
  }

  listUsers() { return this.rows('SELECT * FROM users ORDER BY created_at').map((u) => this.publicUser(u)); }

  async updateUser(id, { name, role, password }) {
    const u = this.one('SELECT * FROM users WHERE id=?', id);
    if (!u) throw new AppError('Пользователь не найден', 404);
    if (role && !['admin', 'editor'].includes(role)) throw new AppError('Неверная роль');
    if (role === 'editor' && u.role === 'admin' && this.one("SELECT COUNT(*) AS n FROM users WHERE role='admin'").n < 2) {
      throw new AppError('Нельзя снять роль с последнего администратора');
    }
    if (password) {
      const weak = checkPasswordStrength(password);
      if (weak) throw new AppError(weak);
      this.sql.exec('UPDATE users SET pass=? WHERE id=?', await hashPassword(password), id);
      this.sql.exec('DELETE FROM sessions WHERE user_id=?', id);
    }
    this.sql.exec('UPDATE users SET name=COALESCE(?, name), role=COALESCE(?, role) WHERE id=?', name ?? null, role ?? null, id);
    return this.publicUser(this.one('SELECT * FROM users WHERE id=?', id));
  }

  deleteUser(id) {
    const u = this.one('SELECT * FROM users WHERE id=?', id);
    if (!u) return { ok: true };
    if (u.role === 'admin' && this.one("SELECT COUNT(*) AS n FROM users WHERE role='admin'").n < 2) throw new AppError('Нельзя удалить последнего администратора');
    this.sql.exec('DELETE FROM sessions WHERE user_id=?', id);
    this.sql.exec('DELETE FROM users WHERE id=?', id);
    return { ok: true };
  }

  async changePassword(userId, oldPassword, newPassword) {
    const u = this.one('SELECT * FROM users WHERE id=?', userId);
    if (!u || !(await verifyPassword(oldPassword, u.pass))) throw new AppError('Текущий пароль указан неверно', 403);
    const weak = checkPasswordStrength(newPassword);
    if (weak) throw new AppError(weak);
    this.sql.exec('UPDATE users SET pass=? WHERE id=?', await hashPassword(newPassword), userId);
    return { ok: true };
  }

  async login(email, password, ip) {
    email = String(email || '').trim().toLowerCase();
    if (!this.rateHit(`login:${ip}`, 20, 900) || !this.rateHit(`login:${email}`, 10, 900)) {
      throw new AppError('Слишком много попыток входа. Подождите 15 минут', 429);
    }
    const u = this.one('SELECT * FROM users WHERE email=?', email);
    // проверяем пароль даже для несуществующего пользователя — одинаковое время ответа
    const ok = await verifyPassword(password, u?.pass || 'pbkdf2$100000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=');
    if (!u || !ok) throw new AppError('Неверный e-mail или пароль', 401);
    const token = b64url(crypto.getRandomValues(new Uint8Array(32)));
    const t = Date.now();
    this.sql.exec('INSERT INTO sessions(token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)', await sha256hex(token), u.id, t + SESSION_TTL, t);
    this.sql.exec('UPDATE users SET last_login=? WHERE id=?', now(), u.id);
    this.sql.exec('DELETE FROM sessions WHERE expires_at < ?', t);
    return { token, user: this.publicUser(u) };
  }

  async session(token) {
    if (!token) return null;
    const s = this.one('SELECT * FROM sessions WHERE token_hash=?', await sha256hex(token));
    if (!s || s.expires_at < Date.now()) return null;
    // продлеваем активную сессию не чаще раза в сутки
    if (s.expires_at - Date.now() < SESSION_TTL - 86400000) this.sql.exec('UPDATE sessions SET expires_at=? WHERE token_hash=?', Date.now() + SESSION_TTL, s.token_hash);
    return this.publicUser(this.one('SELECT * FROM users WHERE id=?', s.user_id));
  }

  async logout(token) {
    if (token) this.sql.exec('DELETE FROM sessions WHERE token_hash=?', await sha256hex(token));
    return { ok: true };
  }

  // ---------- резервная копия (без файлов) ----------
  exportAll() {
    return {
      exported_at: now(),
      docs: this.rows("SELECT key, data, updated_at FROM docs").map((r) => ({ ...r, data: JSON.parse(r.data) })),
      entries: this.rows('SELECT * FROM entries').map((r) => ({ ...r, data: JSON.parse(r.data) })),
      media: this.rows('SELECT id, name, mime, size, width, height, alt, created_at FROM media'),
      documents: this.rows('SELECT * FROM documents'),
      document_versions: this.rows('SELECT doc_id, version, filename, original_name, mime, size, note, uploaded_at, uploaded_by FROM document_versions'),
      submissions: this.rows('SELECT * FROM submissions').map((r) => ({ ...r, data: JSON.parse(r.data) })),
      users: this.listUsers(),
    };
  }
}
