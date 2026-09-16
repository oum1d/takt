/* ТАКТ — экран «Линия».
   Наверху маршрут, распрямлённый в горизонтальную ось. Внизу — классическая
   транспортная «нитка»: по вертикали время, по горизонтали путь, каждый рейс
   наклонная линия. Ровный интервал выглядит как пачка параллельных линий;
   если две сошлись — вагоны идут паровозом, и это видно раньше, чем в цифрах.

   Нитка рисует не «сейчас», а полтора часа смены сразу, поэтому строится
   не каждый кадр: содержимое пересобирается раз в несколько модельных минут,
   а прокрутка по времени делается сдвигом viewBox — это бесплатно. */

window.TAKT = window.TAKT || {};

TAKT.lineScreen = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const sim = TAKT.simulator, clock = TAKT.clock, i18n = TAKT.i18n;

  const WINDOW_MIN = 60;      // сколько минут видно за раз
  const LOOKBACK = 45;        // из них позади текущего момента
  const BUILD_SPAN = 150;     // сколько строим про запас
  const STEP = 0.75;          // шаг выборки, минуты
  const W = 1000;             // ширина в собственных координатах нитки
  const STRIP_Y = 30;         // ось маршрута: вагоны над ней, названия под ней

  let stripSvg, threadSvg, timesBox;
  let gridLayer, bandLayer, pathLayer, nowLine;
  let currentLine = '8';
  let builtFrom = null, builtLine = null;
  const threadPaths = new Map();

  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function build(root) {
    stripSvg = root.querySelector('#stripSvg');
    threadSvg = root.querySelector('#threadSvg');
    timesBox = root.querySelector('#threadTimes');
    bandLayer = el('g', {}, threadSvg);
    gridLayer = el('g', {}, threadSvg);
    pathLayer = el('g', {}, threadSvg);
    nowLine = el('line', { class: 'thread-now', x1: 0, x2: W, 'vector-effect': 'non-scaling-stroke' }, threadSvg);
  }

  function setLine(id) {
    currentLine = id;
    builtFrom = null;
    drawStrip();
  }

  /* ——— распрямлённый маршрут ——— */

  function drawStrip() {
    const ctx = sim.line(currentLine);
    const line = ctx.line;
    stripSvg.innerHTML = '';

    const x0 = 40, x1 = 1160, y = STRIP_Y;
    el('line', {
      class: 'strip-rail', x1: x0, y1: y, x2: x1, y2: y, stroke: line.color
    }, stripSvg);

    ctx.stops.forEach((stop, i) => {
      const x = x0 + (x1 - x0) * stop.progress;
      el('circle', { class: 'strip-stop', cx: x, cy: y, r: stop.hub ? 6 : 4.5 }, stripSvg);
      // Подписи чередуются по двум строкам под осью: на длинной линии
      // одиннадцать названий в один ряд не помещаются никогда.
      const label = el('text', {
        class: 'strip-label', x: x, y: i % 2 ? y + 20 : y + 34,
        'text-anchor': 'middle', 'font-weight': stop.hub ? '600' : '400'
      }, stripSvg);
      label.textContent = i18n.pick(stop.name, stop.nameLat);
    });

    el('g', { id: 'stripCars' }, stripSvg);
  }

  /* Вагоны на полосе: идущие «туда» над осью, обратные под ней.
     Так на одной прямой помещаются оба направления и не сливаются. */
  function renderStrip() {
    const layer = stripSvg.querySelector('#stripCars');
    if (!layer) return;
    const ctx = sim.line(currentLine);
    const x0 = 40, x1 = 1160, y = STRIP_Y;
    const crew = sim.vehicles.filter(v => v.line === currentLine);

    while (layer.childNodes.length > crew.length) layer.removeChild(layer.lastChild);
    while (layer.childNodes.length < crew.length) {
      const g = document.createElementNS(NS, 'g');
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('r', 5.5);
      dot.setAttribute('stroke', 'var(--panel)');
      dot.setAttribute('stroke-width', '1.5');
      const tab = document.createElementNS(NS, 'text');
      tab.setAttribute('class', 'num');
      tab.setAttribute('font-size', '8');
      tab.setAttribute('text-anchor', 'middle');
      tab.setAttribute('fill', 'var(--on-accent)');
      tab.setAttribute('font-weight', '600');
      g.append(dot, tab);
      layer.appendChild(g);
    }

    crew.forEach((veh, i) => {
      const g = layer.childNodes[i];
      const dot = g.firstChild, tab = g.lastChild;
      const x = x0 + (x1 - x0) * veh.progress;
      const cy = veh.dir === 1 ? y - 13 : y - 1;
      dot.setAttribute('cx', x); dot.setAttribute('cy', cy);
      dot.setAttribute('fill', statusColor(veh));
      tab.setAttribute('x', x); tab.setAttribute('y', cy + 2.6);
      tab.textContent = veh.tab;
    });
    void ctx;
  }

  function statusColor(veh) {
    if (veh.status === 'stopped') return veh.incident ? 'var(--st-alarm)' : 'var(--st-idle)';
    if (veh.status === 'late') return 'var(--st-late)';
    if (veh.status === 'early') return 'var(--st-early)';
    return 'var(--st-ontime)';
  }

  /* ——— нитка ——— */

  function buildThread(from) {
    const ctx = sim.line(currentLine);
    const crew = sim.vehicles.filter(v => v.line === currentLine);
    builtFrom = from;
    builtLine = currentLine;

    gridLayer.innerHTML = '';
    bandLayer.innerHTML = '';
    pathLayer.innerHTML = '';
    threadPaths.clear();

    const to = from + BUILD_SPAN;

    // Вертикали — остановки. Горизонтали — каждые 10 минут.
    ctx.stops.forEach(stop => {
      el('line', {
        class: 'thread-grid', x1: stop.progress * W, x2: stop.progress * W,
        y1: from, y2: to, 'vector-effect': 'non-scaling-stroke'
      }, gridLayer);
    });
    for (let m = Math.ceil(from / 10) * 10; m <= to; m += 10) {
      el('line', {
        class: 'thread-grid', x1: 0, x2: W, y1: m, y2: m, 'vector-effect': 'non-scaling-stroke'
      }, gridLayer);
    }

    // Полосой отмечаются только перекрытия пути — то, из-за чего рейсы
    // физически встали. Если красить весь час, когда «вагон шёл не по графику»,
    // полоса закрасит весь экран и перестанет что-либо значить.
    ctx.incidents.forEach(inc => {
      if (!inc.blocking) return;
      const end = inc.closedAt != null ? inc.closedAt : to;
      if (end < from || inc.start > to) return;
      const y = Math.max(from, inc.start);
      const height = Math.max(0.4, Math.min(to, end) - y);
      el('rect', { class: 'thread-band', x: 0, width: W, y: y, height: height }, bandLayer);
      el('line', {
        class: 'thread-band-edge', x1: 0, x2: W, y1: y, y2: y, 'vector-effect': 'non-scaling-stroke'
      }, bandLayer);
    });

    crew.forEach(veh => {
      let d = '';
      for (let t = from; t <= to; t += STEP) {
        const state = sim.progressAt(veh, ctx, t);
        d += (d ? ' L ' : 'M ') + (state.progress * W).toFixed(1) + ' ' + t.toFixed(2);
      }
      const path = el('path', {
        class: 'thread-line', d: d, stroke: ctx.line.color,
        'data-tab': veh.tab, 'vector-effect': 'non-scaling-stroke'
      }, pathLayer);
      threadPaths.set(veh.id, path);
    });
  }

  function renderThread(t) {
    if (builtLine !== currentLine || builtFrom === null ||
        t - LOOKBACK < builtFrom + 2 || t + (WINDOW_MIN - LOOKBACK) > builtFrom + BUILD_SPAN - 2) {
      buildThread(Math.max(clock.SHIFT_START - 10, t - BUILD_SPAN * 0.55));
    }

    const top = t - LOOKBACK;
    threadSvg.setAttribute('viewBox', `0 ${top.toFixed(2)} ${W} ${WINDOW_MIN}`);
    nowLine.setAttribute('y1', t); nowLine.setAttribute('y2', t);

    if (!timesBox) return;
    const marks = [];
    for (let m = Math.ceil(top / 10) * 10; m <= top + WINDOW_MIN; m += 10) marks.push(m);
    while (timesBox.childElementCount > marks.length) timesBox.removeChild(timesBox.lastChild);
    while (timesBox.childElementCount < marks.length) {
      const span = document.createElement('span');
      span.className = 'thread-time num';
      timesBox.appendChild(span);
    }
    marks.forEach((m, i) => {
      const node = timesBox.children[i];
      node.textContent = clock.hhmm(m);
      node.style.top = (((m - top) / WINDOW_MIN) * 100).toFixed(2) + '%';
    });
  }

  function render(t) {
    renderStrip();
    renderThread(t);
    renderMetrics();
  }

  function renderMetrics() {
    const m = sim.lineMetrics(currentLine);
    const set = (id, value) => {
      const node = document.getElementById(id);
      if (node && node.textContent !== value) node.textContent = value;
    };
    set('lmPlanned', clock.mmss(m.planned));
    set('lmActual', clock.mmss(m.actual));
    set('lmWorst', m.worst ? `${m.worst.id} ${clock.deviation(m.worst.deviation)}` : '—');
    set('lmPunct', m.punctuality + '%');

    const line = m.ctx.line;
    set('lineTitleNum', line.id);
    set('lineTitleName', i18n.pick(line.title, line.titleLat));
  }

  function highlight(vehicleId) {
    threadPaths.forEach((path, id) => {
      path.style.strokeWidth = id === vehicleId ? '3' : '';
      path.style.opacity = vehicleId == null ? '' : (id === vehicleId ? '1' : '.3');
    });
  }

  return {
    build: build,
    setLine: setLine,
    render: render,
    highlight: highlight,
    get current() { return currentLine; }
  };
})();
