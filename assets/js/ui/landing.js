/* ТАКТ — лендинг.
   Схема в первом экране — не картинка и не запись: это тот же симулятор,
   что работает в диспетчерской. Поэтому кнопка «Открыть демо» передаёт
   продукту текущую минуту смены, и вагоны продолжают ехать с того же места,
   а не начинают заново. */

window.TAKT = window.TAKT || {};

TAKT.landing = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const sim = TAKT.simulator, clock = TAKT.clock;
  const i18n = TAKT.i18n;
  const views = [];

  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  }

  /* Одна функция строит любую копию схемы: и большую в первом экране,
     и крошечную в карточке возможностей. Разница только в опциях. */
  function createNetworkView(svg, options) {
    const opts = Object.assign({ labels: false, cars: true, railWidth: 6, carScale: 1 }, options);
    sim.init();

    const railLayer = el('g', {}, svg);
    const stopLayer = el('g', {}, svg);
    const carLayer = el('g', {}, svg);
    const nodes = new Map();

    TAKT.network.lines.forEach(line => {
      const ctx = sim.line(line.id);
      el('path', {
        class: 'rail rail--halo', d: ctx.d, 'stroke-width': opts.railWidth + 5
      }, railLayer);
      el('path', {
        class: 'rail', d: ctx.d, stroke: line.color, 'stroke-width': opts.railWidth
      }, railLayer);
    });

    /* 'hubs' — только кружки пересадок, 'named' — ещё и подписи.
       В первом экране подписи не рисуем: они спорят с вагонами за одни
       и те же пиксели, а название города и так стоит в шапке карточки. */
    if (opts.labels) {
      const seen = new Set();
      TAKT.network.lines.forEach(line => {
        sim.line(line.id).stops.forEach(stop => {
          if (seen.has(stop.name) || !stop.hub) return;
          seen.add(stop.name);
          el('circle', { class: 'stop-dot stop-dot--hub', cx: stop.x, cy: stop.y, r: 6 }, stopLayer);
          if (opts.labels !== 'named') return;
          const label = el('text', {
            class: 'stop-label stop-label--hub',
            x: stop.x + 12, y: stop.y + 4, 'text-anchor': 'start'
          }, stopLayer);
          label.textContent = stop.name;
        });
      });
    }

    if (opts.cars) {
      sim.vehicles.forEach(veh => {
        const g = el('g', { class: 'car', 'data-status': 'ontime' }, carLayer);
        const hull = el('g', { class: 'car__hull' }, g);
        el('rect', {
          class: 'car__body', x: -11 * opts.carScale, y: -6.5 * opts.carScale,
          width: 22 * opts.carScale, height: 13 * opts.carScale, rx: 3.5 * opts.carScale
        }, hull);
        if (opts.carScale >= 0.9) {
          const label = el('text', { class: 'car__label', x: 0, y: 0 }, g);
          label.textContent = veh.line;
          // Номер растёт вместе с кузовом: иначе на крупном вагоне
          // остаётся мелкая цифра, которую на уменьшенной схеме не прочесть.
          if (opts.carScale !== 1) label.style.fontSize = (8 * opts.carScale).toFixed(1) + 'px';
        }
        nodes.set(veh.id, { g: g, hull: hull, status: '' });
      });
    }

    return {
      render() {
        if (!opts.cars) return;
        for (const veh of sim.vehicles) {
          const node = nodes.get(veh.id);
          if (!node) continue;
          node.g.style.transform = `translate3d(${veh.x.toFixed(2)}px, ${veh.y.toFixed(2)}px, 0)`;
          node.hull.style.transform = `rotate(${veh.angle.toFixed(1)}deg)`;
          const alarm = veh.status === 'stopped' && veh.incident;
          const key = veh.status + (alarm ? '!' : '');
          if (node.status !== key) {
            node.status = key;
            node.g.setAttribute('data-status', veh.status);
            if (alarm) node.g.setAttribute('data-alarm', 'true');
            else node.g.removeAttribute('data-alarm');
          }
        }
      }
    };
  }

  /* ——— первый экран ——— */

  function buildHero() {
    const svg = document.getElementById('heroMap');
    if (svg) views.push(createNetworkView(svg, { labels: 'hubs', cars: true, railWidth: 6, carScale: 1 }));

    // Адрес берём из href, а не из data-demo-link: в href движок языков уже
    // дописал ?lang=, а data-атрибут остаётся голым «app.html» — из-за этого
    // польский лендинг открывал русскую диспетчерскую.
    document.querySelectorAll('[data-demo-link]').forEach(link => {
      link.addEventListener('click', e => {
        // Ctrl/Cmd-клик и средняя кнопка — открыть в новой вкладке, как у обычной ссылки
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        goToApp(link.getAttribute('href'));
      });
    });
  }

  /* Передаём продукту текущую минуту смены. Продолжение той же смены —
     единственная причина, по которой переход выглядит как продолжение
     движения, а не как перезапуск. */
  function goToApp(target) {
    const href = target && target !== 'true' ? target : 'app.html';
    try { sessionStorage.setItem('takt:time', String(clock.minutes)); } catch (e) { /* инкогнито */ }

    const stage = document.querySelector('.hero__stage');
    if (!stage || clock.reducedMotion || !stage.animate) { location.href = href; return; }

    const rect = stage.getBoundingClientRect();
    const scale = Math.max(window.innerWidth / rect.width, 1.12);
    stage.style.transformOrigin = 'center center';
    const anim = stage.animate(
      [{ transform: 'none', opacity: 1 },
       { transform: `scale(${scale.toFixed(3)})`, opacity: 0.35 }],
      { duration: 420, easing: 'cubic-bezier(.2,0,.2,1)', fill: 'forwards' }
    );
    document.body.animate([{ opacity: 1 }, { opacity: 0.4 }],
      { duration: 420, easing: 'linear', fill: 'forwards' });
    anim.finished.then(() => { location.href = href; }).catch(() => { location.href = href; });
  }

  /* ——— живые числа ——— */

  const statNodes = {};
  function buildStats() {
    document.querySelectorAll('[data-stat]').forEach(node => {
      (statNodes[node.dataset.stat] = statNodes[node.dataset.stat] || []).push(node);
    });
  }

  function setStat(key, value) {
    const list = statNodes[key];
    if (!list) return;
    list.forEach(node => { if (node.textContent !== value) node.textContent = value; });
  }

  /* ——— мини-блоки возможностей ——— */

  let miniFeedBox = null;
  const miniFeedNodes = new Map();

  function buildMinis() {
    document.querySelectorAll('[data-mini-map]').forEach(svg => {
      views.push(createNetworkView(svg, {
        labels: svg.dataset.labels || false, cars: true,
        railWidth: Number(svg.dataset.railWidth || 7),
        carScale: Number(svg.dataset.carScale || 0.8)
      }));
    });

    miniFeedBox = document.getElementById('miniFeed');

    const bars = document.getElementById('miniBars');
    if (bars) {
      TAKT.reports.punctuality.forEach(item => {
        const line = TAKT.network.lines.find(l => l.id === item.line);
        const row = document.createElement('div');
        row.className = 'mini-bar';
        const badge = document.createElement('span');
        badge.className = 'badge-line';
        badge.style.setProperty('--line-color', line.color);
        badge.textContent = item.line;
        const track = document.createElement('span');
        track.className = 'mini-bar__track';
        const fill = document.createElement('span');
        fill.className = 'mini-bar__fill';
        fill.style.width = item.value + '%';
        fill.style.setProperty('--line-color', line.color);
        track.appendChild(fill);
        const value = document.createElement('span');
        value.className = 'mini-bar__value';
        value.textContent = item.value + '%';
        row.append(badge, track, value);
        bars.appendChild(row);
      });
    }

    buildMiniThread();
  }

  /* Мини-нитка: тот же график, что на экране «Линия», только за час
     и без осей — как превью, а не как иллюстрация. */
  function buildMiniThread() {
    const svg = document.getElementById('miniThread');
    if (!svg) return;
    const ctx = sim.line('8');
    const from = 420, span = 60, W = 300;
    svg.setAttribute('viewBox', `0 ${from} ${W} ${span}`);
    svg.setAttribute('preserveAspectRatio', 'none');

    ctx.stops.forEach(stop => {
      el('line', {
        class: 'thread-grid', x1: stop.progress * W, x2: stop.progress * W,
        y1: from, y2: from + span, 'vector-effect': 'non-scaling-stroke'
      }, svg);
    });
    sim.vehicles.filter(v => v.line === '8').forEach(veh => {
      let d = '';
      for (let t = from; t <= from + span; t += 0.9) {
        const state = sim.progressAt(veh, ctx, t);
        d += (d ? ' L ' : 'M ') + (state.progress * W).toFixed(1) + ' ' + t.toFixed(2);
      }
      el('path', { class: 'thread-line', d: d, stroke: ctx.line.color, 'vector-effect': 'non-scaling-stroke' }, svg);
    });
  }

  function renderMiniFeed(t) {
    renderFeed(miniFeedBox, t, 3);
    renderFeed(document.getElementById('compareFeed'), t, 5);
  }

  /* Лента пересобирается, только когда меняется состав или статус событий:
     раз в полсекунды переписывать одинаковые строки незачем. */
  function renderFeed(box, t, limit) {
    if (!box) return;
    const list = sim.incidentsAt(t).slice(0, limit);
    const key = list.map(x => x.inc.id + x.status).join('|');
    if (box.dataset.key !== key) {
      box.dataset.key = key;
      box.innerHTML = '';
      if (box === miniFeedBox) miniFeedNodes.clear();
      list.forEach(entry => {
        const row = document.createElement('div');
        row.className = 'mini-feed__item';
        row.dataset.tone = entry.status === 'open' ? 'alarm' : entry.status === 'working' ? 'late' : 'idle';
        const time = document.createElement('span');
        time.className = 'mini-feed__time';
        time.textContent = clock.hhmm(entry.inc.start);
        const badge = document.createElement('span');
        badge.className = 'badge-line';
        const line = TAKT.network.lines.find(l => l.id === entry.inc.line);
        badge.style.setProperty('--line-color', line.color);
        badge.textContent = entry.inc.line;
        const title = document.createElement('span');
        title.className = 'mini-feed__title';
        title.textContent = TAKT.i18n.inc(entry.inc).title;
        row.append(time, badge, title);
        box.appendChild(row);
        if (box === miniFeedBox) miniFeedNodes.set(entry.inc.id, row);
      });
    }
  }

  /* Колонка линий в «после»: то, ради чего на фото открыт Excel, —
     фактический интервал и число вагонов, только живые. */
  const compareLineNodes = new Map();

  function buildCompareLines() {
    const box = document.getElementById('compareLines');
    if (!box) return;
    TAKT.network.lines.forEach(line => {
      const row = document.createElement('div');
      row.className = 'compare__line';
      const badge = document.createElement('span');
      badge.className = 'badge-line';
      badge.style.setProperty('--line-color', line.color);
      badge.textContent = line.id;
      const headway = document.createElement('b');
      const cars = document.createElement('span');
      row.append(badge, headway, cars);
      box.appendChild(row);
      compareLineNodes.set(line.id, { headway: headway, cars: cars });
    });
  }

  function renderCompareLines() {
    compareLineNodes.forEach((node, id) => {
      const lm = sim.lineMetrics(id);
      const headway = clock.mmss(lm.actual);
      if (node.headway.textContent !== headway) node.headway.textContent = headway;
      const cars = lm.vehicles.length + ' ' + i18n.t('app.cars');
      if (node.cars.textContent !== cars) node.cars.textContent = cars;
    });
  }

  /* ——— сравнение «до / после» ——— */

  function buildCompare() {
    const box = document.getElementById('compare');
    if (!box) return;
    const range = box.querySelector('input[type=range]');
    const KNOB = 22;   // половина круглой ручки плюс пара пикселей воздуха
    const apply = value => {
      box.style.setProperty('--split', value + '%');
      // Линия разделителя честно доходит до края, а круглая ручка — нет:
      // у самого края она сдвигается внутрь, иначе половину срезает рамка.
      const x = box.clientWidth * value / 100;
      const shift = Math.max(0, KNOB - x) - Math.max(0, x - (box.clientWidth - KNOB));
      box.style.setProperty('--knob-shift', shift.toFixed(1) + 'px');
      range.setAttribute('aria-valuetext', i18n.t('compare.valuetext', { percent: Math.round(value) }));
    };
    apply(Number(range.value));
    range.addEventListener('input', () => apply(Number(range.value)));
    window.addEventListener('resize', () => apply(Number(range.value)));

    // Вся сеть на экране телефона — это вагоны размером с точку и номера,
    // которых не прочесть. Там показываем центр сети крупнее: пересадочный
    // узел и сходящиеся к нему линии. На широком экране — сеть целиком.
    const mini = box.querySelector('.compare__mini');
    const narrow = window.matchMedia('(max-width: 480px)');
    const frameMini = () => {
      if (mini) mini.setAttribute('viewBox', narrow.matches ? '420 190 600 640' : '185 22 1075 892');
    };
    frameMini();
    if (narrow.addEventListener) narrow.addEventListener('change', frameMini);

    // Перетаскивание мышью и пальцем — привычнее, чем ползунок под кадром.
    let dragging = false;
    const move = event => {
      if (!dragging) return;
      const rect = box.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width * 100;
      // До самого края: полностью «до» и полностью «после» — это два
      // крайних положения, ради которых сравнение и существует.
      const clamped = Math.max(0, Math.min(100, x));
      range.value = String(clamped);
      apply(clamped);
    };
    box.addEventListener('pointerdown', e => {
      dragging = true;
      box.setPointerCapture(e.pointerId);
      move(e);
    });
    box.addEventListener('pointermove', move);
    box.addEventListener('pointerup', () => { dragging = false; });
    box.addEventListener('pointercancel', () => { dragging = false; });
  }

  /* ——— калькулятор ——— */

  /* «1 200» для русского и польского, «1,200» для английского. */
  function money(value) {
    const sep = i18n.lang === 'en' ? ',' : ' ';
    return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  }

  function buildCalculator() {
    const range = document.getElementById('fleetSize');
    if (!range) return;
    const fleetOut = document.getElementById('calcFleet');
    const planOut = document.getElementById('calcPlan');
    const priceOut = document.getElementById('calcPrice');
    const perOut = document.getElementById('calcPer');

    const update = () => {
      const fleet = Number(range.value);
      let plan = i18n.t('plans.startName'), price = 1200;
      if (fleet > 250) { plan = i18n.t('plans.customName'); price = null; }
      else if (fleet > 50) { plan = i18n.t('plans.cityName'); price = 3900; }

      fleetOut.textContent = String(fleet);
      planOut.textContent = plan;
      // Разделитель тысяч ставим сами: в headless и на части систем нет
      // данных локали, и toLocaleString молча отдаёт «1200».
      priceOut.textContent = price === null ? i18n.t('plans.onRequest') : money(price) + ' zł';
      perOut.textContent = price === null ? '—' : (price / fleet).toFixed(0) + ' zł';
      range.setAttribute('aria-valuetext', i18n.t('plans.calcAria', { fleet: fleet, plan: plan }));
    };
    range.addEventListener('input', update);
    update();
  }

  /* ——— форма заявки ———
     Валидация не использует красный: он в этом продукте занят авариями.
     Ошибку несут янтарная рамка, значок и текст — три признака вместо цвета. */

  function buildForm() {
    const form = document.getElementById('requestForm');
    if (!form) return;

    const setInvalid = (field, message) => {
      field.dataset.invalid = 'true';
      const error = field.querySelector('.field-error span');
      if (error) error.textContent = message;
      const input = field.querySelector('input, textarea, select');
      if (input) input.setAttribute('aria-invalid', 'true');
    };
    const setValid = field => {
      field.dataset.invalid = 'false';
      const input = field.querySelector('input, textarea, select');
      if (input) input.removeAttribute('aria-invalid');
    };

    const validate = field => {
      const input = field.querySelector('input, textarea, select');
      if (!input || !input.required) return true;
      const value = input.value.trim();
      if (!value) { setInvalid(field, i18n.t('request.errEmpty')); return false; }
      if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        setInvalid(field, i18n.t('request.errEmail'));
        return false;
      }
      if (input.name === 'fleet' && (!/^\d+$/.test(value) || Number(value) < 1)) {
        setInvalid(field, i18n.t('request.errFleet'));
        return false;
      }
      setValid(field);
      return true;
    };

    form.querySelectorAll('.field').forEach(field => {
      const input = field.querySelector('input, textarea, select');
      if (!input) return;
      input.addEventListener('blur', () => { if (input.value.trim()) validate(field); });
      input.addEventListener('input', () => { if (field.dataset.invalid === 'true') validate(field); });
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const fields = [...form.querySelectorAll('.field')];
      const ok = fields.map(validate).every(Boolean);

      // Ловушка для ботов: настоящий человек это поле не видит и не заполняет.
      if (form.querySelector('[name=company_url]').value) return;

      if (!ok) {
        const first = form.querySelector('.field[data-invalid=true] input, .field[data-invalid=true] textarea');
        if (first) first.focus();
        return;
      }

      const done = document.getElementById('requestDone');
      form.hidden = true;
      done.hidden = false;
      done.focus();
    });
  }

  /* ——— общий кадр ——— */

  let lastStats = 0;

  /* Числа в разметке — фолбэк на случай выключенного JS, поэтому первый
     пересчёт делается сразу, а не через полсекунды: иначе посетитель
     успевает увидеть значения из HTML и то, как они меняются. */
  function updateStats(t) {
    const m = sim.metrics(t);
    setStat('onLine', m.onLine + ' / ' + m.fleetTotal);
    setStat('headway', clock.mmss(m.avgHeadway));
    setStat('punctuality', m.punctuality + '%');
    setStat('open', String(m.openIncidents));
    renderMiniFeed(t);
    renderCompareLines();
  }

  function frame() {
    const t = clock.minutes;
    sim.update(t);
    for (const view of views) view.render();

    const timeNode = document.getElementById('heroTime');
    if (timeNode) {
      const text = clock.hhmm(t);
      if (timeNode.textContent !== text) timeNode.textContent = text;
    }

    const now = performance.now();
    if (now - lastStats > 500) {
      lastStats = now;
      updateStats(t);
    }
    requestAnimationFrame(frame);
  }

  function frameReduced() {
    const t = clock.minutes;
    sim.update(t);
    for (const view of views) view.render();
    updateStats(t);
    const timeNode = document.getElementById('heroTime');
    if (timeNode) timeNode.textContent = clock.hhmm(t);
  }

  function start() {
    i18n.start();
    sim.init();
    buildHero();
    buildStats();
    buildMinis();
    buildCompare();
    buildCompareLines();
    buildCalculator();
    buildForm();

    // Тему применяет site-tools.js — вместе с кнопкой в шапке.

    // Смена языка перерисовывает то, что собрано кодом: калькулятор,
    // ленту происшествий и переключатель тарифов.
    i18n.onChange(() => {
      const calc = document.getElementById('fleetSize');
      if (calc) calc.dispatchEvent(new Event('input'));
      if (miniFeedBox) miniFeedBox.dataset.key = '';
      const compareFeed = document.getElementById('compareFeed');
      if (compareFeed) compareFeed.dataset.key = '';
      updateStats(clock.minutes);
    });

    sim.update(clock.minutes);
    updateStats(clock.minutes);
    if (clock.reducedMotion) {
      frameReduced();
      setInterval(frameReduced, 1000);
    } else {
      requestAnimationFrame(frame);
    }
  }

  return { start: start, createNetworkView: createNetworkView, goToApp: goToApp };
})();

TAKT.landing.start();
