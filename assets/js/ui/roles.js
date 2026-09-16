/* ТАКТ — экраны ролей.

   Смысл этих двух экранов в том, чего на них НЕТ. Начальнику депо не нужна
   схема: он не управляет движением, он смотрит, всё ли в порядке, — значит
   крупные числа и незакрытые события. Водителю не нужны ни сеть, ни отчёты:
   у него один вагон, и экран он видит несколько секунд на остановке, поэтому
   одно главное число размером в пол-карточки.

   Данные те же самые, что у диспетчера: это одна смена, показанная с трёх
   разных мест. */

window.TAKT = window.TAKT || {};

TAKT.roles = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const sim = TAKT.simulator, clock = TAKT.clock, i18n = TAKT.i18n;

  let depotNumbers, depotOpen, depotLines, depotSub;
  let driverPick, driverStrip, driverSub;
  let driverId = 1284;          // вагон из брифа: выход 3 на восьмёрке
  let stripBuilt = null;
  let openKey = '';

  const TONE = { ontime: 'ontime', late: 'late', early: 'early', stopped: 'stopped' };

  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    for (const key in attrs) node.setAttribute(key, attrs[key]);
    if (parent) parent.appendChild(node);
    return node;
  }

  function build(root) {
    depotNumbers = root.querySelector('#depotNumbers');
    depotOpen = root.querySelector('#depotOpen');
    depotLines = root.querySelector('#depotLines');
    depotSub = root.querySelector('#depotSub');
    driverPick = root.querySelector('#driverPick');
    driverStrip = root.querySelector('#driverStrip');
    driverSub = root.querySelector('#driverSub');

    buildDepotCells();
    buildDriverPicker();

    const report = root.querySelector('#driverReport');
    if (report) {
      report.addEventListener('click', () => {
        report.textContent = i18n.t('roles.reportSent');
        report.disabled = true;
        setTimeout(() => { report.textContent = i18n.t('roles.report'); report.disabled = false; }, 2600);
      });
    }
  }

  /* ——— начальник депо ——— */

  const DEPOT_CELLS = [
    ['onLine', 'roles.sOnLine', ''],
    ['headway', 'roles.sHeadway', 'roles.sHeadwayNote'],
    ['punctuality', 'roles.sPunct', 'roles.sPunctNote'],
    ['open', 'roles.sOpen', ''],
    ['stopped', 'roles.sStopped', ''],
    ['downtime', 'roles.sDowntime', 'roles.sDowntimeNote']
  ];
  const depotCells = {};

  function buildDepotCells() {
    if (!depotNumbers) return;
    DEPOT_CELLS.forEach(([key, label, note]) => {
      const cell = document.createElement('div');
      cell.className = 'summary__cell';
      const lab = document.createElement('span');
      lab.className = 'summary__label';
      lab.textContent = i18n.t(label);
      const value = document.createElement('span');
      value.className = 'summary__value';
      value.textContent = '—';
      cell.append(lab, value);
      if (note) {
        const hint = document.createElement('span');
        hint.className = 'summary__note';
        hint.textContent = i18n.t(note);
        cell.appendChild(hint);
      }
      depotNumbers.appendChild(cell);
      depotCells[key] = value;
    });
  }

  function renderDepot(t) {
    if (!depotNumbers) return;
    const m = sim.metrics(t);

    let downtime = 0;
    for (const inc of TAKT.incidents) {
      if (inc.closedAt != null && t >= inc.closedAt) downtime += inc.downtimeMin || 0;
    }

    const set = (key, value, tone) => {
      const node = depotCells[key];
      if (!node) return;
      if (node.textContent !== value) node.textContent = value;
      if (tone) node.dataset.tone = tone; else node.removeAttribute('data-tone');
    };
    set('onLine', m.onLine + '/' + m.fleetTotal);
    set('headway', clock.mmss(m.avgHeadway));
    set('punctuality', m.punctuality + '%');
    set('open', String(m.openIncidents), m.openIncidents ? 'alarm' : null);
    set('stopped', String(m.stopped), m.stopped ? 'alarm' : null);
    set('downtime', clock.dur(downtime));

    if (depotSub) {
      const text = i18n.t('roles.depotSub', { time: clock.hhmm(t) });
      if (depotSub.textContent !== text) depotSub.textContent = text;
    }

    renderDepotOpen(t);
    renderDepotLines();
  }

  function renderDepotOpen(t) {
    const list = sim.incidentsAt(t).filter(entry => !entry.closed);
    const key = list.map(x => x.inc.id + x.status).join('|');
    if (key === openKey) {
      list.forEach(entry => {
        const node = depotOpen.querySelector('[data-dur="' + entry.inc.id + '"]');
        if (node) node.textContent = clock.mmss(entry.duration);
      });
      return;
    }
    openKey = key;
    depotOpen.innerHTML = '';

    if (!list.length) {
      const empty = document.createElement('p');
      empty.style.cssText = 'font-size:13px;color:var(--ink-3)';
      empty.textContent = i18n.t('roles.allClear');
      depotOpen.appendChild(empty);
      return;
    }

    list.forEach(entry => {
      const line = TAKT.network.lines.find(l => l.id === entry.inc.line);
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'summary__line';
      row.style.cursor = 'pointer';
      row.style.textAlign = 'left';
      row.style.font = 'inherit';
      row.style.color = 'inherit';

      const badge = document.createElement('span');
      badge.className = 'badge-line';
      badge.style.setProperty('--line-color', line ? line.color : 'var(--ink-2)');
      badge.textContent = entry.inc.line;

      const name = document.createElement('span');
      name.className = 'summary__line-name';
      name.textContent = i18n.inc(entry.inc).title;

      const status = document.createElement('span');
      status.className = 'status';
      status.dataset.tone = entry.status === 'open' ? 'alarm' : 'late';
      status.innerHTML = '<svg width="12" height="12" aria-hidden="true"><use href="#st-' +
        (entry.status === 'open' ? 'alarm' : 'late') + '"/></svg>';
      status.append(i18n.t('incStatus.' + entry.status));

      const dur = document.createElement('span');
      dur.className = 'summary__line-num';
      dur.dataset.dur = entry.inc.id;
      dur.textContent = clock.mmss(entry.duration);

      row.append(badge, name, status, dur);
      row.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('takt:incident', { detail: entry.inc.id }));
      });
      depotOpen.appendChild(row);
    });
  }

  const depotLineNodes = new Map();

  function renderDepotLines() {
    if (!depotLines) return;
    if (!depotLineNodes.size) {
      TAKT.network.lines.forEach(line => {
        const row = document.createElement('div');
        row.className = 'summary__line';
        const badge = document.createElement('span');
        badge.className = 'badge-line';
        badge.style.setProperty('--line-color', line.color);
        badge.textContent = line.id;
        const name = document.createElement('span');
        name.className = 'summary__line-name';
        name.textContent = i18n.pick(line.title, line.titleLat);
        const punct = document.createElement('span');
        punct.className = 'summary__line-num';
        punct.style.color = 'var(--ink-2)';
        const headway = document.createElement('span');
        headway.className = 'summary__line-num';
        row.append(badge, name, punct, headway);
        depotLines.appendChild(row);
        depotLineNodes.set(line.id, { punct: punct, headway: headway });
      });
    }
    depotLineNodes.forEach((node, id) => {
      const lm = sim.lineMetrics(id);
      const punct = lm.punctuality + '%';
      const headway = clock.mmss(lm.actual);
      if (node.punct.textContent !== punct) node.punct.textContent = punct;
      if (node.headway.textContent !== headway) node.headway.textContent = headway;
    });
  }

  /* ——— водитель ——— */

  function buildDriverPicker() {
    if (!driverPick) return;
    sim.init();
    sim.vehicles.forEach(veh => {
      const option = document.createElement('option');
      option.value = String(veh.id);
      option.textContent = i18n.t('roles.carOption', { id: veh.id, line: veh.line, tab: veh.tab });
      driverPick.appendChild(option);
    });
    driverPick.value = String(driverId);
    driverPick.addEventListener('change', () => {
      driverId = Number(driverPick.value);
      stripBuilt = null;
    });
  }

  /* Интервал до впереди идущего: разница фаз в минутах.
     Это то самое число, ради которого водитель вообще смотрит на экран —
     оно говорит, придержать ход или нагонять. */
  function gapAhead(veh, ctx) {
    const crew = sim.vehicles.filter(v => v.line === veh.line);
    const phase = v => sim.phaseOf(ctx, v, clock.minutes - v.deviation);
    const mine = phase(veh);
    let best = Infinity;
    for (const other of crew) {
      if (other.id === veh.id) continue;
      let diff = phase(other) - mine;
      if (diff < 0) diff += ctx.cycle;
      if (diff < best) best = diff;
    }
    return best === Infinity ? null : best;
  }

  function renderDriver(t) {
    if (!driverPick) return;
    const veh = sim.vehicles.find(v => v.id === driverId);
    if (!veh) return;
    const ctx = sim.line(veh.line);
    const text = i18n.t('status.' + veh.status);
    const tone = TONE[veh.status];
    const alarm = veh.status === 'stopped' && veh.incident;

    const set = (id, value) => {
      const node = document.getElementById(id);
      if (node && node.textContent !== value) node.textContent = value;
    };

    const dev = document.getElementById('driverDev');
    const devText = veh.status === 'stopped' ? clock.mmss(veh.holdMin) : clock.deviation(veh.deviation);
    if (dev.textContent !== devText) dev.textContent = devText;
    dev.dataset.tone = veh.status;

    const state = document.getElementById('driverState');
    const label = alarm ? i18n.t('status.blocked') : text;
    if (state.dataset.label !== label) {
      state.dataset.label = label;
      state.dataset.tone = alarm ? 'alarm' : tone;
      state.innerHTML = '<svg width="14" height="14" aria-hidden="true"><use href="#st-' +
        (alarm ? 'alarm' : veh.status) + '"/></svg>';
      state.append(label);
    }

    set('driverSub', i18n.t('roles.driverSub', { line: veh.line, title: i18n.pick(ctx.line.title, ctx.line.titleLat), tab: veh.tab }));
    set('driverNext', i18n.pick(veh.nextStop, veh.nextStopLat));
    const gap = gapAhead(veh, ctx);
    set('driverGap', gap == null ? '—' : clock.mmss(gap));
    set('driverOcc', veh.occupancy + '%');
    set('driverSpeed', veh.speedKmh + ' ' + i18n.t('app.kmh'));

    // Указание диспетчера берётся из хронологии активного происшествия
    // на этой линии — то же самое, что диспетчер записал у себя.
    const order = document.getElementById('driverOrder');
    const orderText = document.getElementById('driverOrderText');
    let active = null;
    for (const inc of ctx.incidents) {
      const status = sim.incidentStatusAt(inc, t);
      if (status && status !== 'closed') active = inc;
    }
    if (active) {
      const tr = i18n.inc(active);
      const steps = tr.timeline.filter(step => step.t <= t);
      const last = steps.length ? steps[steps.length - 1].text : tr.title;
      order.hidden = false;
      if (orderText.textContent !== last) orderText.textContent = last;
    } else if (!order.hidden) {
      order.hidden = true;
    }

    renderDriverStrip(veh, ctx);
  }

  function renderDriverStrip(veh, ctx) {
    const x0 = 60, x1 = 940, y = 34;
    if (stripBuilt !== veh.line) {
      stripBuilt = veh.line;
      driverStrip.innerHTML = '';
      el('line', {
        class: 'strip-rail', x1: x0, y1: y, x2: x1, y2: y, stroke: ctx.line.color
      }, driverStrip);
      ctx.stops.forEach((stop, i) => {
        const x = x0 + (x1 - x0) * stop.progress;
        el('circle', { class: 'strip-stop', cx: x, cy: y, r: stop.hub ? 6 : 4.5 }, driverStrip);
        const label = el('text', {
          class: 'strip-label', x: x, y: i % 2 ? y + 20 : y + 34, 'text-anchor': 'middle'
        }, driverStrip);
        label.textContent = i18n.pick(stop.name, stop.nameLat);
      });
      el('g', { id: 'driverCars' }, driverStrip);
    }

    const layer = driverStrip.querySelector('#driverCars');
    const crew = sim.vehicles.filter(v => v.line === veh.line);
    while (layer.childNodes.length > crew.length) layer.removeChild(layer.lastChild);
    while (layer.childNodes.length < crew.length) {
      const dot = document.createElementNS(NS, 'circle');
      dot.setAttribute('r', 6);
      dot.setAttribute('stroke', 'var(--panel)');
      dot.setAttribute('stroke-width', '2');
      layer.appendChild(dot);
    }
    crew.forEach((other, i) => {
      const dot = layer.childNodes[i];
      const x = x0 + (x1 - x0) * other.progress;
      dot.setAttribute('cx', x);
      dot.setAttribute('cy', other.dir === 1 ? y - 13 : y - 1);
      const mine = other.id === veh.id;
      dot.setAttribute('r', mine ? 9 : 5.5);
      dot.setAttribute('fill', mine ? 'var(--ink)' : 'var(--ink-3)');
      dot.setAttribute('opacity', mine ? '1' : '.55');
    });
  }

  function render(t, screen) {
    if (screen === 'depot') renderDepot(t);
    else if (screen === 'driver') renderDriver(t);
  }

  return { build: build, render: render };
})();
