// Тестовые файлы для e2e: «фотография» (JPEG 2000×1300) и PDF-документ.
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 2000, height: 1300 } });
await p.setContent(`<body style="margin:0;height:1300px;background:linear-gradient(120deg,#c9d6df,#52616b 55%,#1e2022);font-family:sans-serif">
<div style="position:absolute;left:180px;top:420px;width:620px;height:420px;border-radius:24px;background:rgba(255,255,255,.75)"></div>
<div style="position:absolute;left:980px;top:300px;width:760px;height:560px;border-radius:50%;background:radial-gradient(#f0c987,#b0802f)"></div>
<p style="position:absolute;left:220px;top:460px;font-size:64px;color:#0f2a44">Тестовое фото</p></body>`);
await p.screenshot({ path: 'test/fixtures/photo.jpg', type: 'jpeg', quality: 85 });
await p.setContent('<h1>Политика закупок</h1><p>Тестовый документ для проверки DMS.</p>');
await p.pdf({ path: 'test/fixtures/policy.pdf', format: 'A4' });
await b.close();
