/* ТАКТ — геометрия схемы.
   Задача файла: из списка вершин собрать SVG-путь со скруглёнными углами,
   один раз просэмплировать его в таблицу точек и дальше отдавать позицию
   и угол по прогрессу без обращения к getPointAtLength в каждом кадре.

   Почему таблица: getPointAtLength стоит недорого, но 47 вагонов × 2 вызова
   × 60 раз в секунду — это уже 5640 обращений к геометрии в секунду.
   Линейная интерполяция по предсчитанному массиву дешевле на порядок. */

window.TAKT = window.TAKT || {};

TAKT.geometry = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const SAMPLE_STEP = 3.5; // px между сэмплами — на 6px линии глаз разницы не видит

  /* Ломаная со скруглёнными углами.
     В каждой вершине отступаем вдоль обоих рёбер и ведём квадратичную кривую
     через саму вершину — угол получается ровный, длина пути почти не врёт. */
  function roundedPath(nodes, radius) {
    if (nodes.length < 2) return '';
    let d = `M ${nodes[0].x} ${nodes[0].y}`;

    for (let i = 1; i < nodes.length - 1; i++) {
      const prev = nodes[i - 1], cur = nodes[i], next = nodes[i + 1];
      const inLen = Math.hypot(cur.x - prev.x, cur.y - prev.y);
      const outLen = Math.hypot(next.x - cur.x, next.y - cur.y);
      const r = Math.min(radius, inLen / 2, outLen / 2);

      // Вершина без излома — скруглять нечего
      const cross = Math.abs((cur.x - prev.x) * (next.y - cur.y) - (cur.y - prev.y) * (next.x - cur.x));
      if (cross < 0.001 || r < 0.5) { d += ` L ${cur.x} ${cur.y}`; continue; }

      const p1 = { x: cur.x - (cur.x - prev.x) / inLen * r, y: cur.y - (cur.y - prev.y) / inLen * r };
      const p2 = { x: cur.x + (next.x - cur.x) / outLen * r, y: cur.y + (next.y - cur.y) / outLen * r };
      d += ` L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} Q ${cur.x} ${cur.y} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }

    const last = nodes[nodes.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
  }

  /* Одноразовый скрытый <path> для измерений: держим один на всё приложение. */
  let ruler = null;
  function getRuler() {
    if (ruler) return ruler;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', 0); svg.setAttribute('height', 0);
    svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;left:-9999px;top:0;overflow:hidden';
    ruler = document.createElementNS(SVG_NS, 'path');
    svg.appendChild(ruler);
    document.body.appendChild(svg);
    return ruler;
  }

  /* Таблица сэмплов: координаты + угол касательной в каждой точке. */
  function sample(d) {
    const path = getRuler();
    path.setAttribute('d', d);
    const total = path.getTotalLength();
    const count = Math.max(2, Math.ceil(total / SAMPLE_STEP) + 1);
    const xs = new Float32Array(count);
    const ys = new Float32Array(count);
    const angles = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const len = Math.min(total, (i * total) / (count - 1));
      const p = path.getPointAtLength(len);
      xs[i] = p.x; ys[i] = p.y;
    }
    for (let i = 0; i < count; i++) {
      const a = Math.max(0, i - 1), b = Math.min(count - 1, i + 1);
      angles[i] = Math.atan2(ys[b] - ys[a], xs[b] - xs[a]) * 180 / Math.PI;
    }
    return { d, total, count, xs, ys, angles };
  }

  /* Позиция по прогрессу 0..1. Интерполяция между соседними сэмплами:
     точка садится ровно на рельс даже на скруглении. */
  function at(track, t, out) {
    const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
    const pos = clamped * (track.count - 1);
    const i = Math.min(track.count - 2, Math.floor(pos));
    const f = pos - i;
    const res = out || {};
    res.x = track.xs[i] + (track.xs[i + 1] - track.xs[i]) * f;
    res.y = track.ys[i] + (track.ys[i + 1] - track.ys[i]) * f;

    // Углы интерполируем по кратчайшей дуге, иначе на переходе 180° → −180°
    // вагон делает полный оборот вокруг себя
    let a0 = track.angles[i], a1 = track.angles[i + 1];
    let da = a1 - a0;
    if (da > 180) da -= 360; else if (da < -180) da += 360;
    res.angle = a0 + da * f;
    return res;
  }

  /* Прогресс каждой вершины-остановки вдоль пути.
     Скругление съедает пару пикселей, поэтому ищем ближайший сэмпл,
     а не считаем длину ломаной. */
  function projectNodes(track, nodes) {
    return nodes.map(node => {
      let best = 0, bestDist = Infinity;
      for (let i = 0; i < track.count; i++) {
        const dx = track.xs[i] - node.x, dy = track.ys[i] - node.y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) { bestDist = dist; best = i; }
      }
      return best / (track.count - 1);
    });
  }

  /* Точка на пути → её прогресс. Нужна для привязки происшествий к перегону. */
  function progressAtPoint(track, x, y) {
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < track.count; i++) {
      const dx = track.xs[i] - x, dy = track.ys[i] - y;
      const dist = dx * dx + dy * dy;
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    return best / (track.count - 1);
  }

  return { roundedPath, sample, at, projectNodes, progressAtPoint, SVG_NS };
})();
