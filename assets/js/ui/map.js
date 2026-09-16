/* ТАКТ — экран «Карта сети».
   Схема рисуется один раз, дальше каждый кадр меняются только transform
   у вагонов. Никаких перерисовок путей, подписей и остановок:
   на 47 вагонах разница между «переставить transform» и «перерисовать SVG»
   — это разница между 60 и 20 кадрами. */

window.TAKT = window.TAKT || {};

TAKT.map = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const sim = TAKT.simulator, clock = TAKT.clock, i18n = TAKT.i18n;

  let svg, layerRails, layerStops, layerDepots, layerIncidents, layerCars, vcard, wrap;
  const carNodes = new Map();      // id вагона → { g, hull, label, flag, flagUse, status }
  const incNodes = new Map();      // id происшествия → g
  const railNodes = new Map();     // id линии → { rail, halo }
  const stopNodes = [];            // { lines, dot, label } — узел виден, если видна хоть одна его линия
  const depotNodes = [];           // { id, g }
  let visibleLines = null;         // null — показаны все
  let selectedId = null;
  let cardKey = '';                // что сейчас написано в карточке — чтобы не пересобирать её без нужды
  let onLineOpen = () => {};
  const seenIncidents = new Set();
  const CENTER = { x: 700, y: 420 };   // Пётрковска Центр — от него разбегаются подписи

  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function build(root, handlers) {
    svg = root.querySelector('#mapSvg');
    wrap = root.querySelector('#mapWrap');
    vcard = root.querySelector('#vcard');
    layerRails = root.querySelector('#layerRails');
    layerStops = root.querySelector('#layerStops');
    layerDepots = root.querySelector('#layerDepots');
    layerIncidents = root.querySelector('#layerIncidents');
    layerCars = root.querySelector('#layerCars');
    onLineOpen = handlers.onLineOpen || onLineOpen;

    sim.init();
    drawDepots();
    drawRails();
    drawStops();
    drawIncidents();
    drawCars();
    bindPointer();
  }

  /* ——— статика ——— */

  function drawRails() {
    TAKT.network.lines.forEach(line => {
      const ctx = sim.line(line.id);
      const halo = el('path', { class: 'rail rail--halo', d: ctx.d }, layerRails);
      const rail = el('path', {
        class: 'rail', d: ctx.d, stroke: line.color,
        role: 'button', tabindex: '0',
        'aria-label': i18n.t('app.lineOpen', { id: line.id, title: i18n.pick(line.title, line.titleLat) })
      }, layerRails);
      rail.style.cursor = 'pointer';
      rail.addEventListener('click', () => onLineOpen(line.id));
      rail.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onLineOpen(line.id); }
      });
      railNodes.set(line.id, { rail: rail, halo: halo });
    });
  }

  /* Остановка с одним именем на трёх линиях рисуется один раз:
     диспетчер видит узел, а не три кружка друг на друге. */
  function drawStops() {
    const seen = new Map();
    TAKT.network.lines.forEach(line => {
      const ctx = sim.line(line.id);
      ctx.stops.forEach(stop => {
        const key = stop.name;
        if (seen.has(key)) { seen.get(key).lines.push(line.id); return; }
        seen.set(key, { stop: stop, lines: [line.id], ctx: ctx });
      });
    });

    seen.forEach(entry => {
      const { stop, ctx } = entry;
      const hub = stop.hub || entry.lines.length > 1;
      const g = el('g', {}, layerStops);
      el('circle', {
        class: 'stop-dot' + (hub ? ' stop-dot--hub' : ''),
        cx: stop.x, cy: stop.y, r: hub ? 6 : 4
      }, g);

      // Подпись отходит от рельса перпендикулярно и наружу от центра схемы.
      // Перпендикулярно — чтобы не лечь на линию; наружу — чтобы подписи
      // разбегались от плотного центра, а не толпились в нём.
      const angle = tangentAt(ctx, stop.progress);
      const vertical = Math.abs(Math.sin(angle * Math.PI / 180)) > 0.6;
      const gap = hub ? 12 : 9;
      let x = stop.x, y = stop.y, anchor = 'middle';
      if (stop.pos === 'below') {
        // Ручная подсадка для самых тесных узлов. На схемах метро подписи
        // тоже расставляют руками — автоматика в центре всегда промахивается.
        y = stop.y + gap + 12;
      } else if (stop.pos === 'above') {
        y = stop.y - gap - 4;
      } else if (vertical) {
        const toRight = stop.x >= CENTER.x;
        x = stop.x + (toRight ? gap : -gap);
        y = stop.y + 3.5;
        anchor = toRight ? 'start' : 'end';
      } else {
        y = stop.y + (stop.y <= CENTER.y ? -(gap + 2) : gap + 10);
      }
      const label = el('text', {
        class: 'stop-label' + (hub ? ' stop-label--hub' : ''),
        x: x, y: y, 'text-anchor': anchor
      }, layerStops);
      label.textContent = i18n.pick(stop.name, stop.nameLat);
      stopNodes.push({ lines: entry.lines, dot: g, label: label });
    });
  }

  function tangentAt(ctx, progress) {
    const i = Math.min(ctx.track.count - 1, Math.max(0, Math.round(progress * (ctx.track.count - 1))));
    return ctx.track.angles[i];
  }

  function drawDepots() {
    TAKT.network.depots.forEach(depot => {
      const g = el('g', {}, layerDepots);
      el('rect', {
        class: 'depot-mark', x: depot.x - 12, y: depot.y - 12,
        width: 24, height: 24, rx: 4
      }, g);
      const label = el('text', {
        class: 'depot-label', x: depot.x, y: depot.y + 26, 'text-anchor': 'middle'
      }, g);
      label.textContent = i18n.t('app.depotPrefix') + ' ' + i18n.pick(depot.name, depot.nameLat);
      depotNodes.push({ id: depot.id, g: g });
    });
  }

  function drawIncidents() {
    TAKT.incidents.forEach(inc => {
      const g = el('g', {
        class: 'inc-mark', tabindex: '0', role: 'button',
        'aria-label': i18n.inc(inc).title + ', ' + i18n.t('app.lineHint', { line: inc.line })
      }, layerIncidents);
      g.style.display = 'none';
      el('circle', { class: 'inc-mark__pulse', cx: inc.at.x, cy: inc.at.y, r: 8 }, g);
      el('path', {
        class: 'inc-mark__shape',
        d: `M ${inc.at.x} ${inc.at.y - 9} L ${inc.at.x + 8} ${inc.at.y + 6} L ${inc.at.x - 8} ${inc.at.y + 6} Z`
      }, g);
      incNodes.set(inc.id, g);
    });
  }

  function drawCars() {
    sim.vehicles.forEach(veh => {
      const line = TAKT.network.lines.find(l => l.id === veh.line);
      const g = el('g', {
        class: 'car', tabindex: '0', role: 'button',
        'data-status': 'ontime', 'data-id': veh.id
      }, layerCars);

      // Кузов вращается по касательной, номер маршрута — нет:
      // иначе на обратном пути цифры едут вверх ногами.
      const hull = el('g', { class: 'car__hull' }, g);
      el('rect', { class: 'car__ring', x: -14, y: -9.5, width: 28, height: 19, rx: 5 }, hull);
      el('rect', { class: 'car__body', x: -11, y: -6.5, width: 22, height: 13, rx: 3.5 }, hull);

      const label = el('text', { class: 'car__label', x: 0, y: 0 }, g);
      label.textContent = line.id;

      const flag = el('g', { class: 'car__flag' }, g);
      el('circle', { cx: 11, cy: -10, r: 5.5, fill: 'var(--bg)' }, flag);
      const flagUse = el('use', { x: 6.5, y: -14.5, width: 9, height: 9 }, flag);
      flag.style.display = 'none';

      carNodes.set(veh.id, { g: g, hull: hull, flag: flag, flagUse: flagUse, status: '', alarm: false });
    });
  }

  /* ——— кадр ——— */

  const FLAGS = { late: '#st-late', early: '#st-early', stopped: '#st-stopped' };

  function render(t) {
    const vehicles = sim.vehicles;
    for (let i = 0; i < vehicles.length; i++) {
      const veh = vehicles[i];
      const node = carNodes.get(veh.id);
      if (!node) continue;

      if (visibleLines && !visibleLines.has(veh.line)) {
        if (node.g.style.display !== 'none') node.g.style.display = 'none';
        continue;
      }
      if (node.g.style.display === 'none') node.g.style.display = '';

      node.g.style.transform = `translate3d(${veh.x.toFixed(2)}px, ${veh.y.toFixed(2)}px, 0)`;
      node.hull.style.transform = `rotate(${veh.angle.toFixed(1)}deg)`;

      const alarm = veh.status === 'stopped' && veh.incident && veh.incident.blocking;
      if (node.status !== veh.status || node.alarm !== alarm) {
        node.status = veh.status;
        node.alarm = alarm;
        node.g.setAttribute('data-status', veh.status);
        if (alarm) node.g.setAttribute('data-alarm', 'true');
        else node.g.removeAttribute('data-alarm');
        const flagId = alarm ? '#st-alarm' : FLAGS[veh.status];
        if (flagId) {
          node.flagUse.setAttribute('href', flagId);
          node.flag.style.display = '';
          node.flag.style.color = alarm ? 'var(--st-alarm)'
            : veh.status === 'late' ? 'var(--st-late)'
            : veh.status === 'early' ? 'var(--st-early)' : 'var(--st-idle)';
        } else {
          node.flag.style.display = 'none';
        }
      }
    }

    renderIncidentMarks(t);
    if (selectedId != null && !vcard.hidden) {
      updateCard(selectedId);
      positionCard(carNodes.get(selectedId).g);
    }
  }

  function renderIncidentMarks(t) {
    TAKT.incidents.forEach(inc => {
      const g = incNodes.get(inc.id);
      const status = sim.incidentStatusAt(inc, t);
      if (!status || (visibleLines && !visibleLines.has(inc.line))) {
        g.style.display = 'none';
        return;
      }
      g.style.display = '';
      const tone = status === 'open' ? 'alarm' : status === 'working' ? 'late' : 'idle';
      if (g.getAttribute('data-tone') !== tone) g.setAttribute('data-tone', tone);

      // Импульс ровно один раз — в момент появления события. Повторяющегося
      // мигания в интерфейсе нет нигде: это прямой запрет заказчика.
      if (status !== 'closed' && !seenIncidents.has(inc.id) && t - inc.start < 1.5) {
        seenIncidents.add(inc.id);
        if (!clock.reducedMotion) {
          g.classList.add('is-new');
          setTimeout(() => g.classList.remove('is-new'), 700);
        }
      }
    });
  }

  /* ——— карточка вагона ———
     Карточка открывается только нажатием (или фокусом с клавиатуры), а не
     наведением: при 47 движущихся вагонах курсор постоянно задевает соседей,
     и данные выбранного вагона подменялись чужими. Наведение даёт лишь
     обводку. Сменить вагон — нажать на другой; закрыть — пустое место
     схемы или Esc. */

  function bindPointer() {
    svg.addEventListener('click', e => {
      if (e.target.closest('.car, .inc-mark, .rail')) return;
      if (selectedId != null) select(null);
    });
    layerCars.addEventListener('focusin', e => {
      const car = e.target.closest('.car');
      if (!car) return;
      select(Number(car.dataset.id));
    });
    layerCars.addEventListener('click', e => {
      const car = e.target.closest('.car');
      if (!car) return;
      select(Number(car.dataset.id));
    });
    layerIncidents.addEventListener('click', e => {
      const mark = e.target.closest('.inc-mark');
      if (!mark) return;
      const entry = [...incNodes.entries()].find(pair => pair[1] === mark);
      if (entry) document.dispatchEvent(new CustomEvent('takt:incident', { detail: entry[0] }));
    });
  }

  function select(id) {
    if (selectedId != null && carNodes.has(selectedId)) {
      carNodes.get(selectedId).g.removeAttribute('data-selected');
    }
    selectedId = id;
    if (id != null && carNodes.has(id)) {
      carNodes.get(id).g.setAttribute('data-selected', 'true');
      showCard(id, carNodes.get(id).g);
    } else {
      selectedId = null;
      hideCard();
    }
  }

  function showCard(id, node) {
    cardKey = '';
    updateCard(id);
    vcard.hidden = false;
    positionCard(node);
  }

  function positionCard(node) {
    if (!node || !wrap) return;
    const box = node.getBoundingClientRect();
    const area = wrap.getBoundingClientRect();
    const width = 268, height = vcard.offsetHeight || 190;
    let left = box.left - area.left + box.width + 14;
    let top = box.top - area.top - 8;
    if (left + width > area.width - 8) left = box.left - area.left - width - 14;
    if (left < 8) left = 8;
    if (top + height > area.height - 8) top = area.height - height - 8;
    if (top < 8) top = 8;
    vcard.style.left = left + 'px';
    vcard.style.top = top + 'px';
  }

  const STATUS_TONE = { ontime: 'ontime', late: 'late', early: 'early', stopped: 'stopped' };

  function updateCard(id) {
    const veh = sim.vehicles.find(v => v.id === id);
    if (!veh) return;
    const line = TAKT.network.lines.find(l => l.id === veh.line);
    const alarm = veh.status === 'stopped' && veh.incident;
    const text = i18n.t('status.' + veh.status);
    const tone = STATUS_TONE[veh.status];

    // Карточка открыта, пока диспетчер её не закроет, а render зовёт нас
    // каждый кадр. Пересобираем разметку, только когда поменялась хоть одна
    // видимая цифра, — иначе role="status" зачитывал бы её 60 раз в секунду.
    const key = [i18n.lang, id, veh.status, alarm ? veh.incident.id : '', veh.tab,
      clock.deviation(veh.deviation), veh.status === 'stopped' ? clock.mmss(veh.holdMin) : veh.speedKmh,
      veh.nextStop, veh.occupancy].join('|');
    if (key === cardKey) return;
    cardKey = key;

    vcard.innerHTML = '';
    const top = document.createElement('div');
    top.className = 'vcard__top';

    const badge = document.createElement('span');
    badge.className = 'badge-line';
    badge.style.setProperty('--line-color', line.color);
    badge.textContent = line.id;
    top.appendChild(badge);

    const idEl = document.createElement('span');
    idEl.className = 'vcard__id';
    idEl.textContent = veh.id;
    top.appendChild(idEl);

    const status = document.createElement('span');
    status.className = 'status';
    status.style.marginLeft = 'auto';
    status.dataset.tone = alarm ? 'alarm' : tone;
    status.innerHTML = `<svg width="12" height="12" aria-hidden="true"><use href="#st-${alarm ? 'alarm' : veh.status}"/></svg>`;
    status.appendChild(document.createTextNode(alarm ? i18n.t('status.stopped') : text));
    top.appendChild(status);
    vcard.appendChild(top);

    const rows = document.createElement('div');
    rows.className = 'vcard__rows';
    const data = [
      [i18n.t('app.vTab'), String(veh.tab)],
      [i18n.t('app.vDriver'), i18n.pick(veh.driver, veh.driverLat)],
      [i18n.t('app.vDeviation'), clock.deviation(veh.deviation)],
      veh.status === 'stopped'
        ? [i18n.t('app.vStanding'), clock.mmss(veh.holdMin)]
        : [i18n.t('app.vSpeed'), veh.speedKmh + ' ' + i18n.t('app.kmh')],
      [i18n.t('app.vNext'), i18n.pick(veh.nextStop, veh.nextStopLat)],
      [i18n.t('app.vModel'), veh.model]
    ];
    data.forEach(([key, value], index) => {
      const row = document.createElement('div');
      row.className = 'vcard__row';
      const k = document.createElement('span'); k.className = 'vcard__key'; k.textContent = key;
      const v = document.createElement('span');
      v.className = 'vcard__val' + (index >= 2 && index <= 3 ? ' num' : '');
      v.textContent = value;
      row.append(k, v);
      rows.appendChild(row);
    });

    const occRow = document.createElement('div');
    occRow.className = 'vcard__row';
    const occKey = document.createElement('span'); occKey.className = 'vcard__key'; occKey.textContent = i18n.t('app.vOccupancy');
    const bar = document.createElement('span'); bar.className = 'vcard__bar';
    const fill = document.createElement('i'); fill.style.width = veh.occupancy + '%';
    bar.appendChild(fill);
    const occVal = document.createElement('span');
    occVal.className = 'vcard__val num'; occVal.style.minWidth = '38px';
    occVal.textContent = veh.occupancy + '%';
    occRow.append(occKey, bar, occVal);
    rows.appendChild(occRow);

    if (alarm) {
      const inc = document.createElement('div');
      inc.className = 'vcard__row';
      inc.style.marginTop = '6px';
      inc.style.paddingTop = '6px';
      inc.style.borderTop = '1px solid var(--line)';
      const k = document.createElement('span'); k.className = 'vcard__key'; k.textContent = i18n.t('app.vReason');
      const v = document.createElement('span'); v.className = 'vcard__val'; v.textContent = i18n.inc(veh.incident).title;
      inc.append(k, v);
      rows.appendChild(inc);
    }

    vcard.appendChild(rows);
    const node = carNodes.get(id);
    if (node) node.g.setAttribute('aria-label', i18n.t('app.carAria', {
      id: veh.id, line: veh.line, tab: veh.tab,
      status: alarm ? i18n.t('status.blocked') : text,
      dev: clock.deviation(veh.deviation), next: i18n.pick(veh.nextStop, veh.nextStopLat)
    }));
  }

  function hideCard() { vcard.hidden = true; }

  /* ——— фильтр линий ———
     Отфильтрованная линия исчезает целиком: рельс, её остановки, депо,
     значки происшествий и вагоны. Полупрозрачный «призрак» сети оставлял
     в глазах те же шесть цветов, и выбранная линия в них терялась.
     Пересадочный узел остаётся, если через него идёт хоть одна видимая линия. */

  function setVisibleLines(ids) {
    visibleLines = ids;
    const shown = id => !ids || ids.has(id);
    const hide = (node, hidden) => {
      if (hidden) node.setAttribute('data-hidden', 'true');
      else node.removeAttribute('data-hidden');
    };

    railNodes.forEach((node, id) => {
      const hidden = !shown(id);
      hide(node.rail, hidden);
      hide(node.halo, hidden);
      // Невидимый рельс не должен ловить Tab и объявляться скринридером.
      node.rail.setAttribute('tabindex', hidden ? '-1' : '0');
      if (hidden) node.rail.setAttribute('aria-hidden', 'true');
      else node.rail.removeAttribute('aria-hidden');
    });
    stopNodes.forEach(node => {
      const hidden = !node.lines.some(shown);
      hide(node.dot, hidden);
      hide(node.label, hidden);
    });
    depotNodes.forEach(node => {
      hide(node.g, !TAKT.network.lines.some(line => line.depot === node.id && shown(line.id)));
    });

    // Карточка вагона со скрытой линии висела бы над пустым местом.
    if (selectedId != null && ids) {
      const veh = sim.vehicles.find(v => v.id === selectedId);
      if (veh && !ids.has(veh.line)) select(null);
    }
  }

  /* ——— распрямление маршрута ———
     У пути уже есть таблица сэмплов. Целевая форма — те же самые точки,
     разложенные по прямой. Значит морфинг это линейная интерполяция
     между двумя наборами одинаковой длины: никакой библиотеки, и главное —
     вагоны всё время остаются на линии, потому что позиция считается
     по той же промежуточной таблице, что и сама кривая.

     k = 0 — схема, k = 1 — прямая ось. */

  const STRAIGHT_Y = 150, STRAIGHT_X0 = 130, STRAIGHT_X1 = 1310;
  const morphTrack = { count: 0, xs: null, ys: null, angles: null };

  function morph(lineId, k) {
    const ctx = sim.line(lineId);
    const node = railNodes.get(lineId);
    if (!ctx || !node) return;

    const n = ctx.track.count;
    if (morphTrack.count !== n) {
      morphTrack.count = n;
      morphTrack.xs = new Float32Array(n);
      morphTrack.ys = new Float32Array(n);
      morphTrack.angles = new Float32Array(n);
    }

    const ease = k <= 0 ? 0 : k >= 1 ? 1 : k;
    let d = '';
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1);
      const tx = STRAIGHT_X0 + (STRAIGHT_X1 - STRAIGHT_X0) * f;
      const x = ctx.track.xs[i] + (tx - ctx.track.xs[i]) * ease;
      const y = ctx.track.ys[i] + (STRAIGHT_Y - ctx.track.ys[i]) * ease;
      morphTrack.xs[i] = x; morphTrack.ys[i] = y;
      d += (i === 0 ? 'M ' : ' L ') + x.toFixed(1) + ' ' + y.toFixed(1);
    }
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      morphTrack.angles[i] = Math.atan2(morphTrack.ys[b] - morphTrack.ys[a], morphTrack.xs[b] - morphTrack.xs[a]) * 180 / Math.PI;
    }

    node.rail.setAttribute('d', d);
    node.halo.setAttribute('d', d);

    // Вагоны едут по промежуточной форме — они не отрываются от рельса
    // ни в один кадр распрямления.
    sim.vehicles.forEach(veh => {
      if (veh.line !== lineId) return;
      const carNode = carNodes.get(veh.id);
      if (!carNode) return;
      const p = TAKT.geometry.at(morphTrack, veh.progress, {});
      carNode.g.style.transform = `translate3d(${p.x.toFixed(2)}px, ${p.y.toFixed(2)}px, 0)`;
      carNode.hull.style.transform = `rotate(${(veh.dir === 1 ? p.angle : p.angle + 180).toFixed(1)}deg)`;
    });

    // Остановки и подписи уезжают вместе с линией — иначе распрямляется
    // одна кривая, а схема вокруг остаётся, и связь теряется.
    layerStops.style.opacity = String(1 - ease);
    layerDepots.style.opacity = String(1 - ease);
  }

  function resetMorph(lineId) {
    const ctx = sim.line(lineId);
    const node = railNodes.get(lineId);
    if (!ctx || !node) return;
    node.rail.setAttribute('d', ctx.d);
    node.halo.setAttribute('d', ctx.d);
    layerStops.style.opacity = '';
    layerDepots.style.opacity = '';
  }

  /* Обход вагонов стрелками — быстрее, чем ловить мышью движущуюся точку. */
  function focusNext(delta) {
    const list = sim.vehicles.filter(v => !visibleLines || visibleLines.has(v.line));
    if (!list.length) return;
    const index = list.findIndex(v => v.id === selectedId);
    const next = list[(index + delta + list.length) % list.length] || list[0];
    select(next.id);
    const node = carNodes.get(next.id);
    if (node) node.g.focus();
  }

  return {
    build: build,
    render: render,
    select: select,
    morph: morph,
    resetMorph: resetMorph,
    focusNext: focusNext,
    setVisibleLines: setVisibleLines,
    hideCard: hideCard,
    get selectedId() { return selectedId; },
    get visibleLines() { return visibleLines; }
  };
})();
