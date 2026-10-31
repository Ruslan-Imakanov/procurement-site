// Генератор примерных данных для «Распила». Все записи помечены demo: true.
// Используется страницей (демо-режим и кнопка «Заполнить примером») и скриптом seed.mjs.
(function (root) {
  'use strict';

  function ymd(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function round(v, p) { p = p || 0; if (p < 0) { var q = Math.pow(10, -p); return Math.round(v / q) * q; } var k = Math.pow(10, p); return Math.round(v * k) / k; }

  // Объём бревна, м³: верхний диаметр d (см) с градацией 2 см, длина l (м), сбег 0,7 см/м.
  // Совпадает с таблицами ГОСТ 2708-75 в пределах ±3–4 %.
  function logVolume(d, l) {
    var dg = d >= 14 ? Math.floor(d / 2) * 2 : Math.round(d);
    var dm = (dg + 0.7 * l / 2) / 100;
    return round(Math.PI / 4 * dm * dm * l, 4);
  }

  function makeDemo(todayISO) {
    var today = todayISO ? new Date(todayISO + 'T12:00:00') : new Date();
    today.setHours(12, 0, 0, 0);
    var seed = 20261031;
    function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    function r(a, b) { return a + rnd() * (b - a); }
    function ri(a, b) { return Math.floor(r(a, b + 1)); }
    function pick(a) { return a[Math.floor(rnd() * a.length)]; }

    var settings = {
      millName: 'Лесопилка «Северный лес»',
      currency: '₸',
      yieldNorm: 56,
      unaccountedLimit: 4,
      discrepancyLimit: 3,
      saws: ['ЛП-1 ленточная', 'ЦМ-200 многопил'],
      demo: true
    };

    var products = [
      { id: 'p-50150', name: 'Доска обрезная 50×150×6000', kind: 'lumber', t: 50, w: 150, l: 6, price: 98000, order: 1 },
      { id: 'p-25150', name: 'Доска обрезная 25×150×6000', kind: 'lumber', t: 25, w: 150, l: 6, price: 102000, order: 2 },
      { id: 'p-40100', name: 'Доска обрезная 40×100×6000', kind: 'lumber', t: 40, w: 100, l: 6, price: 96000, order: 3 },
      { id: 'p-150150', name: 'Брус 150×150×6000', kind: 'timber', t: 150, w: 150, l: 6, price: 105000, order: 4 },
      { id: 'p-100100', name: 'Брус 100×100×6000', kind: 'timber', t: 100, w: 100, l: 6, price: 103000, order: 5 },
      { id: 'p-unedged', name: 'Доска необрезная 50 мм', kind: 'unedged', t: 50, w: 0, l: 6, price: 62000, order: 6 },
      { id: 'slab', name: 'Горбыль', kind: 'waste', price: 7000, order: 7 },
      { id: 'sawdust', name: 'Опил', kind: 'waste', price: 2500, order: 8 }
    ];
    var P = {}; products.forEach(function (p) { P[p.id] = p; p.demo = true; });

    var people = [
      { id: 'w1', name: 'Ерлан Сапаров', role: 'Пильщик', rate: 4000, active: true },
      { id: 'w2', name: 'Виктор Ли', role: 'Пильщик', rate: 4000, active: true },
      { id: 'w3', name: 'Данияр Омаров', role: 'Помощник', rate: 2500, active: true },
      { id: 'w4', name: 'Сергей Кузнецов', role: 'Помощник', rate: 2500, active: true },
      { id: 'w5', name: 'Айдос Бекетов', role: 'Торцовщик', rate: 1800, active: true }
    ];
    people.forEach(function (p) { p.demo = true; });

    var suppliers = [
      { name: 'ТОО «Лесхоз Север»', delta: [0.004, 0.015] },
      { name: 'ИП Жумабаев', delta: [0.055, 0.08] },
      { name: 'ТОО «Тайга-Транс»', delta: [0.0, 0.02] }
    ];
    var customers = ['ТОО «СтройДом»', 'ИП Абенов', 'ТОО «Каркас-Про»', 'ТОО «Мебель Әлем»', 'Частный клиент'];

    var receipts = [], shifts = [], sales = [], expenses = [], drying = [];
    var stockLog = 0, stock = {};
    products.forEach(function (p) { stock[p.id] = 0; });

    var start = addDays(today, -46);
    var docNo = 1180, saleNo = 410, recIdx = 0;
    var anomalyDays = [9, 27], suspiciousDay = 33;

    for (var i = 0; i <= 46; i++) {
      var day = addDays(start, i);
      var date = ymd(day);
      var dow = day.getDay();
      var dom = day.getDate();

      // --- Расходы по календарю
      if (dom === 1) expenses.push({ date: date, category: 'Аренда', amount: 400000, note: 'Аренда площадки и навеса' });
      if (dom === 5) expenses.push({ date: date, category: 'Электроэнергия', amount: round(r(650000, 780000), -3), note: 'Счёт за прошлый месяц' });
      if (dom === 10) expenses.push({ date: date, category: 'Оклады', amount: 920000, note: 'Мастер, охрана, бухгалтер' });
      if (dom === 25) expenses.push({ date: date, category: 'Налоги и сборы', amount: round(r(380000, 460000), -3), note: 'Налоги за месяц' });
      if (dow === 0) continue; // воскресенье — выходной

      if (dow === 1 || dow === 4) expenses.push({ date: date, category: 'ГСМ', amount: round(r(60000, 110000), -2), note: 'Дизель, погрузчик Амкодор' });
      if (dow === 3) expenses.push({ date: date, category: 'Пилы и заточка', amount: round(r(25000, 45000), -2), note: 'Заточка и разводка ленточных пил' });
      if (i === 17) expenses.push({ date: date, category: 'Ремонт техники', amount: 185000, note: 'Замена подшипников на ЛП-1' });
      if (i === 38) expenses.push({ date: date, category: 'Ремонт техники', amount: 64000, note: 'Гидравлика погрузчика' });
      if (dow === 2 && i % 2) expenses.push({ date: date, category: 'Транспорт', amount: round(r(45000, 90000), -3), note: 'Доставка клиенту' });

      // --- Приёмка кругляка
      if (i === 0 || (i % 4 === 1) || stockLog < 25) {
        var sup = i === 0 ? suppliers[0] : suppliers[recIdx % 3];
        recIdx++;
        var target = i === 0 ? 120 : r(52, 72);
        var len = rnd() < 0.85 ? 6 : 4;
        var logs = [], vol = 0;
        var diams = [18, 20, 22, 24, 26, 28, 30, 32, 34, 36];
        while (vol < target) {
          var d = pick(diams), n = ri(8, 40);
          var existing = logs.filter(function (g) { return g.d === d && g.l === len; })[0];
          if (existing) existing.n += n; else logs.push({ d: d, l: len, n: n });
          vol += logVolume(d, len) * n;
        }
        logs.sort(function (a, b) { return a.d - b.d; });
        vol = round(logs.reduce(function (s, g) { return s + logVolume(g.d, g.l) * g.n; }, 0), 3);
        var supVol = round(vol * (1 + r(sup.delta[0], sup.delta[1])), 2);
        var price = round(r(34000, 37000), -2);
        var cost = supVol * price;
        receipts.push({
          id: 'r-' + date.replace(/-/g, '') + '-' + recIdx,
          date: date, supplier: sup.name, species: rnd() < 0.8 ? 'Сосна' : 'Ель',
          doc: 'ТН-' + (docNo++), logs: logs, volume: vol, supplierVolume: supVol,
          pricePerM3: price, paid: i > 38 ? round(cost * 0.5, -3) : round(cost, -3), note: ''
        });
        stockLog += vol;
      }

      // --- Смена распиловки
      var crewA = (i % 2 === 0);
      var crew = crewA ? ['w1', 'w3', 'w5'] : ['w2', 'w4', 'w5'];
      var logVol = round(Math.min(stockLog - 3, r(15, 22)), 1);
      if (logVol > 5) {
        var y = crewA ? r(0.57, 0.62) : r(0.53, 0.575);
        if (anomalyDays.indexOf(i) >= 0) y = r(0.465, 0.485);
        var sawdustPct = r(0.11, 0.125);
        var u = i === suspiciousDay ? 0.082 : r(0.006, 0.028);
        var lumber = logVol * y;
        var weights = [['p-50150', 0.35], ['p-25150', 0.15], ['p-40100', 0.1], ['p-150150', 0.15], ['p-100100', 0.1], ['p-unedged', 0.15]];
        var outputs = [];
        weights.forEach(function (w) {
          var p = P[w[0]];
          var v = lumber * w[1] * r(0.8, 1.2);
          if (p.kind === 'unedged') {
            outputs.push({ productId: p.id, pcs: 0, vol: round(v, 2) });
          } else {
            var pv = p.t * p.w * p.l / 1e6;
            var pcs = Math.max(1, Math.round(v / pv));
            outputs.push({ productId: p.id, pcs: pcs, vol: round(pcs * pv, 3) });
          }
        });
        var outSum = outputs.reduce(function (s, o) { return s + o.vol; }, 0);
        var sawdust = round(logVol * sawdustPct, 1);
        var slab = round(Math.max(0, logVol - outSum - sawdust - logVol * u), 1);
        shifts.push({
          id: 's-' + date.replace(/-/g, ''),
          date: date, saw: crewA ? 'ЛП-1 ленточная' : 'ЦМ-200 многопил', crew: crew,
          species: 'Сосна', logVolume: logVol, outputs: outputs, slab: slab, sawdust: sawdust,
          note: i === suspiciousDay ? 'Ночная смена, мастер не присутствовал' : ''
        });
        stockLog -= logVol;
        outputs.forEach(function (o) { stock[o.productId] += o.vol; });
        stock.slab += slab; stock.sawdust += sawdust;
      }

      // --- Продажи
      var nSales = rnd() < 0.75 ? (rnd() < 0.3 ? 2 : 1) : 0;
      for (var k = 0; k < nSales; k++) {
        var items = [];
        var cands = products.filter(function (p) { return p.kind !== 'waste' && stock[p.id] > 1.5; });
        var nItems = Math.min(cands.length, ri(1, 3));
        for (var j = 0; j < nItems; j++) {
          var p = cands.splice(Math.floor(rnd() * cands.length), 1)[0];
          var v = round(Math.min(stock[p.id] * 0.9, r(2, 11)), 2);
          if (v < 0.5) continue;
          items.push({ productId: p.id, vol: v, price: round(p.price * r(0.97, 1.03), -2) });
          stock[p.id] -= v;
        }
        if (!items.length) continue;
        var total = round(items.reduce(function (s, it) { return s + it.vol * it.price; }, 0), 0);
        var roll = rnd();
        var paid = roll < 0.72 ? total : roll < 0.88 ? round(total * 0.5, -3) : 0;
        if (i > 42) paid = rnd() < 0.5 ? 0 : total;
        sales.push({
          id: 'z-' + date.replace(/-/g, '') + '-' + k,
          date: date, no: 'З-' + (saleNo++), customer: pick(customers), items: items,
          total: total, paid: paid, dueDate: ymd(addDays(day, 10)), note: ''
        });
      }
      // Отходы: горбыль и опил
      if (dow === 6 && stock.slab > 4) {
        var sv = round(stock.slab * 0.8, 1);
        stock.slab -= sv;
        var st = round(sv * 7000, 0);
        sales.push({ id: 'z-' + date.replace(/-/g, '') + '-slab', date: date, no: 'З-' + (saleNo++), customer: 'ИП «Дрова-Сервис»', items: [{ productId: 'slab', vol: sv, price: 7000 }], total: st, paid: st, dueDate: date, note: 'Самовывоз' });
      }
      if (dow === 5 && stock.sawdust > 6) {
        var dv = round(stock.sawdust * 0.7, 1);
        stock.sawdust -= dv;
        var dt = round(dv * 2500, 0);
        sales.push({ id: 'z-' + date.replace(/-/g, '') + '-dust', date: date, no: 'З-' + (saleNo++), customer: 'КХ «Береке»', items: [{ productId: 'sawdust', vol: dv, price: 2500 }], total: dt, paid: dt, dueDate: date, note: 'Подстилка для фермы' });
      }
    }

    expenses = expenses.map(function (e, idx) { e.id = 'e-' + e.date.replace(/-/g, '') + '-' + idx; return e; });

    drying = [
      { id: 'd-1', chamber: 'Камера 1', productId: 'p-50150', vol: 28, start: ymd(addDays(today, -4)), mcStart: 48, mcTarget: 12, mcNow: 22, status: 'идёт' },
      { id: 'd-2', chamber: 'Камера 2', productId: 'p-25150', vol: 22, start: ymd(addDays(today, -6)), mcStart: 46, mcTarget: 12, mcNow: 11, status: 'идёт' },
      { id: 'd-3', chamber: 'Камера 3', productId: 'p-40100', vol: 18, start: ymd(addDays(today, -1)), mcStart: 52, mcTarget: 14, mcNow: 47, status: 'идёт' },
      { id: 'd-4', chamber: 'Камера 1', productId: 'p-50150', vol: 30, start: ymd(addDays(today, -12)), mcStart: 50, mcTarget: 12, mcNow: 12, status: 'готово' }
    ];

    function mark(list) { list.forEach(function (x) { x.demo = true; }); return list; }
    return {
      settings: settings,
      products: products, people: people,
      receipts: mark(receipts), shifts: mark(shifts), sales: mark(sales),
      expenses: mark(expenses), drying: mark(drying)
    };
  }

  root.RaspilDemo = { makeDemo: makeDemo, logVolume: logVolume, ymd: ymd };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.RaspilDemo;
})(typeof window !== 'undefined' ? window : globalThis);
