/* ТАКТ — экран «Отчёты».
   Рисуется один раз при первом открытии: это агрегаты за десять дней,
   они не меняются от того, что часы смены идут дальше. Единственная
   анимация — заполнение тепловой карты волной при появлении в кадре. */

window.TAKT = window.TAKT || {};

TAKT.reportsUI = (() => {
  const data = TAKT.reports;
  const i18n = TAKT.i18n;
  let root, built = false;

  function build(container) {
    root = container;
  }

  function card(title, note) {
    const box = document.createElement('section');
    box.className = 'report-card';
    const head = document.createElement('div');
    head.className = 'report-card__head';
    const h = document.createElement('h2');
    h.className = 'report-card__title';
    h.textContent = title;
    head.appendChild(h);
    if (note) {
      const n = document.createElement('span');
      n.className = 'report-card__note';
      n.textContent = note;
      head.appendChild(n);
    }
    box.appendChild(head);
    return box;
  }

  function lineColor(id) {
    const line = TAKT.network.lines.find(l => l.id === id);
    return line ? line.color : 'var(--accent)';
  }

  function delta(value) {
    const span = document.createElement('span');
    const sign = value > 0 ? '+' : '−';
    span.className = 'num';
    span.style.cssText = 'font-size:12px;color:var(--ink-3)';
    span.textContent = `${sign}${Math.abs(value)}`;
    return span;
  }

  function render() {
    if (built) return;
    built = true;
    root.innerHTML = '';

    /* Итоги периода */
    const totals = card(i18n.t('rep.totals'), i18n.t('rep.totalsNote'));
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:20px';
    data.totals.forEach(item => {
      const box = document.createElement('div');
      const key = document.createElement('div');
      key.style.cssText = 'font-size:11px;color:var(--ink-3)';
      key.textContent = i18n.t(item.key);
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:baseline;gap:6px';
      const value = document.createElement('span');
      value.className = 'num';
      value.style.cssText = 'font-size:22px;font-weight:500;letter-spacing:-.04em';
      value.textContent = item.value;
      const unit = document.createElement('span');
      unit.style.cssText = 'font-size:11px;color:var(--ink-3)';
      unit.textContent = i18n.t(item.unit);
      row.append(value, unit);
      const d = delta(item.delta);
      d.textContent += ' ' + i18n.t('rep.toAugust');
      box.append(key, row, d);
      grid.appendChild(box);
    });
    totals.appendChild(grid);
    root.appendChild(totals);

    /* Пунктуальность по линиям */
    const punct = card(i18n.t('rep.punct'), i18n.t('rep.punctNote'));
    punct.appendChild(bars(data.punctuality, data.punctualityTarget));
    root.appendChild(punct);

    /* Соблюдение интервала */
    const head = card(i18n.t('rep.headway'), i18n.t('rep.headwayNote'));
    head.appendChild(bars(data.headwayKeeping, null));
    root.appendChild(head);

    /* Тепловая карта */
    const heat = card(i18n.t('rep.heat'), i18n.t('rep.heatNote'));
    heat.appendChild(heatmap());
    root.appendChild(heat);

    /* Перекрёстки и причины — рядом */
    const pair = document.createElement('div');
    pair.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px';

    const junctions = card(i18n.t('rep.junctions'), i18n.t('rep.junctionsNote'));
    const list = document.createElement('div');
    list.className = 'top-list';
    data.junctions.forEach(item => {
      const row = document.createElement('div');
      row.className = 'top-row';
      const name = document.createElement('span');
      name.textContent = i18n.pick(item.place, item.placeLat);
      const badges = document.createElement('span');
      badges.style.cssText = 'display:flex;gap:3px';
      item.lines.forEach(id => {
        const badge = document.createElement('span');
        badge.className = 'badge-line';
        badge.style.setProperty('--line-color', lineColor(id));
        badge.textContent = id;
        badges.appendChild(badge);
      });
      const count = document.createElement('span');
      count.className = 'num';
      count.textContent = item.events + ' · ' + item.downtime;
      row.append(name, badges, count);
      list.appendChild(row);
    });
    junctions.appendChild(list);

    const causes = card(i18n.t('rep.causes'), i18n.t('rep.causesNote'));
    const max = Math.max(...data.causes.map(c => c.minutes));
    const causeBars = document.createElement('div');
    causeBars.className = 'bars';
    data.causes.forEach(item => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      row.style.gridTemplateColumns = '128px minmax(0,1fr) 52px';
      const name = document.createElement('span');
      name.style.cssText = 'font-size:12px;color:var(--ink-2)';
      name.textContent = i18n.t('incType.' + item.type);
      const track = document.createElement('div');
      track.className = 'bar-track';
      const fill = document.createElement('div');
      fill.className = 'bar-fill';
      fill.style.width = (item.minutes / max * 100).toFixed(1) + '%';
      fill.style.setProperty('--line-color', 'var(--ink-3)');
      track.appendChild(fill);
      const value = document.createElement('span');
      value.className = 'bar-value';
      value.textContent = item.minutes;
      row.append(name, track, value);
      causeBars.appendChild(row);
    });
    causes.appendChild(causeBars);

    pair.append(junctions, causes);
    root.appendChild(pair);

    const note = document.createElement('p');
    note.style.cssText = 'font-size:12px;color:var(--ink-3)';
    note.textContent = i18n.t('rep.note');
    root.appendChild(note);
  }

  function bars(rows, target) {
    const box = document.createElement('div');
    box.className = 'bars';
    rows.forEach(item => {
      const row = document.createElement('div');
      row.className = 'bar-row';

      const badge = document.createElement('span');
      badge.className = 'badge-line';
      badge.style.setProperty('--line-color', lineColor(item.line));
      badge.textContent = item.line;

      const track = document.createElement('div');
      track.className = 'bar-track';
      const fill = document.createElement('div');
      fill.className = 'bar-fill';
      fill.style.width = item.value + '%';
      fill.style.setProperty('--line-color', lineColor(item.line));
      track.appendChild(fill);
      if (target) {
        const mark = document.createElement('span');
        mark.className = 'bar-target';
        mark.style.left = target + '%';
        mark.title = i18n.t('rep.target', { value: target });
        track.appendChild(mark);
      }

      const value = document.createElement('span');
      value.className = 'bar-value';
      value.textContent = item.value + '%';

      const change = document.createElement('span');
      change.className = 'num';
      change.style.cssText = 'font-size:11px;color:var(--ink-3);min-width:34px;text-align:right';
      const diff = item.value - item.prev;
      change.textContent = (diff > 0 ? '+' : '−') + Math.abs(diff);

      row.style.gridTemplateColumns = '34px minmax(0,1fr) 48px 34px';
      row.append(badge, track, value, change);
      box.appendChild(row);
    });
    return box;
  }

  /* Тепловая карта в янтарной шкале — том же цвете, которым в интерфейсе
     обозначено опоздание. Красный сюда не годится: он занят авариями. */
  function heatmap() {
    const box = document.createElement('div');
    box.className = 'heat';

    const corner = document.createElement('span');
    corner.className = 'heat__corner';
    box.appendChild(corner);
    for (let h = 0; h < 24; h++) {
      const cell = document.createElement('span');
      cell.className = 'heat__hour';
      cell.textContent = h % 3 === 0 ? String(h).padStart(2, '0') : '';
      box.appendChild(cell);
    }

    const cells = [];
    data.heat.forEach((row, dayIndex) => {
      const day = document.createElement('span');
      day.className = 'heat__day';
      day.textContent = i18n.t('rep.days')[dayIndex];
      box.appendChild(day);
      row.forEach((value, hour) => {
        const cell = document.createElement('span');
        cell.className = 'heat__cell';
        cell.style.background = `color-mix(in srgb, var(--st-late) ${Math.round(value / 85 * 100)}%, var(--panel-sunken))`;
        const dayName = i18n.t('rep.days')[dayIndex];
        cell.title = i18n.t('rep.heatCell', { day: dayName, hour: hour, value: value });
        cell.setAttribute('role', 'img');
        cell.setAttribute('aria-label', i18n.t('rep.heatCell', { day: dayName, hour: hour, value: value }));
        cell.dataset.wave = String(dayIndex + hour);
        cells.push(cell);
        box.appendChild(cell);
      });
    });

    // Волна по диагонали, 40 мс на шаг — один раз, при появлении в кадре.
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      cells.forEach(cell => { cell.style.opacity = '1'; });
      return box;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        cells.forEach(cell => {
          cell.style.animationDelay = Number(cell.dataset.wave) * 12 + 'ms';
          cell.classList.add('is-in');
        });
      });
    }, { threshold: 0.15 });
    requestAnimationFrame(() => observer.observe(box));
    return box;
  }

  function rebuild() {
    if (!built) return;
    built = false;
    render();
  }

  return { build: build, render: render, rebuild: rebuild };
})();
