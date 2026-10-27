// Публичная часть: меню на телефоне, уведомление о cookie + GA4 по согласию, отправка формы.
// Встраивается в страницу как inline-скрипт: window.__SITE = { ga, banner } задаётся сервером.
(function () {
  var cfg = window.__SITE || {};
  var d = document;

  // ---------- меню ----------
  var toggle = d.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      d.body.classList.toggle('nav-open', open);
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && d.body.classList.contains('nav-open')) toggle.click();
    });
  }

  // ---------- cookie + Google Analytics 4 ----------
  var KEY = 'cookie-consent';
  function getConsent() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setConsent(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* приватный режим */ } }
  function loadGA() {
    if (!cfg.ga || window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    window.gtag('js', new Date());
    window.gtag('config', cfg.ga);
    var s = d.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.ga);
    d.head.appendChild(s);
  }
  function dropGACookies() {
    d.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (/^_ga/.test(name)) {
        var host = location.hostname.split('.');
        for (var i = 0; i < host.length; i++) {
          var dom = host.slice(i).join('.');
          d.cookie = name + '=; Max-Age=0; path=/; domain=' + dom;
        }
        d.cookie = name + '=; Max-Age=0; path=/';
      }
    });
  }
  var banner = d.getElementById('cookie-banner');
  function showBanner() { if (banner) { banner.hidden = false; } }
  if (banner) {
    banner.addEventListener('click', function (e) {
      var t = e.target.closest('[data-consent]');
      if (!t) return;
      var v = t.getAttribute('data-consent');
      setConsent(v);
      banner.hidden = true;
      if (v === 'granted') loadGA();
      else {
        if (window.gtag) window.gtag('consent', 'update', { analytics_storage: 'denied' });
        dropGACookies();
      }
    });
  }
  d.querySelectorAll('[data-cookie-settings]').forEach(function (b) { b.addEventListener('click', showBanner); });
  var consent = getConsent();
  if (consent === 'granted') loadGA();
  else if (!consent && cfg.banner) showBanner();

  function track(name, params) { if (window.gtag) window.gtag('event', name, params || {}); }

  // ---------- форма обратной связи ----------
  var form = d.getElementById('contact-form');
  if (form && window.fetch && window.FormData) {
    var status = d.getElementById('form-status');
    var btn = form.querySelector('[type=submit]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.reportValidity()) return;
      var label = btn.textContent;
      btn.disabled = true;
      btn.textContent = form.getAttribute('data-sending') || label;
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.j.error || '');
          status.className = 'form-status ok';
          status.innerHTML = '';
          var h = d.createElement('h3'); h.textContent = form.getAttribute('data-success-title'); status.appendChild(h);
          var p = d.createElement('p'); p.textContent = form.getAttribute('data-success-text'); p.style.margin = '0'; status.appendChild(p);
          status.hidden = false;
          form.reset();
          form.querySelectorAll('.field, .form-actions').forEach(function (el) { el.hidden = true; });
          status.setAttribute('tabindex', '-1');
          status.focus();
          track('generate_lead', { form: 'contact' });
        })
        .catch(function (err) {
          status.className = 'form-status err';
          status.textContent = err.message || form.getAttribute('data-error');
          status.hidden = false;
          if (window.turnstile) try { window.turnstile.reset(); } catch (x) { /* нет виджета */ }
        })
        .finally(function () { btn.disabled = false; btn.textContent = label; });
    });
  }

  // клик по телефону / почте — тоже событие для GA
  d.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="tel:"], a[href^="mailto:"], a[data-download]');
    if (a) track(a.hasAttribute('data-download') ? 'file_download' : 'contact_click', { link_url: a.getAttribute('href') });
  });
})();
