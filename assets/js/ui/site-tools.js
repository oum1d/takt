/* ТАКТ — инструменты шапки публичных страниц: ночная тема и поиск по Ctrl+K.

   Те же, что в диспетчерской, чтобы сайт и продукт вели себя одинаково:
   тема хранится под тем же ключом и переходит между ними, поиск открывается
   тем же сочетанием. Искать на сайте есть что: разделы главной, страницы,
   вопросы, и главное — прямые входы в демо, вплоть до одной линии на схеме.

   Подключается после i18n.start(): тексты берутся из словаря текущего языка. */

(() => {
  const i18n = TAKT.i18n;
  const t = (key, vars) => i18n.t('tools.' + key, vars);
  const root = document.documentElement;
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ——— тема ——— */

  const themeButtons = [...document.querySelectorAll('[data-site-theme]')];

  function setTheme(theme, save) {
    const night = theme === 'night';
    root.dataset.theme = night ? 'night' : 'day';
    labelTheme();
    if (save) {
      try { localStorage.setItem('takt:theme', root.dataset.theme); } catch (e) { /* инкогнито */ }
    }
  }

  // Кнопка — переключатель «Ночная тема» с aria-pressed; подсказка при
  // наведении говорит, что произойдёт по нажатию.
  function labelTheme() {
    const night = root.dataset.theme === 'night';
    themeButtons.forEach(btn => {
      btn.setAttribute('aria-pressed', String(night));
      btn.title = night ? t('day') : t('night');
    });
  }

  themeButtons.forEach(btn => btn.addEventListener('click', () => {
    setTheme(root.dataset.theme === 'night' ? 'day' : 'night', true);
  }));

  let savedTheme = null;
  try { savedTheme = localStorage.getItem('takt:theme'); } catch (e) { /* инкогнито */ }
  setTheme(savedTheme === 'night' ? 'night' : 'day', false);

  /* ——— поиск ——— */

  const searchButtons = [...document.querySelectorAll('[data-site-search]')];
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');
  if (isMac) searchButtons.forEach(btn => {
    const kbd = btn.querySelector('.kbd');
    if (kbd) kbd.textContent = '⌘ K';
  });

  let backdrop = null, input, list, foot;
  let items = [], active = 0, returnFocus = null;

  // Палитра собирается при первом открытии: на пяти страницах одна и та же
  // разметка, и держать её копии в HTML — пять мест для расхождений.
  function build() {
    backdrop = document.createElement('div');
    backdrop.className = 'palette-backdrop';
    backdrop.hidden = true;

    const box = document.createElement('div');
    box.className = 'palette';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');

    const label = document.createElement('label');
    label.className = 'visually-hidden';
    label.htmlFor = 'sitePaletteInput';

    input = document.createElement('input');
    input.className = 'palette__input';
    input.id = 'sitePaletteInput';
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'true');
    input.setAttribute('aria-controls', 'sitePaletteList');

    list = document.createElement('div');
    list.className = 'palette__list';
    list.id = 'sitePaletteList';
    list.setAttribute('role', 'listbox');

    foot = document.createElement('div');
    foot.className = 'palette__foot';
    for (let i = 0; i < 3; i++) foot.appendChild(document.createElement('span'));

    box.append(label, input, list, foot);
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);

    input.addEventListener('input', () => fill(input.value));
    input.addEventListener('keydown', onKey);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
    labelPalette();
  }

  function labelPalette() {
    if (!backdrop) return;
    backdrop.firstChild.setAttribute('aria-label', t('paletteLabel'));
    backdrop.querySelector('label').textContent = t('paletteSearchLabel');
    input.placeholder = t('palettePh');
    list.setAttribute('aria-label', t('results'));
    const [up, enter, esc] = foot.children;
    up.textContent = t('up'); enter.textContent = t('enter'); esc.textContent = t('esc');
  }

  function goDemo(href) {
    const url = i18n.localize(href);
    // С главной — через тот же переход, что у кнопок демо: он передаёт
    // минуту смены, и вагоны в диспетчерской стоят там же, где на схеме.
    if (TAKT.landing && TAKT.landing.goToApp) TAKT.landing.goToApp(url);
    else location.href = url;
  }

  function goSection(id) {
    const target = document.getElementById(id);
    if (!target) { location.href = i18n.localize('index.html#' + id); return; }
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    // Фокус переносим к разделу, иначе Tab после поиска продолжит с шапки.
    const heading = target.querySelector('h2') || target;
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    history.replaceState(history.state, '', '#' + id);
  }

  function source() {
    const out = [];
    const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    const add = (kind, title, run, hint) => out.push({ kind: t(kind), title: title, run: run, hint: hint || '' });

    [['secCompare', 'before-after'], ['secFeatures', 'features'], ['secImplementation', 'implementation'],
     ['secPricing', 'pricing'], ['secFaq', 'faq'], ['secRequest', 'request']]
      .forEach(([key, id]) => add('kindSection', t(key), () => goSection(id),
        document.getElementById(id) ? '' : t('pageHome')));

    add('kindDemo', t('demoOpen'), () => goDemo('app.html'));
    if (TAKT.network) {
      TAKT.network.lines.forEach(line => add('kindDemo',
        t('demoLine', { id: line.id, title: i18n.pick(line.title, line.titleLat) }),
        () => goDemo('app.html#map-' + line.id)));
    }
    add('kindDemo', t('demoIncidents'), () => goDemo('app.html#incidents'));
    add('kindDemo', t('demoReports'), () => goDemo('app.html#reports'));

    [['index.html', 'pageHome'], ['features.html', 'pageFeatures'], ['pricing.html', 'pagePricing'], ['privacy.html', 'pagePrivacy']]
      .filter(([file]) => file !== here)
      .forEach(([file, key]) => add('kindPage', t(key), () => { location.href = i18n.localize(file); }));

    document.querySelectorAll('.faq details').forEach(details => {
      const summary = details.querySelector('summary');
      if (!summary) return;
      add('kindQuestion', summary.textContent.trim(), () => {
        details.open = true;
        details.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
        summary.focus({ preventScroll: true });
      });
    });

    const night = root.dataset.theme === 'night';
    add('kindCommand', night ? t('cmdDay') : t('cmdNight'), () => setTheme(night ? 'day' : 'night', true));
    i18n.supported.filter(code => code !== i18n.lang).forEach(code => {
      add('kindCommand', t('cmdLang', { name: i18n.locales[code].label }), () => i18n.set(code));
    });
    return out;
  }

  function fill(query) {
    const q = query.trim().toLowerCase();
    const all = source();
    items = (q ? all.filter(item => (item.title + ' ' + item.kind + ' ' + item.hint).toLowerCase().includes(q)) : all).slice(0, 40);
    active = 0;
    list.textContent = '';

    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'palette__empty';
      empty.textContent = t('empty');
      list.appendChild(empty);
      input.removeAttribute('aria-activedescendant');
      return;
    }

    items.forEach((item, index) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'palette__item';
      node.id = 'sitePaletteItem' + index;
      node.tabIndex = -1;
      node.setAttribute('role', 'option');
      node.style.animationDelay = Math.min(index, 12) * 25 + 'ms';

      const kind = document.createElement('span');
      kind.className = 'chip';
      kind.textContent = item.kind;
      const title = document.createElement('span');
      title.textContent = item.title;   // текст вопросов берётся из страницы — только textContent
      const hint = document.createElement('span');
      hint.className = 'palette__hint';
      hint.textContent = item.hint;

      node.append(kind, title, hint);
      node.addEventListener('click', () => run(index));
      node.addEventListener('pointerenter', () => highlight(index));
      list.appendChild(node);
    });
    highlight(0);
  }

  function highlight(index) {
    active = index;
    [...list.children].forEach((node, i) => {
      node.dataset.active = String(i === index);
      node.setAttribute('aria-selected', String(i === index));
    });
    const node = list.children[index];
    if (node) {
      input.setAttribute('aria-activedescendant', node.id);
      if (node.scrollIntoView) node.scrollIntoView({ block: 'nearest' });
    }
  }

  function run(index) {
    const item = items[index];
    if (!item) return;
    close(true);
    item.run();
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); highlight(Math.min(items.length - 1, active + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlight(Math.max(0, active - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); run(active); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
    // Окно модальное: Tab не должен уводить фокус на страницу под ним.
    else if (e.key === 'Tab') { e.preventDefault(); }
  }

  function open() {
    if (!backdrop) build();
    returnFocus = document.activeElement;
    backdrop.hidden = false;
    input.value = '';
    fill('');
    input.focus();
    searchButtons.forEach(btn => btn.setAttribute('aria-expanded', 'true'));
  }

  // После выбора пункта фокус не возвращаем на кнопку: пункт сам решает,
  // куда его перенести (к разделу, к вопросу или на другую страницу).
  function close(keepFocus) {
    if (!backdrop || backdrop.hidden) return;
    backdrop.hidden = true;
    searchButtons.forEach(btn => btn.setAttribute('aria-expanded', 'false'));
    if (!keepFocus && returnFocus && returnFocus.focus) returnFocus.focus();
  }

  searchButtons.forEach(btn => {
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', open);
  });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (backdrop && !backdrop.hidden) close(); else open();
    }
  });

  i18n.onChange(() => {
    labelTheme();
    labelPalette();
    if (backdrop && !backdrop.hidden) fill(input.value);
  });

  TAKT.siteTools = { open: open, close: close, setTheme: setTheme };
})();
