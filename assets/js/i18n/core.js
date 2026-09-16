/* ТАКТ — переключение языка.

   Три языка на статике без сборщика: разметка размечена ключами,
   тексты живут в словарях, переключение мгновенное и без перезагрузки.

   Язык берётся в таком порядке: ?lang= в адресе → сохранённый выбор →
   язык браузера → русский. Выбор запоминается, <html lang> обновляется,
   и ссылки внутри сайта дополняются параметром — иначе при переходе
   на «Цены» язык бы сбрасывался.

   Топонимы не переводятся, а транслитерируются: «Пётрковска» и
   «Piotrkowska» — одна и та же улица. Поэтому в данных у названий два
   варианта, кириллица и латиница, а не три перевода. */

window.TAKT = window.TAKT || {};

TAKT.i18n = (() => {
  const SUPPORTED = ['ru', 'pl', 'en'];
  const DEFAULT = 'ru';
  const listeners = new Set();
  let lang = DEFAULT;

  const LOCALES = {
    ru: { code: 'ru', label: 'Русский', short: 'RU', htmlLang: 'ru' },
    pl: { code: 'pl', label: 'Polski', short: 'PL', htmlLang: 'pl' },
    en: { code: 'en', label: 'English', short: 'EN', htmlLang: 'en' }
  };

  function detect() {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (fromUrl && SUPPORTED.indexOf(fromUrl) !== -1) return fromUrl;
    try {
      const saved = localStorage.getItem('takt:lang');
      if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;
    } catch (e) { /* инкогнито */ }
    /* Языки системы целиком, а не только первый: настройка «uk, pl, en»
       обычна в Польше, и второй язык подойдёт лучше, чем язык по умолчанию. */
    const list = (navigator.languages && navigator.languages.length)
      ? navigator.languages
      : [navigator.language || ''];
    for (const item of list) {
      const code = String(item || '').slice(0, 2).toLowerCase();
      if (SUPPORTED.indexOf(code) !== -1) return code;
      // украинский и белорусский: русский интерфейс ближе польского
      if ((code === 'uk' || code === 'be') && SUPPORTED.indexOf('ru') !== -1) return 'ru';
    }
    return DEFAULT;
  }

  function dict() {
    return (TAKT.dict && TAKT.dict[lang]) || (TAKT.dict && TAKT.dict[DEFAULT]) || {};
  }

  /* Ключ вида 'hero.title'. Если перевода нет — отдаём русский, а не пустоту:
     дыра в интерфейсе хуже, чем строка на другом языке. */
  function t(key, vars) {
    const path = key.split('.');
    let value = dict();
    for (const part of path) {
      value = value && value[part];
      if (value === undefined) break;
    }
    if (value === undefined && lang !== DEFAULT) {
      value = path.reduce((acc, part) => acc && acc[part], TAKT.dict[DEFAULT] || {});
    }
    if (value === undefined) return key;
    if (!vars) return value;
    return String(value).replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m));
  }

  /* Топоним не переводят, а транслитерируют: «Пётрковска» и «Piotrkowska» —
     одна и та же улица, поэтому в данных два варианта, а не три перевода. */
  function pick(ru, lat) {
    return lang === 'ru' ? ru : (lat || ru);
  }

  /* Текст происшествия: перевод по идентификатору события, если он есть.
     Само событие — время, линия, точка на схеме — одно на все языки. */
  function inc(incident) {
    const pack = TAKT.incidentText && TAKT.incidentText[lang];
    const tr = pack && pack[incident.id];
    if (!tr) return incident;
    return {
      id: incident.id,
      title: tr.title || incident.title,
      place: tr.place || incident.place,
      responsible: tr.responsible || incident.responsible,
      timeline: incident.timeline.map((step, i) => ({
        t: step.t,
        text: (tr.timeline && tr.timeline[i]) || step.text
      }))
    };
  }

  function place(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    return lang === 'ru' ? (value.ru || value.lat) : (value.lat || value.ru);
  }

  function apply(root) {
    const scope = root || document;

    scope.querySelectorAll('[data-i18n]').forEach(node => {
      node.textContent = t(node.dataset.i18n);
    });

    /* data-i18n-html — только для наших собственных строк со вставками
       вроде <br> и <b>. Пользовательский ввод сюда не попадает никогда. */
    scope.querySelectorAll('[data-i18n-html]').forEach(node => {
      node.innerHTML = t(node.dataset.i18nHtml);
    });

    scope.querySelectorAll('[data-i18n-attr]').forEach(node => {
      // формат: "placeholder:form.namePh, aria-label:map.title"
      node.dataset.i18nAttr.split(',').forEach(pair => {
        const [attr, key] = pair.split(':').map(s => s.trim());
        if (attr && key) node.setAttribute(attr, t(key));
      });
    });

    const title = scope.querySelector('[data-i18n-title]');
    if (title) document.title = t(title.dataset.i18nTitle);

    const desc = document.querySelector('meta[name="description"][data-i18n-content]');
    if (desc) desc.setAttribute('content', t(desc.dataset.i18nContent));
  }

  /* Внутренние ссылки несут выбранный язык: иначе переход на другую
     страницу сбрасывал бы его до сохранённого значения с задержкой в кадр. */
  function decorateLinks() {
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      const next = localize(href);
      if (next !== href) link.setAttribute('href', next);
    });
  }

  /* То же для адресов, которые собираются кодом (поиск по сайту):
     «app.html#map-8» → «app.html?lang=pl#map-8». */
  function localize(href) {
    if (!href || /^(https?:|mailto:|tel:|#)/.test(href)) return href;
    const [path, hash] = href.split('#');
    const base = path.split('?')[0];
    if (!/\.html$/.test(base)) return href;
    const suffix = lang === DEFAULT ? '' : '?lang=' + lang;
    return base + suffix + (hash ? '#' + hash : '');
  }

  function set(next, options) {
    if (SUPPORTED.indexOf(next) === -1 || next === lang) return;
    lang = next;
    try { localStorage.setItem('takt:lang', lang); } catch (e) { /* инкогнито */ }
    document.documentElement.lang = LOCALES[lang].htmlLang;
    apply();
    decorateLinks();
    syncSwitcher();
    listeners.forEach(fn => fn(lang));

    if (!options || !options.silent) {
      const url = new URL(location.href);
      if (lang === DEFAULT) url.searchParams.delete('lang');
      else url.searchParams.set('lang', lang);
      history.replaceState(null, '', url);
    }
  }

  /* Переключатель собирается кодом: три кнопки в одном месте разметки
     на семи страницах — это семь мест, где легко забыть поправить. */
  function buildSwitcher() {
    document.querySelectorAll('[data-lang-switch]').forEach(box => {
      box.innerHTML = '';
      box.setAttribute('role', 'group');
      box.setAttribute('aria-label', t('lang.label'));
      SUPPORTED.forEach(code => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lang-btn';
        btn.dataset.lang = code;
        btn.textContent = LOCALES[code].short;
        btn.title = LOCALES[code].label;
        btn.setAttribute('aria-pressed', String(code === lang));
        btn.addEventListener('click', () => set(code));
        box.appendChild(btn);
      });
    });
  }

  function syncSwitcher() {
    document.querySelectorAll('[data-lang-switch] .lang-btn').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.lang === lang));
    });
    document.querySelectorAll('[data-lang-switch]').forEach(box => {
      box.setAttribute('aria-label', t('lang.label'));
    });
  }

  function start() {
    lang = detect();
    // Язык из адреса — это тоже выбор: запоминаем его, иначе переход по
    // ссылке без параметра вернёт посетителя на язык браузера.
    if (new URLSearchParams(location.search).get('lang') === lang) {
      try { localStorage.setItem('takt:lang', lang); } catch (e) { /* инкогнито */ }
    }
    document.documentElement.lang = LOCALES[lang].htmlLang;
    buildSwitcher();
    apply();
    decorateLinks();
  }

  return {
    get lang() { return lang; },
    get locales() { return LOCALES; },
    supported: SUPPORTED,
    t: t,
    pick: pick,
    inc: inc,
    localize: localize,
    place: place,
    apply: apply,
    set: set,
    start: start,
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  };
})();
