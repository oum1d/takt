/* ТАКТ — оболочка приложения: один цикл кадров, роутинг экранов,
   полоса времени, роли, тема и командная палитра.

   Важное правило этого файла: кадр рисует только активный экран.
   Три невидимых экрана, которые честно пересчитываются в фоне, — самый
   простой способ уронить 60 fps на ровном месте. */

(() => {
  const sim = TAKT.simulator, clock = TAKT.clock, i18n = TAKT.i18n;
  const app = document.getElementById('app');
  const stage = document.getElementById('stage');

  let screen = 'map';
  let morphing = false;
  let morphRun = 0;
  let reducedTick = 0;

  /* ——— экраны ——— */

  const screens = {};
  document.querySelectorAll('[data-screen]').forEach(node => { screens[node.dataset.screen] = node; });

  /* У каждой роли свой набор экранов. Лишнее не прячется в меню — его просто
     нет: у водителя не бывает «отчётов для города», а начальник депо не ведёт
     смену по схеме. */
  const ROLE_SCREENS = {
    dispatcher: ['map', 'line', 'incidents', 'reports'],
    depot: ['depot', 'incidents', 'reports'],
    driver: ['driver']
  };
  const allowedScreens = () => ROLE_SCREENS[app.dataset.role] || ROLE_SCREENS.dispatcher;

  function setScreen(name, options) {
    const allowed = allowedScreens();
    if (!screens[name] || allowed.indexOf(name) === -1) name = allowed[0];
    screen = name;
    app.dataset.screen = name;
    Object.entries(screens).forEach(([key, node]) => {
      node.dataset.active = String(key === name);
    });
    document.querySelectorAll('[data-screen-link]').forEach(link => {
      if (link.dataset.screenLink === name) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    // Другие экраны могут временно менять видимость линий на схеме
    // (распрямление, переход к происшествию) — при возврате восстанавливаем выбор.
    if (name === 'map' && lineRows.size) applyLineFilter();
    if (name === 'reports') TAKT.reportsUI.render();
    if (name === 'incidents') TAKT.incidentsUI.renderDetail();
    if (!options || !options.silent) {
      const hash = currentHash();
      // Переход между экранами — новая запись в истории: кнопка «Назад»
      // в браузере возвращает на предыдущий экран демо, а не на лендинг.
      // Смена роли — не переход, её запись заменяется.
      if (location.hash !== hash) {
        if (options && options.replace) writeHistory('replace', null, hash);
        else writeHistory('push', { takt: 'screen' }, hash);
      }
    }
    render(clock.minutes, true);
  }

  /* ——— адрес и кнопка «Назад» ———
     Адрес описывает то, что на экране: #map — вся сеть, #map-8 — на схеме
     одна линия 8, #map-depot-brus — линии депо, #line-8 — экран «Линия».
     Поэтому «Назад» после выбора линии возвращает ко всей сети, а ссылку
     на конкретную линию можно открыть напрямую. */

  function currentHash() {
    if (screen === 'line') return '#line-' + TAKT.lineScreen.current;
    if (screen === 'map') {
      if (selectedLines && selectedLines.size === 1) return '#map-' + [...selectedLines][0];
      if (depotFilter !== 'all') return '#map-depot-' + depotFilter;
    }
    return '#' + screen;
  }

  /* Первый выбор фильтра — новая запись в истории, дальнейшие переключения
     её заменяют: иначе после пяти линий «Назад» пришлось бы жать пять раз.
     Возврат ко всей сети на такой записи — это и есть шаг назад. */
  function commitFilterUrl() {
    if (screen !== 'map') return;
    // Пока наш шаг назад не завершился, history.state ещё старый —
    // решение принимаем, когда он дойдёт (см. writeHistory).
    if (backPending) { writeHistory('filter', null, null); return; }
    const hash = currentHash();
    const onFilterEntry = !!history.state && history.state.takt === 'filter';
    if (hash !== '#map') {
      if (onFilterEntry) history.replaceState(history.state, '', hash);
      else history.pushState({ takt: 'filter' }, '', hash);
    } else if (onFilterEntry) {
      backPending = true;
      history.back();
      // Страховка: если popstate так и не придёт, очередь не должна зависнуть.
      backTimer = setTimeout(finishBack, 1000);
    } else if (location.hash !== hash) {
      history.replaceState(history.state, '', hash);
    }
  }

  /* history.back() асинхронный. Если в эти несколько миллисекунд случится
     новый переход (двойной клик, быстрая смена линии), pushState отработал бы
     раньше шага назад, и тот увёл бы уже с новой записи. Поэтому записи,
     сделанные во время шага назад, ждут его окончания. */
  let backPending = false, backTimer = 0;
  let queuedWrite = null;

  function writeHistory(kind, state, hash) {
    if (backPending) { queuedWrite = kind; return; }
    if (kind === 'push') history.pushState(state, '', hash);
    else if (kind === 'replace') history.replaceState(history.state, '', hash);
  }

  function finishBack() {
    clearTimeout(backTimer);
    backPending = false;
    const kind = queuedWrite;
    queuedWrite = null;
    // Схема и экраны уже показывают актуальное состояние — дописываем
    // в историю то, что на них видно, не пересчитывая сам вид.
    if (!kind || location.hash === currentHash()) return;
    if (kind === 'replace') history.replaceState(history.state, '', currentHash());
    else if (screen === 'map') commitFilterUrl();
    else history.pushState({ takt: 'screen' }, '', currentHash());
  }

  function applyHash() {
    const hash = location.hash.replace('#', '');
    if (hash.startsWith('line-') && sim.line(hash.slice(5))) {
      TAKT.lineScreen.setLine(hash.slice(5));
      setScreen('line', { silent: true });
      return;
    }
    if (!hash || hash === 'map' || hash.startsWith('map-')) {
      const rest = hash.startsWith('map-') ? hash.slice(4) : '';
      const depot = rest.startsWith('depot-') ? rest.slice(6) : null;
      if (depot && TAKT.network.depots.some(d => d.id === depot)) {
        selectedLines = null;
        setDepotFilter(depot);
      } else if (rest && TAKT.network.lines.some(l => l.id === rest)) {
        selectedLines = new Set([rest]);
        setDepotFilter('all');
      } else {
        selectedLines = null;
        setDepotFilter('all');
      }
      setScreen('map', { silent: true });   // setScreen сам применит фильтр к схеме
      return;
    }
    setScreen(screens[hash] ? hash : 'map', { silent: true });
  }

  window.addEventListener('popstate', () => {
    // Шаг назад, сделанный самим commitFilterUrl, приходит сюда, когда схема
    // уже в нужном виде, — пересчитывать нечего.
    if (backPending) { finishBack(); return; }
    if (location.hash === currentHash()) return;
    morphRun++;   // «Назад» посреди распрямления отменяет его
    applyHash();
  });

  /* Распрямление маршрута — одна из трёх постановочных анимаций проекта.
     Остальная сеть гаснет, выбранная кривая превращается в прямую ось,
     и только после этого меняется экран: человек видит, что перед ним
     тот же самый маршрут, просто развёрнутый. */
  function openLine(id, options) {
    const fromMap = screen === 'map' && (!options || !options.instant);
    TAKT.lineScreen.setLine(id);

    if (!fromMap || clock.reducedMotion) {
      setScreen('line');
      return;
    }

    const only = new Set([id]);
    TAKT.map.setVisibleLines(only);
    morphing = true;
    const start = performance.now();
    const DURATION = 700;
    const run = ++morphRun;

    function step(now) {
      if (run !== morphRun) {
        morphing = false;
        TAKT.map.resetMorph(id);
        applyLineFilter();
        return;
      }
      const raw = Math.min(1, (now - start) / DURATION);
      // cubic-bezier(.65,0,.35,1) в виде функции: разгон и торможение поровну
      const k = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2;
      TAKT.map.morph(id, k);
      if (raw < 1) { requestAnimationFrame(step); return; }
      morphing = false;
      TAKT.map.resetMorph(id);
      applyLineFilter();   // вернуть схеме тот выбор линий, что был до распрямления
      setScreen('line');
    }
    requestAnimationFrame(step);
  }

  /* ——— панель линий ——— */

  const lineList = document.getElementById('lineList');
  const lineRows = new Map();
  let depotFilter = 'all';
  let selectedLines = null;

  function buildLineList() {
    TAKT.network.lines.forEach(line => {
      const ctx = sim.line(line.id);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'line-row';
      row.setAttribute('aria-pressed', 'false');
      row.dataset.line = line.id;

      const badge = document.createElement('span');
      badge.className = 'badge-line';
      badge.style.setProperty('--line-color', line.color);
      badge.textContent = line.id;

      const mid = document.createElement('span');
      const name = document.createElement('span');
      name.className = 'line-row__name';
      name.textContent = i18n.pick(line.title, line.titleLat);
      const meta = document.createElement('span');
      meta.className = 'line-row__meta';
      meta.textContent = line.lengthKm + ' ' + i18n.t('app.km') + ' · ' + i18n.t('app.depotPrefix') + ' ' + depotName(line.depot);
      mid.append(name, meta);

      const nums = document.createElement('span');
      nums.className = 'line-row__nums';
      const headway = document.createElement('div');
      headway.className = 'line-row__headway';
      const cars = document.createElement('div');
      cars.className = 'line-row__cars';
      nums.append(headway, cars);

      row.append(badge, mid, nums);
      // Второй клик двойного нажатия не снимает выбор: двойное нажатие
      // открывает экран «Линия», и линия должна остаться выбранной.
      row.addEventListener('click', e => { if (e.detail < 2) toggleLine(line.id); });
      row.addEventListener('dblclick', () => openLine(line.id));
      lineList.appendChild(row);
      lineRows.set(line.id, { row: row, headway: headway, cars: cars, ctx: ctx });

      const pick = document.createElement('button');
      pick.type = 'button';
      pick.className = 'line-pick__btn';
      pick.dataset.pick = line.id;
      pick.setAttribute('aria-pressed', 'false');
      const pickBadge = badge.cloneNode(true);
      pickBadge.setAttribute('aria-hidden', 'true');
      pick.appendChild(pickBadge);
      linePick.appendChild(pick);
    });
    labelLinePick();
  }

  /* Переключатель над схемой. Нажатие на выбранную линию ещё раз —
     возврат ко всей сети, как и в списке слева. */
  const linePick = document.getElementById('linePick');
  linePick.addEventListener('click', e => {
    const btn = e.target.closest('[data-pick]');
    if (!btn) return;
    if (btn.dataset.pick === 'all') showAllLines();
    else toggleLine(btn.dataset.pick);
  });

  function labelLinePick() {
    linePick.querySelectorAll('.line-pick__btn').forEach(btn => {
      const line = TAKT.network.lines.find(l => l.id === btn.dataset.pick);
      const label = i18n.t('app.pickLine', { id: line.id, title: i18n.pick(line.title, line.titleLat) });
      btn.setAttribute('aria-label', label);
      btn.title = label;
    });
  }

  function showAllLines() {
    selectedLines = null;
    setDepotFilter('all');
    applyLineFilter();
    commitFilterUrl();
  }

  function setDepotFilter(id) {
    depotFilter = id;
    document.querySelectorAll('[data-depot]').forEach(btn => {
      btn.setAttribute('aria-pressed', String(btn.dataset.depot === id));
    });
  }

  /* Названия депо живут в данных, а не в разметке: иначе при переводе
     их пришлось бы держать в двух местах и они бы разошлись. */
  function fillDepotNames() {
    TAKT.network.depots.forEach(depot => {
      const btn = document.querySelector('[data-depot="' + depot.id + '"]');
      if (btn) btn.textContent = i18n.pick(depot.name, depot.nameLat);
    });
    const list = document.getElementById('depotNames');
    if (list) {
      list.textContent = TAKT.network.depots
        .map(d => i18n.pick(d.name, d.nameLat)).join(' · ');
    }
  }

  function depotName(id) {
    const depot = TAKT.network.depots.find(d => d.id === id);
    return depot ? i18n.pick(depot.name, depot.nameLat) : '—';
  }

  /* Фильтры не пересекаются: выбор линии сбрасывает депо, выбор депо —
     линию. Иначе «линия 8» при включённом «депо Брус» давала пустую схему
     без единого объяснения. */
  function toggleLine(id) {
    if (selectedLines && selectedLines.has(id) && selectedLines.size === 1) selectedLines = null;
    else selectedLines = new Set([id]);
    setDepotFilter('all');
    applyLineFilter();
    commitFilterUrl();
  }

  function applyLineFilter() {
    const allowed = new Set();
    TAKT.network.lines.forEach(line => {
      const byDepot = depotFilter === 'all' || line.depot === depotFilter;
      const bySelect = !selectedLines || selectedLines.has(line.id);
      if (byDepot && bySelect) allowed.add(line.id);
    });
    const full = allowed.size === TAKT.network.lines.length;
    TAKT.map.setVisibleLines(full ? null : allowed);
    syncLineFilter(full ? null : allowed);
  }

  function syncLineFilter(allowed) {
    lineRows.forEach((node, id) => {
      const visible = !allowed || allowed.has(id);
      node.row.dataset.muted = String(!visible);
      node.row.setAttribute('aria-pressed', String(!!selectedLines && selectedLines.has(id)));
    });
    linePick.querySelectorAll('[data-pick]').forEach(btn => {
      const pressed = btn.dataset.pick === 'all'
        ? !selectedLines && depotFilter === 'all'
        : !!selectedLines && selectedLines.has(btn.dataset.pick);
      btn.setAttribute('aria-pressed', String(pressed));
    });
    const count = allowed ? allowed.size : TAKT.network.lines.length;
    document.getElementById('linesCount').textContent = count === TAKT.network.lines.length
      ? String(count) : count + ' / ' + TAKT.network.lines.length;
    // Сразу, а не на следующем кадре: при reduced-motion кадр бывает раз в секунду.
    render(clock.minutes, true);
  }

  document.querySelectorAll('[data-depot]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedLines = null;
      setDepotFilter(btn.dataset.depot);
      applyLineFilter();
      commitFilterUrl();
    });
  });

  /* ——— метрики ———
     Пересчёт раз в 500 мс, а не каждый кадр: числа всё равно меняются
     медленнее, а лишняя работа в кадре стоит дороже, чем кажется. */

  const metricNodes = {};
  document.querySelectorAll('[data-metric]').forEach(node => { metricNodes[node.dataset.metric] = node; });
  const lastMetric = {};
  let metricAt = 0;

  function renderMetrics(t, force) {
    const now = performance.now();
    if (!force && now - metricAt < 500) return;
    metricAt = now;
    const m = sim.metrics(t);

    setMetric('onLine', m.onLine + ' / ' + m.fleetTotal);
    setMetric('headway', clock.mmss(m.avgHeadway));
    setMetric('punctuality', m.punctuality + '%');
    setMetric('open', String(m.openIncidents));
    if (metricNodes.open) {
      metricNodes.open.dataset.tone = m.openIncidents > 0 ? 'alarm' : '';
    }

    // Сводка над схемой считает то, что на ней видно: при выбранной линии —
    // только её вагоны, иначе «47 на линии» над двенадцатью вагонами.
    const sub = document.getElementById('mapSub');
    if (sub) {
      const allowed = TAKT.map.visibleLines;
      let text;
      if (!allowed) {
        text = i18n.t('app.mapSummary', { onLine: m.onLine, stopped: m.stopped, late: m.late });
      } else {
        const own = sim.vehicles.filter(v => allowed.has(v.line));
        const counts = {
          onLine: own.length,
          stopped: own.filter(v => v.status === 'stopped').length,
          late: own.filter(v => v.status === 'late').length
        };
        text = allowed.size === 1
          ? i18n.t('app.mapLineSummary', Object.assign({ line: [...allowed][0] }, counts))
          : i18n.t('app.mapSummary', counts);
      }
      if (sub.textContent !== text) sub.textContent = text;
    }

    lineRows.forEach((node, id) => {
      const lm = sim.lineMetrics(id);
      const headway = clock.mmss(lm.actual);
      if (node.headway.textContent !== headway) node.headway.textContent = headway;
      const cars = lm.vehicles.length + ' ' + i18n.t('app.cars');
      if (node.cars.textContent !== cars) node.cars.textContent = cars;
    });
  }

  /* Направление изменения подсвечивается на 400 мс и гаснет.
     Постоянного выделения нет: то, что светится всегда, перестают замечать. */
  function setMetric(key, value) {
    const node = metricNodes[key];
    if (!node || node.textContent === value) return;
    const prev = parseFloat(String(lastMetric[key]).replace(/[^\d.-]/g, ''));
    const next = parseFloat(String(value).replace(/[^\d.-]/g, ''));
    node.textContent = value;
    lastMetric[key] = value;
    if (clock.reducedMotion || Number.isNaN(prev) || Number.isNaN(next) || prev === next) return;
    node.classList.remove('is-up', 'is-down');
    void node.offsetWidth;
    node.classList.add(next > prev ? 'is-up' : 'is-down');
    setTimeout(() => node.classList.remove('is-up', 'is-down'), 400);
  }

  /* ——— полоса времени ——— */

  const range = document.getElementById('timeRange');
  const trackFill = document.getElementById('trackFill');
  const trackHead = document.getElementById('trackHead');
  const trackMarks = document.getElementById('trackMarks');
  const clockValue = document.getElementById('clockValue');
  const playBtn = document.getElementById('playBtn');

  function buildTrack() {
    for (let m = 360; m <= 1080; m += 60) {
      const mark = document.createElement('span');
      mark.className = 'track-mark';
      mark.textContent = clock.hhmm(m);
      // Каждые три часа — «крупная» метка: на телефоне остальные не помещаются.
      if ((m / 60) % 3 === 0) mark.dataset.major = 'true';
      // Крайние метки прижимаются к краям, иначе вылезают за полосу
      // и дают горизонтальную прокрутку всей страницы.
      if (m === 360) { mark.style.left = '0'; mark.style.transform = 'none'; }
      else if (m === 1080) { mark.style.left = '100%'; mark.style.transform = 'translateX(-100%)'; }
      else mark.style.left = ((m - 360) / 720 * 100).toFixed(2) + '%';
      trackMarks.appendChild(mark);
    }
    const track = document.getElementById('track');
    TAKT.incidents.forEach(inc => {
      const tick = document.createElement('span');
      tick.className = 'track__inc';
      tick.dataset.tone = inc.status === 'open' ? 'alarm' : inc.status === 'working' ? 'late' : 'idle';
      tick.style.left = ((inc.start - 360) / 720 * 100).toFixed(2) + '%';
      tick.title = clock.hhmm(inc.start) + ' · ' + i18n.inc(inc).title;
      track.appendChild(tick);
    });
  }

  range.addEventListener('pointerdown', () => clock.beginScrub());
  range.addEventListener('input', () => clock.scrubTo(Number(range.value)));
  range.addEventListener('change', () => clock.endScrub());
  range.addEventListener('pointerup', () => clock.endScrub());
  range.addEventListener('keydown', e => {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) clock.beginScrub();
  });
  range.addEventListener('keyup', () => clock.endScrub());

  playBtn.addEventListener('click', () => clock.toggle());
  document.getElementById('nowBtn').addEventListener('click', () => clock.toNow());
  document.querySelectorAll('[data-rate]').forEach(btn => {
    btn.addEventListener('click', () => {
      clock.setRate(Number(btn.dataset.rate));
      document.querySelectorAll('[data-rate]').forEach(other => {
        other.setAttribute('aria-pressed', String(other === btn));
      });
      if (!clock.playing) clock.play();
    });
  });

  function renderTime(t) {
    const text = clock.hhmm(t);
    if (clockValue.textContent !== text) clockValue.textContent = text;
    const percent = clock.progress * 100;
    trackFill.style.width = percent.toFixed(2) + '%';
    trackHead.style.left = percent.toFixed(2) + '%';
    if (!clock.scrubbing && document.activeElement !== range) range.value = String(t);
    range.setAttribute('aria-valuetext', text);
    playBtn.textContent = clock.playing ? 'II' : '▶';
    playBtn.setAttribute('aria-pressed', String(clock.playing));
    playBtn.title = i18n.t(clock.playing ? 'app.pause' : 'app.play');
  }

  /* ——— роли ———
     Панели не исчезают и не появляются: они переезжают на новые места.
     Пользователь должен видеть, что это тот же интерфейс в другой
     конфигурации, а не другой продукт. */

  const ROLES = ['dispatcher', 'depot', 'driver'];
  const roleName = role => i18n.t('roles.' + role);

  function setRole(role) {
    if (ROLES.indexOf(role) === -1 || app.dataset.role === role) return;
    const nodes = [...document.querySelectorAll('.panel--left, .panel--right, .stage')];
    const before = nodes.map(node => node.getBoundingClientRect());

    app.dataset.role = role;
    document.getElementById('roleLabel').textContent = roleName(role);
    document.querySelectorAll('[data-role]').forEach(item => {
      if (item.getAttribute('role') === 'menuitemradio') {
        item.setAttribute('aria-checked', String(item.dataset.role === role));
      }
    });
    try { localStorage.setItem('takt:role', role); } catch (e) { /* режим инкогнито */ }

    // Экран, которого у новой роли нет, меняется на её первый доступный
    if (allowedScreens().indexOf(screen) === -1) setScreen(allowedScreens()[0], { replace: true });
    else render(clock.minutes, true);

    if (clock.reducedMotion) return;
    const after = nodes.map(node => node.getBoundingClientRect());
    nodes.forEach((node, i) => {
      const dx = before[i].left - after[i].left;
      const dy = before[i].top - after[i].top;
      const sx = after[i].width ? before[i].width / after[i].width : 1;
      if (!after[i].width || (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < 0.01)) return;
      node.animate(
        [{ transform: `translate(${dx}px, ${dy}px) scaleX(${sx})`, transformOrigin: 'left top' },
         { transform: 'none', transformOrigin: 'left top' }],
        { duration: 260, easing: 'cubic-bezier(.2,0,.2,1)' }
      );
    });
  }

  const roleToggle = document.getElementById('roleToggle');
  const roleList = document.getElementById('roleList');
  roleToggle.addEventListener('click', () => {
    const open = roleList.hidden;
    roleList.hidden = !open;
    roleToggle.setAttribute('aria-expanded', String(open));
  });
  roleList.querySelectorAll('[data-role]').forEach(item => {
    item.addEventListener('click', () => {
      setRole(item.dataset.role);
      roleList.hidden = true;
      roleToggle.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('click', e => {
    if (!roleList.hidden && !e.target.closest('.role-menu')) {
      roleList.hidden = true;
      roleToggle.setAttribute('aria-expanded', 'false');
    }
  });

  /* ——— тема ——— */

  const themeToggle = document.getElementById('themeToggle');
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme === 'night' ? 'night' : 'day';
    themeToggle.setAttribute('aria-pressed', String(theme === 'night'));
    const icon = themeToggle.querySelector('use');
    if (icon) icon.setAttribute('href', theme === 'night' ? '#ic-sun' : '#ic-moon');
    try { localStorage.setItem('takt:theme', theme); } catch (e) { /* режим инкогнито */ }
  }
  themeToggle.addEventListener('click', () => {
    setTheme(document.documentElement.dataset.theme === 'night' ? 'day' : 'night');
  });

  /* ——— командная палитра ——— */

  const paletteBackdrop = document.getElementById('paletteBackdrop');
  const paletteInput = document.getElementById('paletteInput');
  const paletteList = document.getElementById('paletteList');
  let paletteItems = [];
  let paletteIndex = 0;
  let paletteReturn = null;

  function paletteSource() {
    const items = [];
    TAKT.network.lines.forEach(line => items.push({
      kind: i18n.t('app.kindLine'), title: i18n.t('app.lineItem', { id: line.id, title: i18n.pick(line.title, line.titleLat) }),
      hint: line.lengthKm + ' ' + i18n.t('app.km'), run: () => openLine(line.id)
    }));
    sim.vehicles.forEach(veh => items.push({
      kind: i18n.t('app.kindCar'), title: i18n.t('app.carItem', { id: veh.id, line: veh.line, tab: veh.tab }),
      hint: i18n.pick(veh.driver, veh.driverLat), vehicle: veh.id,
      run: () => { setScreen('map'); TAKT.map.select(veh.id); }
    }));
    TAKT.incidents.forEach(inc => items.push({
      kind: i18n.t('app.kindIncident'), title: i18n.t('app.incItem', { time: clock.hhmm(inc.start), title: i18n.inc(inc).title }),
      hint: i18n.t('app.lineHint', { line: inc.line }),
      run: () => { setScreen('incidents'); TAKT.incidentsUI.select(inc.id); }
    }));
    [
      [i18n.t('app.map'), () => setScreen('map')],
      [i18n.t('app.incidents'), () => setScreen('incidents')],
      [i18n.t('app.reports'), () => setScreen('reports')],
      [i18n.t('app.cmdNow'), () => clock.toNow()],
      [i18n.t('app.cmdToggle'), () => clock.toggle()],
      [i18n.t('app.cmdRate10'), () => clock.setRate(10)],
      [i18n.t('app.cmdRate60'), () => clock.setRate(60)],
      [i18n.t('app.cmdNight'), () => setTheme(document.documentElement.dataset.theme === 'night' ? 'day' : 'night')],
      [i18n.t('app.cmdRole', { role: roleName('dispatcher') }), () => setRole('dispatcher')],
      [i18n.t('app.cmdRole', { role: roleName('depot') }), () => setRole('depot')],
      [i18n.t('app.cmdRole', { role: roleName('driver') }), () => setRole('driver')]
    ].forEach(([title, run]) => items.push({ kind: i18n.t('app.kindCommand'), title: title, hint: '', run: run }));
    return items;
  }

  function openPalette() {
    paletteReturn = document.activeElement;
    paletteBackdrop.hidden = false;
    paletteInput.value = '';
    fillPalette('');
    paletteInput.focus();
  }

  function closePalette() {
    paletteBackdrop.hidden = true;
    if (paletteReturn && paletteReturn.focus) paletteReturn.focus();
  }

  function fillPalette(query) {
    const q = query.trim().toLowerCase();
    const source = paletteSource();
    paletteItems = (q
      ? source.filter(item => (item.title + ' ' + item.hint + ' ' + item.kind).toLowerCase().includes(q))
      : source.filter(item => item.kind === i18n.t('app.kindCommand') || item.kind === i18n.t('app.kindLine'))
    ).slice(0, 40);
    paletteIndex = 0;
    paletteList.innerHTML = '';

    if (!paletteItems.length) {
      const empty = document.createElement('div');
      empty.className = 'palette__empty';
      empty.textContent = i18n.t('app.paletteEmpty');
      paletteList.appendChild(empty);
      return;
    }

    paletteItems.forEach((item, index) => {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'palette__item';
      node.setAttribute('role', 'option');
      node.style.animationDelay = Math.min(index, 12) * 25 + 'ms';

      const kind = document.createElement('span');
      kind.className = 'chip';
      kind.textContent = item.kind;
      const title = document.createElement('span');
      title.textContent = item.title;
      const hint = document.createElement('span');
      hint.className = 'palette__hint';
      hint.textContent = item.hint;

      node.append(kind, title, hint);
      node.addEventListener('click', () => { item.run(); closePalette(); });
      node.addEventListener('pointerenter', () => highlightPalette(index));
      paletteList.appendChild(node);
    });
    highlightPalette(0);
  }

  /* Найденное подсвечивается на карте ещё до подтверждения:
     видно, о каком вагоне речь, до нажатия Enter. */
  function highlightPalette(index) {
    paletteIndex = index;
    [...paletteList.children].forEach((node, i) => {
      node.dataset.active = String(i === index);
      node.setAttribute('aria-selected', String(i === index));
    });
    const item = paletteItems[index];
    if (item && item.vehicle != null) TAKT.map.select(item.vehicle);
    const active = paletteList.children[index];
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest' });
  }

  paletteInput.addEventListener('input', () => fillPalette(paletteInput.value));
  paletteInput.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); highlightPalette(Math.min(paletteItems.length - 1, paletteIndex + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); highlightPalette(Math.max(0, paletteIndex - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const item = paletteItems[paletteIndex];
      if (item) { item.run(); closePalette(); }
    } else if (e.key === 'Escape') { e.preventDefault(); closePalette(); }
  });
  paletteBackdrop.addEventListener('click', e => { if (e.target === paletteBackdrop) closePalette(); });
  document.getElementById('paletteOpen').addEventListener('click', openPalette);

  /* ——— клавиатура ——— */

  document.addEventListener('keydown', e => {
    // e.target не всегда элемент (например, событие пришло на сам документ),
    // а Ctrl+K обязан работать в любом случае — это главный способ навигации.
    const node = e.target;
    const typing = !!(node && node.matches && node.matches('input, textarea, select'));

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      paletteBackdrop.hidden ? openPalette() : closePalette();
      return;
    }
    if (e.key === 'Escape') {
      if (!paletteBackdrop.hidden) { closePalette(); return; }
      if (!roleList.hidden) { roleList.hidden = true; roleToggle.setAttribute('aria-expanded', 'false'); return; }
      TAKT.map.hideCard();
      TAKT.map.select(null);
      return;
    }
    if (typing || !paletteBackdrop.hidden) return;

    if (e.key === ' ') { e.preventDefault(); clock.toggle(); }
    else if (e.key === 'ArrowLeft' && screen !== 'map') { e.preventDefault(); clock.step(-1); }
    else if (e.key === 'ArrowRight' && screen !== 'map') { e.preventDefault(); clock.step(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (node && node.closest && node.closest('#layerCars')) { e.preventDefault(); TAKT.map.focusNext(e.key === 'ArrowRight' ? 1 : -1); }
      else { e.preventDefault(); clock.step(e.key === 'ArrowRight' ? 1 : -1); }
    }
    else if (e.key === 'Home') { e.preventDefault(); clock.seek(clock.SHIFT_START); }
    else if (e.key === 'End') { e.preventDefault(); clock.seek(clock.SHIFT_END); }
    else if (e.key >= '1' && e.key <= '4') {
      const order = ['map', 'line', 'incidents', 'reports'];
      setScreen(order[Number(e.key) - 1]);
    }
  });

  document.querySelectorAll('[data-screen-link]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const name = link.dataset.screenLink;
      if (name === 'line') openLine(TAKT.lineScreen.current);
      else setScreen(name);
    });
  });

  document.getElementById('exportPdf').addEventListener('click', function () {
    this.textContent = i18n.t('app.exportSoon');
    this.disabled = true;
    setTimeout(() => { this.textContent = i18n.t('app.exportPdf'); this.disabled = false; }, 2600);
  });

  /* ——— кадр ——— */

  function render(t, force) {
    if (screen === 'map') {
      if (!morphing) TAKT.map.render(t);
    } else if (screen === 'line') {
      TAKT.lineScreen.render(t);
    } else if (screen === 'incidents') {
      TAKT.incidentsUI.renderTable(t);
    } else if (screen === 'depot' || screen === 'driver') {
      TAKT.roles.render(t, screen);
    }
    TAKT.incidentsUI.renderFeed(t);
    renderMetrics(t, force);
    renderTime(t);
  }

  function frame(now) {
    const t = clock.minutes;
    // При reduced-motion позиция обновляется скачком раз в секунду:
    // инструмент остаётся полностью рабочим, просто перестаёт двигаться плавно.
    if (clock.reducedMotion) {
      if (now - reducedTick > 1000) {
        reducedTick = now;
        sim.update(t);
        render(t);
      }
    } else {
      sim.update(t);
      render(t);
    }
    requestAnimationFrame(frame);
  }

  /* ——— старт ——— */

  function start() {
    i18n.start();
    sim.init();

    let savedRole = null;
    try {
      const theme = localStorage.getItem('takt:theme');
      if (theme) setTheme(theme);
      savedRole = localStorage.getItem('takt:role');
    } catch (e) { /* режим инкогнито — просто открываемся в дневной теме */ }

    /* Переход с лендинга: страница продолжает ту же смену с той же секунды,
       поэтому вагоны не сбиваются — позиция считается от времени, а не
       накапливается. */
    try {
      const handoff = sessionStorage.getItem('takt:time');
      if (handoff) {
        clock.seek(Number(handoff));
        sessionStorage.removeItem('takt:time');
        if (!clock.reducedMotion) {
          stage.animate([{ opacity: 0.5, transform: 'scale(1.01)' }, { opacity: 1, transform: 'none' }],
            { duration: 420, easing: 'cubic-bezier(.2,0,.2,1)' });
        }
      }
    } catch (e) { /* нет sessionStorage — открываемся с 07:46 */ }

    TAKT.map.build(document, { onLineOpen: openLine });
    TAKT.lineScreen.build(document);
    TAKT.incidentsUI.build(document, {
      onFocusIncident: id => {
        const inc = TAKT.incidents.find(x => x.id === id);
        if (inc && screen === 'map') TAKT.map.setVisibleLines(null);
        if (screen !== 'incidents') setScreen('incidents');
        TAKT.incidentsUI.select(id);
      }
    });
    TAKT.reportsUI.build(document.getElementById('reports'));
    TAKT.roles.build(document);

    sim.update(clock.minutes);   // первый кадр метрик должен видеть настоящее состояние, а не заготовки
    buildLineList();
    fillDepotNames();
    buildTrack();
    buildNarrowLines();

    document.getElementById('roleLabel').textContent = roleName(app.dataset.role);
    if (savedRole && savedRole !== 'dispatcher') setRole(savedRole);

    applyHash();   // #map-8, #line-10 и т. п. открываются сразу в нужном виде

    // Смена языка перестраивает всё, что собрано кодом: список линий,
    // ленту, таблицу, отчёты и палитру.
    i18n.onChange(() => {
      lineRows.forEach((node, id) => {
        const line = TAKT.network.lines.find(l => l.id === id);
        node.row.querySelector('.line-row__meta').textContent =
          line.lengthKm + ' ' + i18n.t('app.km') + ' · ' + i18n.t('app.depotPrefix') + ' ' + depotName(line.depot);
      });
      document.getElementById('roleLabel').textContent = roleName(app.dataset.role);
      fillDepotNames();
      labelLinePick();
      TAKT.incidentsUI.resetCache();
      TAKT.reportsUI.rebuild();
      render(clock.minutes, true);
    });

    clock.subscribe(() => { if (clock.scrubbing) { sim.update(clock.minutes); render(clock.minutes, true); } });
    requestAnimationFrame(frame);
  }

  /* Узкий экран: вместо нечитаемой схемы — список линий с состоянием. */
  function buildNarrowLines() {
    const box = document.getElementById('narrowLines');
    if (!box) return;
    TAKT.network.lines.forEach(line => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.style.gridTemplateColumns = '34px minmax(0,1fr) auto';
      const badge = document.createElement('span');
      badge.className = 'badge-line';
      badge.style.setProperty('--line-color', line.color);
      badge.textContent = line.id;
      const name = document.createElement('span');
      name.style.cssText = 'font-size:13px';
      name.textContent = i18n.pick(line.title, line.titleLat);
      const value = document.createElement('span');
      value.className = 'num';
      value.style.cssText = 'font-size:12px;color:var(--ink-2)';
      value.dataset.narrowLine = line.id;
      row.append(badge, name, value);
      box.appendChild(row);
    });
    setInterval(() => {
      if (window.innerWidth > 1023) return;
      TAKT.network.lines.forEach(line => {
        const node = box.querySelector(`[data-narrow-line='${line.id}']`);
        if (!node) return;
        const lm = sim.lineMetrics(line.id);
        node.textContent = clock.mmss(lm.actual);
      });
    }, 5000);
  }

  start();
})();
