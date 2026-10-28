#!/usr/bin/env node
// Установка копии сайта для нового клиента на его аккаунте Cloudflare.
//
//   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node scripts/new-client.mjs <имя-воркера> [--region eeur] [--setup-token <код>]
//
// Токену нужны права: Workers Scripts — Edit. Скрипт собирает проект, создаёт для клиента отдельный
// wrangler-конфиг в clients/<имя>/, задаёт SETUP_TOKEN и выкатывает Worker. Дальше клиент открывает
// <адрес>/admin и создаёт администратора по коду установки.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith('--'));
const opt = (flag, def) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : def; };
if (!name || !/^[a-z0-9][a-z0-9-]{1,50}$/.test(name)) {
  console.error('Укажите имя воркера (латиница, цифры, дефис): node scripts/new-client.mjs my-client');
  process.exit(1);
}
for (const v of ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']) {
  if (!process.env[v]) { console.error(`Не задана переменная окружения ${v}`); process.exit(1); }
}
const region = opt('--region', 'eeur');
const setupToken = opt('--setup-token', randomBytes(18).toString('base64url'));
const run = (cmd, a, input) => execFileSync(cmd, a, { stdio: input ? ['pipe', 'inherit', 'inherit'] : 'inherit', input });

console.log('→ сборка');
run('node', ['build.mjs']);

mkdirSync(`clients/${name}`, { recursive: true });
const cfg = readFileSync('wrangler.toml', 'utf8')
  .replace(/^name = ".*"$/m, `name = "${name}"`)
  .replace(/^DO_LOCATION = ".*"$/m, `DO_LOCATION = "${region}"`)
  .replace(/main = "dist\/worker.js"/, 'main = "../../dist/worker.js"')
  .replace(/directory = "dist\/assets"/, 'directory = "../../dist/assets"')
  .replace(/\[build\][\s\S]*?\n\n/, '');
writeFileSync(`clients/${name}/wrangler.toml`, cfg);

console.log('→ публикация Worker');
run('npx', ['wrangler', 'deploy', '--config', `clients/${name}/wrangler.toml`]);
console.log('→ секрет SETUP_TOKEN');
run('npx', ['wrangler', 'secret', 'put', 'SETUP_TOKEN', '--config', `clients/${name}/wrangler.toml`], setupToken);

console.log(`\nГотово. Откройте https://${name}.<поддомен аккаунта>.workers.dev/admin`);
console.log(`Код установки (SETUP_TOKEN): ${setupToken}`);
console.log('Передайте клиенту адрес и код: по ним он создаст администратора. Дальше — свой домен и контент (docs/EDITING_GUIDE.md).');
