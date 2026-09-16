/* ТАКТ — происшествия: лента в правой панели, таблица и разбор.

   Лента пересобирается только когда действительно изменился состав или
   статус событий. Всё остальное время в ней обновляется один текстовый узел —
   счётчик минут. Это ровно то требование, из-за которого рабочие интерфейсы
   обычно раздражают: строка под курсором не должна уезжать, пока к ней
   ведёшь мышь. */

window.TAKT = window.TAKT || {};

TAKT.incidentsUI = (() => {
  const sim = TAKT.simulator, clock = TAKT.clock, i18n = TAKT.i18n;

  let feed, feedCount, incBody, incDetail, incSub, live, alarmLive;
  let filter = 'all';
  let selected = null;
  let feedKey = '';
  let tableKey = '';
  const feedNodes = new Map();
  const announced = new Set();
  let onFocusIncident = () => {};

  function build(root, handlers) {
    feed = root.querySelector('#feed');
    feedCount = root.querySelector('#feedCount');
    incBody = root.querySelector('#incBody');
    incDetail = root.querySelector('#incDetail');
    incSub = root.querySelector('#incSub');
    live = root.querySelector('#incLive');
    alarmLive = root.querySelector('#alarmLive');
    onFocusIncident = handlers.onFocusIncident || onFocusIncident;

    root.querySelectorAll('[data-inc-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        filter = btn.dataset.incFilter;
        root.querySelectorAll('[data-inc-filter]').forEach(other => {
          other.setAttribute('aria-pressed', String(other === btn));
        });
        tableKey = '';
      });
    });

    document.addEventListener('takt:incident', e => {
      select(e.detail);
      onFocusIncident(e.detail);
    });
  }

  /* Подсказка в пустой панели разбора. */
  function hint(text) {
    const box = document.createElement('div');
    box.className = 'inc-detail';
    const p = document.createElement('p');
    p.style.cssText = 'color:var(--ink-3);font-size:13px';
    p.textContent = text;
    box.appendChild(p);
    return box;
  }

  function tone(status) {
    return status === 'open' ? 'alarm' : status === 'working' ? 'late' : 'idle';
  }

  /* ——— лента ——— */

  function renderFeed(t) {
    const list = sim.incidentsAt(t);
    const key = list.map(x => x.inc.id + x.status).join('|');

    if (key !== feedKey) {
      const isFirstFill = feedKey === '';
      feedKey = key;
      rebuildFeed(list, isFirstFill);
      const open = list.filter(x => !x.closed).length;
      feedCount.textContent = open + ' / ' + list.length;
      if (incSub) incSub.textContent = i18n.t('app.incSummary', { total: list.length, open: open });
    }

    // Живёт только счётчик минут у незакрытых событий.
    list.forEach(entry => {
      if (entry.closed) return;
      const node = feedNodes.get(entry.inc.id);
      if (!node) return;
      const text = clock.mmss(entry.duration);
      if (node.duration.textContent !== text) node.duration.textContent = text;
    });
  }

  function rebuildFeed(list, isFirstFill) {
    const existing = new Set(list.map(x => x.inc.id));
    feedNodes.forEach((node, id) => {
      if (!existing.has(id)) { node.root.remove(); feedNodes.delete(id); }
    });

    list.forEach((entry, index) => {
      let node = feedNodes.get(entry.inc.id);
      if (!node) {
        node = createFeedItem(entry);
        feedNodes.set(entry.inc.id, node);
        if (!isFirstFill && !clock.reducedMotion) {
          node.root.classList.add('is-entering');
          setTimeout(() => node.root.classList.remove('is-entering'), 340);
        }
        announce(entry);
      }
      node.root.dataset.tone = tone(entry.status);
      node.root.dataset.closed = String(entry.closed);
      node.statusText.nodeValue = i18n.t('incStatus.' + entry.status);
      node.statusEl.dataset.tone = tone(entry.status);
      node.statusIcon.setAttribute('href', entry.status === 'open' ? '#st-alarm'
        : entry.status === 'working' ? '#st-late' : '#st-stopped');
      if (feed.children[index] !== node.root) feed.insertBefore(node.root, feed.children[index] || null);
    });
  }

  function createFeedItem(entry) {
    const inc = entry.inc;
    const root = document.createElement('button');
    root.type = 'button';
    root.className = 'feed-item';
    root.setAttribute('aria-pressed', 'false');

    const top = document.createElement('div');
    top.className = 'feed-item__top';

    const time = document.createElement('span');
    time.className = 'feed-item__time';
    time.textContent = clock.hhmm(inc.start);

    const badge = document.createElement('span');
    badge.className = 'badge-line';
    const line = TAKT.network.lines.find(l => l.id === inc.line);
    badge.style.setProperty('--line-color', line ? line.color : 'var(--ink-2)');
    badge.textContent = inc.line;

    const status = document.createElement('span');
    status.className = 'status';
    status.style.marginLeft = 'auto';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '12'); svg.setAttribute('height', '12'); svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    svg.appendChild(use);
    const statusText = document.createTextNode('');
    status.append(svg, statusText);

    top.append(time, badge, status);

    const title = document.createElement('span');
    title.className = 'feed-item__title';
    const tr = i18n.inc(inc);
    title.textContent = tr.title;

    const meta = document.createElement('span');
    meta.className = 'feed-item__meta';
    const place = document.createElement('span');
    place.textContent = tr.place;
    const duration = document.createElement('span');
    duration.className = 'num';
    duration.style.marginLeft = 'auto';
    duration.textContent = entry.closed ? clock.mmss(entry.duration) : clock.mmss(entry.duration);
    meta.append(place, duration);

    root.append(top, title, meta);
    root.addEventListener('click', () => { select(inc.id); onFocusIncident(inc.id); });

    return {
      root: root,
      statusEl: status,
      statusText: statusText,
      statusIcon: use,
      duration: duration
    };
  }

  /* Появление события объявляется скринридеру: авария — настойчиво,
     остальное — вежливо, в порядке очереди. */
  function announce(entry) {
    if (announced.has(entry.inc.id)) return;
    announced.add(entry.inc.id);
    if (!live || !alarmLive) return;
    const tr = i18n.inc(entry.inc);
    const text = clock.hhmm(entry.inc.start) + ', ' + i18n.t('app.lineHint', { line: entry.inc.line }) +
      '. ' + tr.title + '. ' + tr.place + '.';
    if (entry.status === 'open') alarmLive.textContent = text;
    else live.textContent = text;
  }

  /* ——— таблица ——— */

  function renderTable(t) {
    const all = sim.incidentsAt(t);
    const list = all.filter(entry =>
      filter === 'all' ? true : filter === 'open' ? !entry.closed : entry.closed);
    const key = filter + '|' + list.map(x => x.inc.id + x.status).join('|');
    if (key === tableKey) {
      list.forEach(entry => {
        if (entry.closed) return;
        const cell = incBody.querySelector(`[data-dur='${entry.inc.id}']`);
        if (cell) cell.textContent = clock.mmss(entry.duration);
      });
      return;
    }
    tableKey = key;
    incBody.innerHTML = '';

    list.forEach(entry => {
      const inc = entry.inc;
      const tr = document.createElement('tr');
      tr.tabIndex = 0;
      tr.setAttribute('aria-selected', String(selected === inc.id));

      const time = document.createElement('td');
      time.className = 'num'; time.textContent = clock.hhmm(inc.start);

      const lineCell = document.createElement('td');
      const badge = document.createElement('span');
      badge.className = 'badge-line';
      const line = TAKT.network.lines.find(l => l.id === inc.line);
      badge.style.setProperty('--line-color', line ? line.color : 'var(--ink-2)');
      badge.textContent = inc.line;
      lineCell.appendChild(badge);

      const text = i18n.inc(inc);
      const title = document.createElement('td');
      title.textContent = text.title;
      const small = document.createElement('div');
      small.style.cssText = 'font-size:11px;color:var(--ink-3)';
      small.textContent = text.place;
      title.appendChild(small);

      const type = document.createElement('td');
      type.textContent = i18n.t('incType.' + inc.type);
      type.style.whiteSpace = 'nowrap';
      type.style.color = 'var(--ink-2)';

      const statusCell = document.createElement('td');
      const status = document.createElement('span');
      status.className = 'status';
      status.dataset.tone = tone(entry.status);
      status.innerHTML = `<svg width="12" height="12" aria-hidden="true"><use href="#st-${
        entry.status === 'open' ? 'alarm' : entry.status === 'working' ? 'late' : 'stopped'}"/></svg>`;
      status.append(i18n.t('incStatus.' + entry.status));
      const dur = document.createElement('span');
      dur.className = 'num';
      dur.style.cssText = 'margin-left:6px;color:var(--ink-3);font-size:12px';
      dur.dataset.dur = inc.id;
      dur.textContent = clock.mmss(entry.duration);
      status.appendChild(dur);
      statusCell.appendChild(status);

      tr.append(time, lineCell, title, type, statusCell);
      tr.addEventListener('click', () => select(inc.id));
      tr.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(inc.id); }
      });
      incBody.appendChild(tr);
    });

    if (!list.length) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.style.cssText = 'padding:32px;text-align:center;color:var(--ink-3)';
      td.textContent = i18n.t(filter === 'open' ? 'app.emptyOpen' : 'app.emptyAll');
      tr.appendChild(td);
      incBody.appendChild(tr);
    }
  }

  /* ——— разбор ——— */

  function select(id) {
    selected = id;
    tableKey = '';
    feedNodes.forEach((node, key) => node.root.setAttribute('aria-pressed', String(key === id)));
    renderDetail();
  }

  function renderDetail() {
    if (!incDetail) return;
    if (!selected) {
      incDetail.innerHTML = '';
      incDetail.appendChild(hint(i18n.t('app.pickIncident')));
      return;
    }
    const inc = TAKT.incidents.find(x => x.id === selected);
    const t = clock.minutes;
    const status = sim.incidentStatusAt(inc, t);
    if (!status) {
      incDetail.innerHTML = '';
      incDetail.appendChild(hint(i18n.t('app.notYet')));
      return;
    }

    const tr = i18n.inc(inc);
    const affected = sim.affectedBy(inc);
    const shown = tr.timeline.filter(step => step.t <= t);
    const line = TAKT.network.lines.find(l => l.id === inc.line);
    const duration = inc.closedAt != null && t >= inc.closedAt ? inc.closedAt - inc.start : t - inc.start;

    const wrap = document.createElement('div');
    wrap.className = 'inc-detail';

    const head = document.createElement('div');
    head.className = 'inc-detail__head';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px';
    const badge = document.createElement('span');
    badge.className = 'badge-line';
    badge.style.setProperty('--line-color', line ? line.color : 'var(--ink-2)');
    badge.textContent = inc.line;
    const idChip = document.createElement('span');
    idChip.className = 'chip mono';
    idChip.textContent = inc.id;
    const st = document.createElement('span');
    st.className = 'status';
    st.dataset.tone = tone(status);
    st.innerHTML = `<svg width="12" height="12" aria-hidden="true"><use href="#st-${
      status === 'open' ? 'alarm' : status === 'working' ? 'late' : 'stopped'}"/></svg>`;
    st.append(i18n.t('incStatus.' + status));
    row.append(badge, idChip, st);

    const title = document.createElement('h2');
    title.className = 'inc-detail__title';
    title.textContent = tr.title;

    const place = document.createElement('p');
    place.style.cssText = 'font-size:13px;color:var(--ink-2)';
    place.textContent = tr.place + ' · ' + i18n.t('incType.' + inc.type);
    head.append(row, title, place);

    const facts = document.createElement('div');
    facts.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px';
    [
      [i18n.t('app.start'), clock.hhmm(inc.start)],
      [i18n.t(status === 'closed' ? 'app.duration' : 'app.ongoing'), clock.mmss(duration)],
      [i18n.t('app.affectedCount'), String(affected.length)],
      [i18n.t('app.downtime'), clock.mmss(affected.reduce((sum, a) => sum + a.hold, 0))]
    ].forEach(([key, value]) => {
      const box = document.createElement('div');
      box.innerHTML = `<div style="font-size:11px;color:var(--ink-3)">${key}</div>`;
      const v = document.createElement('div');
      v.className = 'num';
      v.style.cssText = 'font-size:16px;font-weight:500';
      v.textContent = value;
      box.appendChild(v);
      facts.appendChild(box);
    });

    const timelineTitle = document.createElement('h3');
    timelineTitle.style.cssText = 'font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)';
    timelineTitle.textContent = i18n.t('app.timeline');

    const timeline = document.createElement('ol');
    timeline.className = 'timeline';
    shown.forEach(step => {
      const li = document.createElement('li');
      const time = document.createElement('time');
      time.textContent = clock.hhmm(step.t);
      const text = document.createElement('span');
      text.textContent = step.text;
      li.append(time, text);
      timeline.appendChild(li);
    });
    if (!shown.length) {
      const li = document.createElement('li');
      li.textContent = i18n.t('app.justLogged');
      timeline.appendChild(li);
    }

    wrap.append(head, facts, timelineTitle, timeline);

    if (affected.length) {
      const carsTitle = document.createElement('h3');
      carsTitle.style.cssText = 'font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3)';
      carsTitle.textContent = i18n.t('app.affected');
      const list = document.createElement('div');
      list.className = 'top-list';
      affected.forEach(item => {
        const rowEl = document.createElement('div');
        rowEl.className = 'top-row';
        const name = document.createElement('span');
        name.innerHTML = '<span class="num">' + item.veh.id + '</span> · ' +
          i18n.t('app.vTab') + ' ' + item.veh.tab + ' · ' + i18n.pick(item.veh.driver, item.veh.driverLat);
        const from = document.createElement('span');
        from.className = 'num'; from.style.color = 'var(--ink-3)';
        from.textContent = clock.hhmm(item.from);
        const hold = document.createElement('span');
        hold.className = 'num';
        hold.textContent = clock.mmss(item.hold);
        rowEl.append(name, from, hold);
        list.appendChild(rowEl);
      });
      wrap.append(carsTitle, list);
    }

    const resp = document.createElement('p');
    resp.style.cssText = 'font-size:12px;color:var(--ink-3)';
    resp.textContent = i18n.t('app.responsible') + ' ' + tr.responsible;
    wrap.appendChild(resp);

    incDetail.innerHTML = '';
    incDetail.appendChild(wrap);
  }

  /* При смене языка кэши текстов сбрасываются, иначе лента и таблица
     останутся на прежнем языке до следующего события. */
  function resetCache() {
    feedKey = '';
    tableKey = '';
    feedNodes.forEach(node => node.root.remove());
    feedNodes.clear();
  }

  return {
    build: build,
    resetCache: resetCache,
    renderFeed: renderFeed,
    renderTable: renderTable,
    renderDetail: renderDetail,
    select: select,
    get selected() { return selected; }
  };
})();
